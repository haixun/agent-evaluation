import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun, getActivePrompt } from '@/lib/storage'
import { callAgentA, callAgentC } from '@/lib/agents'
import { defaultAgentAPrompt, defaultAgentCPrompt } from '@/lib/defaultPrompts'
import type { TranscriptEntry, ChatRequest, MAX_TURNS } from '@/types'

const MAX_TURN_LIMIT = 30

// POST /api/chat
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { runId, userMessage } = body

    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'Run ID is required' },
        { status: 400 }
      )
    }

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User message is required' },
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

    if (run.mode !== 'human') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is only for human mode' },
        { status: 400 }
      )
    }

    // Check turn limit
    if (run.turnCount >= MAX_TURN_LIMIT) {
      return NextResponse.json(
        { success: false, error: 'Maximum turn limit reached' },
        { status: 400 }
      )
    }

    // Add user message to transcript
    const userEntry: TranscriptEntry = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }
    run.transcript.push(userEntry)
    run.turnCount++

    // Get Agent A prompt
    const agentAPrompt = await getActivePrompt('agentA')
    const promptContent = agentAPrompt?.content || defaultAgentAPrompt

    // Call Agent A
    const agentAResponse = await callAgentA(
      promptContent,
      run.initialQuestion,
      run.transcript
    )

    // Add Agent A message to transcript
    const agentAEntry: TranscriptEntry = {
      role: 'agentA',
      content: agentAResponse.message,
      timestamp: new Date().toISOString(),
    }
    run.transcript.push(agentAEntry)

    let evaluation = undefined

    // If done, run evaluation
    if (agentAResponse.done) {
      run.status = 'completed'
      run.endedAt = new Date().toISOString()

      // Get Agent C prompt
      const agentCPrompt = await getActivePrompt('agentC')
      const evalPromptContent = agentCPrompt?.content || defaultAgentCPrompt

      // Call Agent C
      evaluation = await callAgentC(
        evalPromptContent,
        run.initialQuestion,
        run.transcript
      )
      run.evaluation = evaluation
    }

    // Save updated run
    await saveRun(run)

    return NextResponse.json({
      success: true,
      data: {
        agentMessage: agentAResponse.message,
        done: agentAResponse.done,
        evaluation,
      },
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// GET /api/chat/start?runId=xxx - Start conversation (get first message from Agent A)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')

    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'Run ID is required' },
        { status: 400 }
      )
    }

    const run = await getRun(runId)
    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Run not found' },
        { status: 404 }
      )
    }

    if (run.transcript.length > 0) {
      // Already started, return current state
      return NextResponse.json({
        success: true,
        data: {
          run,
          started: true,
        },
      })
    }

    // Get Agent A prompt
    const agentAPrompt = await getActivePrompt('agentA')
    const promptContent = agentAPrompt?.content || defaultAgentAPrompt

    // Call Agent A to get the initial message
    const agentAResponse = await callAgentA(
      promptContent,
      run.initialQuestion,
      []
    )

    // Add Agent A message to transcript
    const agentAEntry: TranscriptEntry = {
      role: 'agentA',
      content: agentAResponse.message,
      timestamp: new Date().toISOString(),
    }
    run.transcript.push(agentAEntry)
    run.turnCount++

    await saveRun(run)

    return NextResponse.json({
      success: true,
      data: {
        run,
        started: true,
        agentMessage: agentAResponse.message,
      },
    })
  } catch (error) {
    console.error('Error starting chat:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start chat' },
      { status: 500 }
    )
  }
}
