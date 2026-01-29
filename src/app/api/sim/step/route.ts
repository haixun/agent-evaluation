import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun, getActivePrompt, getProfile } from '@/lib/storage'
import { callAgentA, callAgentB, callAgentC } from '@/lib/agents'
import {
  defaultAgentAPrompt,
  defaultAgentBPrompt,
  defaultAgentCPrompt,
  defaultProfile,
} from '@/lib/defaultPrompts'
import type { TranscriptEntry } from '@/types'
import { MAX_TURNS } from '@/types'

// POST /api/sim/step - Execute one step of simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { runId } = body

    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'Run ID is required' },
        { status: 400 }
      )
    }

    // Get the run
    const run = await getRun(runId)
    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Run not found' },
        { status: 404 }
      )
    }

    if (run.status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: 'Run is not in progress' },
        { status: 400 }
      )
    }

    if (run.mode !== 'simulation') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is only for simulation mode' },
        { status: 400 }
      )
    }

    // Check turn limit (use run's maxTurns or default)
    const maxTurnLimit = run.maxTurns || MAX_TURNS
    if (run.turnCount >= maxTurnLimit) {
      run.status = 'completed'
      run.endedAt = new Date().toISOString()

      // Run evaluation
      const agentCPrompt = await getActivePrompt('agentC')
      const evalPromptContent = agentCPrompt?.content || defaultAgentCPrompt
      const evaluation = await callAgentC(
        evalPromptContent,
        run.initialQuestion,
        run.transcript
      )
      run.evaluation = evaluation

      await saveRun(run)

      return NextResponse.json({
        success: true,
        data: {
          done: true,
          reason: 'max_turns',
          evaluation,
        },
      })
    }

    // Get Agent A prompt
    const agentAPrompt = await getActivePrompt('agentA')
    const agentAPromptContent = agentAPrompt?.content || defaultAgentAPrompt

    // Step 1: Call Agent A
    const agentAResponse = await callAgentA(
      agentAPromptContent,
      run.initialQuestion,
      run.transcript,
      run.taskTopic
    )

    // Add Agent A message to transcript
    const agentAEntry: TranscriptEntry = {
      role: 'agentA',
      content: agentAResponse.message,
      timestamp: new Date().toISOString(),
      endFlag: agentAResponse.done ? 1 : 0,
    }
    run.transcript.push(agentAEntry)
    run.turnCount++

    // If Agent A is done, run evaluation
    if (agentAResponse.done) {
      run.status = 'completed'
      run.endedAt = new Date().toISOString()

      // Run evaluation
      const agentCPrompt = await getActivePrompt('agentC')
      const evalPromptContent = agentCPrompt?.content || defaultAgentCPrompt
      const evaluation = await callAgentC(
        evalPromptContent,
        run.initialQuestion,
        run.transcript
      )
      run.evaluation = evaluation

      await saveRun(run)

      return NextResponse.json({
        success: true,
        data: {
          agentAMessage: agentAResponse.message,
          done: true,
          evaluation,
        },
      })
    }

    // Step 2: Call Agent B to respond
    const agentBPrompt = await getActivePrompt('agentB')
    const agentBPromptContent = agentBPrompt?.content || defaultAgentBPrompt

    // Get profile content
    let profileContent = defaultProfile
    if (run.agentBProfileId && run.agentBProfileId !== 'default') {
      const profile = await getProfile(run.agentBProfileId)
      if (profile) {
        profileContent = profile.content
      }
    }

    const agentBResponse = await callAgentB(
      agentBPromptContent,
      profileContent,
      run.transcript,
      agentAResponse.message
    )

    // Add Agent B message to transcript
    const agentBEntry: TranscriptEntry = {
      role: 'agentB',
      content: agentBResponse,
      timestamp: new Date().toISOString(),
    }
    run.transcript.push(agentBEntry)
    run.turnCount++

    await saveRun(run)

    return NextResponse.json({
      success: true,
      data: {
        agentAMessage: agentAResponse.message,
        agentBMessage: agentBResponse,
        done: false,
      },
    })
  } catch (error) {
    console.error('Error in simulation step:', error)
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { success: false, error: `Failed to execute simulation step: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
