import { NextRequest, NextResponse } from 'next/server'
import { getRun, saveRun } from '@/lib/storage'

// POST /api/runs/discard - Discard a run without evaluation
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

    // Mark as completed without evaluation
    run.status = 'completed'
    run.endedAt = new Date().toISOString()
    // No evaluation - this is a discarded run

    await saveRun(run)

    return NextResponse.json({
      success: true,
      data: { run },
    })
  } catch (error) {
    console.error('Error discarding run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to discard run' },
      { status: 500 }
    )
  }
}
