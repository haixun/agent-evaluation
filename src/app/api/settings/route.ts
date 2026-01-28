import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/storage'
import type { Settings } from '@/types'

// GET /api/settings
export async function GET() {
  try {
    const settings = await getSettings()
    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Error getting settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings
export async function POST(request: NextRequest) {
  try {
    const body: Settings = await request.json()

    // Validate the settings
    if (!body.agentAModel || !body.agentBModel || !body.agentCModel) {
      return NextResponse.json(
        { success: false, error: 'All agent models are required' },
        { status: 400 }
      )
    }

    await saveSettings(body)

    return NextResponse.json({
      success: true,
      data: body,
    })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
