import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { saveRun, getActivePrompt } from '@/lib/storage'
import { callAgentC } from '@/lib/agents'
import { defaultAgentCPrompt } from '@/lib/defaultPrompts'
import type { Run, TranscriptEntry, UploadTranscriptRequest } from '@/types'

// POST /api/runs/upload - Upload a transcript and evaluate it
export async function POST(request: NextRequest) {
  try {
    const body: UploadTranscriptRequest = await request.json()
    const { initialQuestion, taskTopic, transcript } = body

    // Validate required fields
    if (!initialQuestion || typeof initialQuestion !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Initial question is required' },
        { status: 400 }
      )
    }

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Transcript is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate transcript entries
    for (let i = 0; i < transcript.length; i++) {
      const entry = transcript[i]
      if (!entry.role || !['agentA', 'agentB', 'user'].includes(entry.role)) {
        return NextResponse.json(
          { success: false, error: `Invalid role in transcript entry ${i + 1}. Must be 'agentA', 'agentB', or 'user'` },
          { status: 400 }
        )
      }
      if (!entry.content || typeof entry.content !== 'string') {
        return NextResponse.json(
          { success: false, error: `Missing or invalid content in transcript entry ${i + 1}` },
          { status: 400 }
        )
      }
    }

    // Normalize transcript entries (add timestamps if missing)
    const normalizedTranscript: TranscriptEntry[] = transcript.map((entry, index) => ({
      role: entry.role,
      content: entry.content,
      timestamp: entry.timestamp || new Date(Date.now() + index * 1000).toISOString(),
      endFlag: entry.endFlag,
    }))

    // Get Agent C prompt
    const agentCPrompt = await getActivePrompt('agentC')
    const evalPromptContent = agentCPrompt?.content || defaultAgentCPrompt

    // Run evaluation
    const evaluation = await callAgentC(
      evalPromptContent,
      initialQuestion,
      normalizedTranscript
    )

    // Create run record
    const runId = nanoid()
    const now = new Date().toISOString()

    const run: Run = {
      runId,
      mode: 'transcript',
      status: 'completed',
      createdAt: now,
      endedAt: now,
      initialQuestion,
      taskTopic: taskTopic?.trim() || undefined,
      agentAPromptVersionId: 'uploaded', // No agent A prompt used
      agentAPromptName: 'Uploaded Transcript',
      agentCPromptVersionId: agentCPrompt?.id || 'default',
      agentCPromptName: agentCPrompt?.name,
      agentCPromptAuthor: agentCPrompt?.author,
      transcript: normalizedTranscript,
      evaluation,
      turnCount: normalizedTranscript.length,
    }

    await saveRun(run)

    return NextResponse.json({
      success: true,
      data: {
        runId,
        evaluation,
      },
    })
  } catch (error) {
    console.error('Error uploading transcript:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload and evaluate transcript' },
      { status: 500 }
    )
  }
}
