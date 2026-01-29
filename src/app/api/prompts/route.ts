import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { savePrompt, listPrompts, getActivePrompt, setActivePrompt, deletePrompt } from '@/lib/storage'
import { defaultAgentAPrompt, defaultAgentBPrompt, defaultAgentCPrompt } from '@/lib/defaultPrompts'
import type { Prompt } from '@/types'

// GET /api/prompts?agentType=agentA
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentType = searchParams.get('agentType')

    if (!agentType || !['agentA', 'agentB', 'agentC'].includes(agentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid agentType parameter' },
        { status: 400 }
      )
    }

    const prompts = await listPrompts(agentType)

    // If no prompts exist, return the default
    if (prompts.length === 0) {
      const defaultContent =
        agentType === 'agentA'
          ? defaultAgentAPrompt
          : agentType === 'agentB'
          ? defaultAgentBPrompt
          : defaultAgentCPrompt

      return NextResponse.json({
        success: true,
        data: {
          prompts: [],
          activePrompt: {
            id: 'default',
            agentType,
            content: defaultContent,
            createdAt: new Date().toISOString(),
            isActive: true,
          },
        },
      })
    }

    const activePrompt = await getActivePrompt(agentType)

    return NextResponse.json({
      success: true,
      data: {
        prompts,
        activePrompt,
      },
    })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

// POST /api/prompts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentType, content, setAsActive, name, author } = body

    if (!agentType || !['agentA', 'agentB', 'agentC'].includes(agentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid agentType' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!author || typeof author !== 'string' || !author.trim()) {
      return NextResponse.json(
        { success: false, error: 'Author is required' },
        { status: 400 }
      )
    }

    const prompt: Prompt = {
      id: nanoid(),
      agentType,
      content,
      createdAt: new Date().toISOString(),
      isActive: false,
      name: name?.trim() || undefined,
      author: author.trim(),
    }

    // If setting as active, deactivate all others first
    if (setAsActive) {
      const existingPrompts = await listPrompts(agentType)
      for (const p of existingPrompts) {
        if (p.isActive) {
          p.isActive = false
          await savePrompt(p)
        }
      }
      prompt.isActive = true
    } else if ((await listPrompts(agentType)).length === 0) {
      // First prompt for this agent type, make it active
      prompt.isActive = true
    }

    await savePrompt(prompt)

    return NextResponse.json({
      success: true,
      data: prompt,
    })
  } catch (error) {
    console.error('Error saving prompt:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save prompt' },
      { status: 500 }
    )
  }
}

// PATCH /api/prompts - Set active prompt
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentType, promptId } = body

    if (!agentType || !['agentA', 'agentB', 'agentC'].includes(agentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid agentType' },
        { status: 400 }
      )
    }

    if (!promptId) {
      return NextResponse.json(
        { success: false, error: 'promptId is required' },
        { status: 400 }
      )
    }

    await setActivePrompt(agentType, promptId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting active prompt:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to set active prompt' },
      { status: 500 }
    )
  }
}

// DELETE /api/prompts?agentType=agentA&id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentType = searchParams.get('agentType')
    const id = searchParams.get('id')

    if (!agentType || !['agentA', 'agentB', 'agentC'].includes(agentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid agentType parameter' },
        { status: 400 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id parameter is required' },
        { status: 400 }
      )
    }

    // Check if this is the active prompt
    const activePrompt = await getActivePrompt(agentType)
    if (activePrompt && activePrompt.id === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the active prompt' },
        { status: 400 }
      )
    }

    await deletePrompt(agentType, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete prompt' },
      { status: 500 }
    )
  }
}
