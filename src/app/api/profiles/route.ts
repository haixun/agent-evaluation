import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { saveProfile, listProfiles, getProfile, deleteProfile } from '@/lib/storage'
import { defaultProfile } from '@/lib/defaultPrompts'
import type { Profile } from '@/types'

// GET /api/profiles
export async function GET() {
  try {
    const profiles = await listProfiles()

    // If no profiles exist, return a default one
    if (profiles.length === 0) {
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'default',
            name: 'Alex Chen (Default)',
            content: defaultProfile,
            createdAt: new Date().toISOString(),
          },
        ],
      })
    }

    return NextResponse.json({
      success: true,
      data: profiles,
    })
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profiles' },
      { status: 500 }
    )
  }
}

// POST /api/profiles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, content } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    const profile: Profile = {
      id: nanoid(),
      name,
      content,
      createdAt: new Date().toISOString(),
    }

    await saveProfile(profile)

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save profile' },
      { status: 500 }
    )
  }
}

// DELETE /api/profiles?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    if (id === 'default') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete default profile' },
        { status: 400 }
      )
    }

    await deleteProfile(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete profile' },
      { status: 500 }
    )
  }
}
