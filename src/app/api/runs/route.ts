import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { saveRun, listRuns, getRun, deleteRun } from '@/lib/storage'
import { getActivePrompt } from '@/lib/storage'
import { defaultAgentAPrompt, defaultAgentBPrompt, defaultAgentCPrompt } from '@/lib/defaultPrompts'
import type { Run, CreateRunRequest } from '@/types'
import { MAX_TURNS } from '@/types'

// GET /api/runs or GET /api/runs?id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const run = await getRun(id)
      if (!run) {
        return NextResponse.json(
          { success: false, error: 'Run not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: run })
    }

    const runs = await listRuns()
    return NextResponse.json({ success: true, data: runs })
  } catch (error) {
    console.error('Error fetching runs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch runs' },
      { status: 500 }
    )
  }
}

// POST /api/runs - Create a new run
export async function POST(request: NextRequest) {
  try {
    const body: CreateRunRequest = await request.json()
    const { mode, initialQuestion, profileId, maxTurns } = body

    if (!mode || !['human', 'simulation'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mode' },
        { status: 400 }
      )
    }

    if (!initialQuestion || typeof initialQuestion !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Initial question is required' },
        { status: 400 }
      )
    }

    if (mode === 'simulation' && !profileId) {
      return NextResponse.json(
        { success: false, error: 'Profile ID is required for simulation mode' },
        { status: 400 }
      )
    }

    // Get active prompts or use defaults
    const agentAPrompt = await getActivePrompt('agentA')
    const agentBPrompt = mode === 'simulation' ? await getActivePrompt('agentB') : null
    const agentCPrompt = await getActivePrompt('agentC')

    const run: Run = {
      runId: nanoid(),
      mode,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      initialQuestion,
      agentAPromptVersionId: agentAPrompt?.id || 'default',
      agentBPromptVersionId: mode === 'simulation' ? (agentBPrompt?.id || 'default') : undefined,
      agentCPromptVersionId: agentCPrompt?.id || 'default',
      agentBProfileId: profileId,
      transcript: [],
      turnCount: 0,
      maxTurns: mode === 'simulation' ? (maxTurns || MAX_TURNS) : undefined,
    }

    await saveRun(run)

    return NextResponse.json({
      success: true,
      data: run,
    })
  } catch (error) {
    console.error('Error creating run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create run' },
      { status: 500 }
    )
  }
}

// DELETE /api/runs?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Run ID is required' },
        { status: 400 }
      )
    }

    await deleteRun(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete run' },
      { status: 500 }
    )
  }
}
