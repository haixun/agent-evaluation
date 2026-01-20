import { promises as fs } from 'fs'
import path from 'path'
import type { Run, Prompt, Profile } from '@/types'

// Check if we have Vercel Blob configured
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN

// Local storage directory for development
const DATA_DIR = path.join(process.cwd(), '.data')
const RUNS_DIR = path.join(DATA_DIR, 'runs')
const PROMPTS_DIR = path.join(DATA_DIR, 'prompts')
const PROFILES_DIR = path.join(DATA_DIR, 'profiles')

// Ensure directories exist for local storage
async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {
    // Directory already exists
  }
}

// ============ LOCAL FILE STORAGE ============

async function localSaveRun(run: Run): Promise<void> {
  await ensureDir(RUNS_DIR)
  const filePath = path.join(RUNS_DIR, `${run.runId}.json`)
  await fs.writeFile(filePath, JSON.stringify(run, null, 2))
}

async function localGetRun(runId: string): Promise<Run | null> {
  try {
    const filePath = path.join(RUNS_DIR, `${runId}.json`)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function localListRuns(): Promise<Run[]> {
  try {
    await ensureDir(RUNS_DIR)
    const files = await fs.readdir(RUNS_DIR)
    const runs: Run[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(path.join(RUNS_DIR, file), 'utf-8')
          runs.push(JSON.parse(data))
        } catch {
          // Skip invalid files
        }
      }
    }

    return runs.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

async function localDeleteRun(runId: string): Promise<void> {
  try {
    const filePath = path.join(RUNS_DIR, `${runId}.json`)
    await fs.unlink(filePath)
  } catch {
    // File doesn't exist
  }
}

async function localSavePrompt(prompt: Prompt): Promise<void> {
  const dir = path.join(PROMPTS_DIR, prompt.agentType)
  await ensureDir(dir)
  const filePath = path.join(dir, `${prompt.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(prompt, null, 2))
}

async function localGetPrompt(agentType: string, id: string): Promise<Prompt | null> {
  try {
    const filePath = path.join(PROMPTS_DIR, agentType, `${id}.json`)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function localGetActivePrompt(agentType: string): Promise<Prompt | null> {
  const prompts = await localListPrompts(agentType)
  return prompts.find((p) => p.isActive) || null
}

async function localListPrompts(agentType: string): Promise<Prompt[]> {
  try {
    const dir = path.join(PROMPTS_DIR, agentType)
    await ensureDir(dir)
    const files = await fs.readdir(dir)
    const prompts: Prompt[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(path.join(dir, file), 'utf-8')
          prompts.push(JSON.parse(data))
        } catch {
          // Skip invalid files
        }
      }
    }

    return prompts.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

async function localSetActivePrompt(agentType: string, id: string): Promise<void> {
  const prompts = await localListPrompts(agentType)

  for (const prompt of prompts) {
    if (prompt.id === id) {
      prompt.isActive = true
    } else if (prompt.isActive) {
      prompt.isActive = false
    }
    await localSavePrompt(prompt)
  }
}

async function localSaveProfile(profile: Profile): Promise<void> {
  await ensureDir(PROFILES_DIR)
  const filePath = path.join(PROFILES_DIR, `${profile.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(profile, null, 2))
}

async function localGetProfile(id: string): Promise<Profile | null> {
  try {
    const filePath = path.join(PROFILES_DIR, `${id}.json`)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function localListProfiles(): Promise<Profile[]> {
  try {
    await ensureDir(PROFILES_DIR)
    const files = await fs.readdir(PROFILES_DIR)
    const profiles: Profile[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(path.join(PROFILES_DIR, file), 'utf-8')
          profiles.push(JSON.parse(data))
        } catch {
          // Skip invalid files
        }
      }
    }

    return profiles.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

async function localDeleteProfile(id: string): Promise<void> {
  try {
    const filePath = path.join(PROFILES_DIR, `${id}.json`)
    await fs.unlink(filePath)
  } catch {
    // File doesn't exist
  }
}

// ============ VERCEL BLOB STORAGE ============

// Store the blob base URL for direct URL construction
let blobBaseUrl: string | null = null

async function blobSaveRun(run: Run): Promise<void> {
  const { put } = await import('@vercel/blob')
  const result = await put(`runs/${run.runId}.json`, JSON.stringify(run), {
    access: 'public',
    addRandomSuffix: false,
  })
  // Extract base URL for direct access (e.g., https://xyz.public.blob.vercel-storage.com)
  if (!blobBaseUrl) {
    const url = new URL(result.url)
    blobBaseUrl = `${url.protocol}//${url.host}`
  }
}

async function blobGetRun(runId: string): Promise<Run | null> {
  const pathname = `runs/${runId}.json`
  const startTime = Date.now()

  // Try direct URL first if we know the base URL
  if (blobBaseUrl) {
    try {
      const directUrl = `${blobBaseUrl}/${pathname}`
      const response = await fetch(directUrl)
      if (response.ok) {
        console.log(`[Blob] getRun ${runId}: direct URL success in ${Date.now() - startTime}ms`)
        return await response.json()
      }
    } catch {
      // Direct URL failed, fall back to list()
    }
  }

  // Fall back to list() with retries
  const { list } = await import('@vercel/blob')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { blobs } = await list({ prefix: pathname })
      if (blobs.length > 0) {
        // Extract base URL for future direct access
        if (!blobBaseUrl) {
          const url = new URL(blobs[0].url)
          blobBaseUrl = `${url.protocol}//${url.host}`
        }
        const response = await fetch(blobs[0].url)
        if (response.ok) {
          console.log(`[Blob] getRun ${runId}: list() success on attempt ${attempt + 1} in ${Date.now() - startTime}ms`)
          return await response.json()
        }
      }
      // Shorter delays: 200ms, 400ms
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
      }
    } catch (e) {
      console.log(`[Blob] getRun ${runId}: attempt ${attempt + 1} failed:`, e)
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
      }
    }
  }
  console.log(`[Blob] getRun ${runId}: FAILED after ${Date.now() - startTime}ms`)
  return null
}

async function blobListRuns(): Promise<Run[]> {
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: 'runs/' })
    const runs: Run[] = []

    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          runs.push(await response.json())
        }
      } catch {
        // Skip invalid blobs
      }
    }

    return runs.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

async function blobDeleteRun(runId: string): Promise<void> {
  const { list, del } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: `runs/${runId}.json` })
  for (const blob of blobs) {
    await del(blob.url)
  }
}

async function blobSavePrompt(prompt: Prompt): Promise<void> {
  const { put } = await import('@vercel/blob')
  await put(`prompts/${prompt.agentType}/${prompt.id}.json`, JSON.stringify(prompt), {
    access: 'public',
    addRandomSuffix: false,
  })
}

async function blobGetPrompt(agentType: string, id: string): Promise<Prompt | null> {
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: `prompts/${agentType}/${id}.json` })
    if (blobs.length === 0) return null

    const response = await fetch(blobs[0].url)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

async function blobGetActivePrompt(agentType: string): Promise<Prompt | null> {
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: `prompts/${agentType}/` })

    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          const prompt: Prompt = await response.json()
          if (prompt.isActive) {
            return prompt
          }
        }
      } catch {
        // Skip invalid blobs
      }
    }
    return null
  } catch {
    return null
  }
}

async function blobListPrompts(agentType: string): Promise<Prompt[]> {
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: `prompts/${agentType}/` })
    const prompts: Prompt[] = []

    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          prompts.push(await response.json())
        }
      } catch {
        // Skip invalid blobs
      }
    }

    return prompts.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

async function blobSetActivePrompt(agentType: string, id: string): Promise<void> {
  const prompts = await blobListPrompts(agentType)

  for (const prompt of prompts) {
    if (prompt.id === id) {
      prompt.isActive = true
    } else if (prompt.isActive) {
      prompt.isActive = false
    }
    await blobSavePrompt(prompt)
  }
}

async function blobSaveProfile(profile: Profile): Promise<void> {
  const { put } = await import('@vercel/blob')
  await put(`profiles/${profile.id}.json`, JSON.stringify(profile), {
    access: 'public',
    addRandomSuffix: false,
  })
}

async function blobGetProfile(id: string): Promise<Profile | null> {
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: `profiles/${id}.json` })
    if (blobs.length === 0) return null

    const response = await fetch(blobs[0].url)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

async function blobListProfiles(): Promise<Profile[]> {
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: 'profiles/' })
    const profiles: Profile[] = []

    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          profiles.push(await response.json())
        }
      } catch {
        // Skip invalid blobs
      }
    }

    return profiles.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

async function blobDeleteProfile(id: string): Promise<void> {
  const { list, del } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: `profiles/${id}.json` })
  for (const blob of blobs) {
    await del(blob.url)
  }
}

// ============ EXPORTED FUNCTIONS ============

export async function saveRun(run: Run): Promise<void> {
  if (USE_BLOB) {
    return blobSaveRun(run)
  }
  return localSaveRun(run)
}

export async function getRun(runId: string): Promise<Run | null> {
  if (USE_BLOB) {
    return blobGetRun(runId)
  }
  return localGetRun(runId)
}

export async function listRuns(): Promise<Run[]> {
  if (USE_BLOB) {
    return blobListRuns()
  }
  return localListRuns()
}

export async function deleteRun(runId: string): Promise<void> {
  if (USE_BLOB) {
    return blobDeleteRun(runId)
  }
  return localDeleteRun(runId)
}

export async function savePrompt(prompt: Prompt): Promise<void> {
  if (USE_BLOB) {
    return blobSavePrompt(prompt)
  }
  return localSavePrompt(prompt)
}

export async function getPrompt(agentType: string, id: string): Promise<Prompt | null> {
  if (USE_BLOB) {
    return blobGetPrompt(agentType, id)
  }
  return localGetPrompt(agentType, id)
}

export async function getActivePrompt(agentType: string): Promise<Prompt | null> {
  if (USE_BLOB) {
    return blobGetActivePrompt(agentType)
  }
  return localGetActivePrompt(agentType)
}

export async function listPrompts(agentType: string): Promise<Prompt[]> {
  if (USE_BLOB) {
    return blobListPrompts(agentType)
  }
  return localListPrompts(agentType)
}

export async function setActivePrompt(agentType: string, id: string): Promise<void> {
  if (USE_BLOB) {
    return blobSetActivePrompt(agentType, id)
  }
  return localSetActivePrompt(agentType, id)
}

export async function saveProfile(profile: Profile): Promise<void> {
  if (USE_BLOB) {
    return blobSaveProfile(profile)
  }
  return localSaveProfile(profile)
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (USE_BLOB) {
    return blobGetProfile(id)
  }
  return localGetProfile(id)
}

export async function listProfiles(): Promise<Profile[]> {
  if (USE_BLOB) {
    return blobListProfiles()
  }
  return localListProfiles()
}

export async function deleteProfile(id: string): Promise<void> {
  if (USE_BLOB) {
    return blobDeleteProfile(id)
  }
  return localDeleteProfile(id)
}
