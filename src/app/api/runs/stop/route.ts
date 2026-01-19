import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun, getActivePrompt } from '@/lib/storage'
import { callAgentC } from '@/lib/agents'
import { defaultAgentCPrompt } from '@/lib/defaultPrompts'

// POST /api/runs/stop - Stop a run early and trigger evaluation
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

    // Check if there's at least some conversation to evaluate
    if (run.transcript.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Not enough conversation to evaluate. Please have at least one exchange.' },
        { status: 400 }
      )
    }

    // Mark as completed
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
        run,
        evaluation,
      },
    })
  } catch (error) {
    console.error('Error stopping run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to stop run' },
      { status: 500 }
    )
  }
}
