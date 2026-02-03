import openai from './openai'
import { getSettings } from './storage'
import type { AgentAResponse, Evaluation, TranscriptEntry } from '@/types'

// Cache for settings to avoid repeated file reads
let settingsCache: { agentAModel: string; agentBModel: string; agentCModel: string } | null = null
let settingsCacheTime = 0
const CACHE_DURATION = 5000 // 5 seconds

async function getModelSettings() {
  const now = Date.now()
  if (!settingsCache || now - settingsCacheTime > CACHE_DURATION) {
    const settings = await getSettings()
    settingsCache = settings
    settingsCacheTime = now
  }
  return settingsCache
}

// Helper to determine which token parameter to use based on model
function getTokenParams(model: string, maxTokens: number) {
  // GPT-5 models use max_completion_tokens, others use max_tokens
  if (model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3')) {
    return { max_completion_tokens: maxTokens }
  }
  return { max_tokens: maxTokens }
}

function formatTranscript(transcript: TranscriptEntry[]): string {
  if (transcript.length === 0) {
    return '(No conversation yet)'
  }
  return transcript
    .map((entry) => {
      const role = entry.role === 'agentA' ? 'Matchmaker' : entry.role === 'agentB' ? 'User' : 'User'
      return `${role}: ${entry.content}`
    })
    .join('\n')
}

// ============ AGENT A (Interviewer) ============

export async function callAgentA(
  systemPrompt: string,
  initialQuestion: string,
  transcript: TranscriptEntry[],
  taskTopic?: string
): Promise<AgentAResponse> {
  const transcriptText = formatTranscript(transcript)

  // Replace placeholders in the prompt
  let prompt = systemPrompt
    .replace('{task_topic}', taskTopic || initialQuestion)
    .replace('{conversation_history}', transcriptText)

  const settings = await getModelSettings()
  const tokenParams = getTokenParams(settings.agentAModel, 1000)
  const completion = await openai.chat.completions.create({
    model: settings.agentAModel,
    messages: [
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    ...tokenParams,
  })

  const responseText = completion.choices[0]?.message?.content || ''

  // Parse the new format: "0:message" or "1:message"
  const trimmedResponse = responseText.trim()

  // Check for END_FLAG format (0: or 1: at the start)
  const flagMatch = trimmedResponse.match(/^([01]):?\s*([\s\S]*)/)

  if (flagMatch) {
    const done = flagMatch[1] === '1'
    const message = flagMatch[2].trim()
    return {
      message,
      done,
    }
  }

  // Try JSON format as fallback (for backwards compatibility)
  try {
    const cleanedText = trimmedResponse
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleanedText)

    if (typeof parsed.message === 'string' && typeof parsed.done === 'boolean') {
      return {
        message: parsed.message,
        done: parsed.done,
      }
    }
  } catch (e) {
    // Not JSON, continue to fallback
  }

  // Fallback: treat as plain message, not done
  console.log('Agent A response (no flag detected):', responseText)
  return {
    message: responseText,
    done: false,
  }
}

// ============ AGENT B (Simulated Persona) ============

export async function callAgentB(
  systemPrompt: string,
  profileContent: string,
  transcript: TranscriptEntry[],
  lastQuestion: string
): Promise<string> {
  const transcriptText = formatTranscript(transcript)

  // Replace {profile} placeholder in system prompt
  const prompt = systemPrompt.replace('{profile}', profileContent)

  const userContent = `TRANSCRIPT:
${transcriptText}

QUESTION:
${lastQuestion}`

  const settings = await getModelSettings()
  const tokenParams = getTokenParams(settings.agentBModel, 1000)
  const completion = await openai.chat.completions.create({
    model: settings.agentBModel,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.8,
    ...tokenParams,
  })

  return completion.choices[0]?.message?.content || ''
}

// ============ AGENT C (Evaluator) ============

export async function callAgentC(
  systemPrompt: string,
  initialQuestion: string,
  transcript: TranscriptEntry[]
): Promise<Evaluation> {
  const transcriptText = formatTranscript(transcript)

  const userContent = `INITIAL_QUESTION:
${initialQuestion}

TRANSCRIPT:
${transcriptText}

Please respond with valid JSON only.`

  const settings = await getModelSettings()
  const tokenParams = getTokenParams(settings.agentCModel, 4000)
  const completion = await openai.chat.completions.create({
    model: settings.agentCModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    ...tokenParams,
  })

  const responseText = completion.choices[0]?.message?.content || ''

  try {
    // Remove any markdown code fences if present
    const cleanedText = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    console.log('[Agent C] Attempting to parse response, length:', cleanedText.length)
    const parsed = JSON.parse(cleanedText)
    console.log('[Agent C] Parsed JSON keys:', Object.keys(parsed))
    console.log('[Agent C] Has overallScore?', 'overallScore' in parsed, 'Value:', parsed.overallScore)
    console.log('[Agent C] Has subscores?', 'subscores' in parsed, 'Type:', typeof parsed.subscores)
    if (parsed.subscores) {
      console.log('[Agent C] Subscores keys:', Object.keys(parsed.subscores))
    }

    // Validate required fields
    const evaluation: Evaluation = {
      overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 0,
      subscores: {
        relevance: parsed.subscores?.relevance ?? 0,
        coverage: parsed.subscores?.coverage ?? 0,
        clarity: parsed.subscores?.clarity ?? 0,
        efficiency: parsed.subscores?.efficiency ?? 0,
        redundancy: parsed.subscores?.redundancy ?? 0,
        reasoning: parsed.subscores?.reasoning ?? 0,
        tone: parsed.subscores?.tone ?? 0,
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      actionableSuggestions: Array.isArray(parsed.actionableSuggestions)
        ? parsed.actionableSuggestions
        : [],
      stopTiming: ['too early', 'appropriate', 'too late'].includes(parsed.stopTiming)
        ? parsed.stopTiming
        : 'appropriate',
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    }

    return evaluation
  } catch (e) {
    console.error('[Agent C] Failed to parse response as JSON:', e)
    console.error('[Agent C] Raw response (first 500 chars):', responseText.substring(0, 500))
    console.error('[Agent C] Response length:', responseText.length)
    console.error('[Agent C] Model used:', (await getModelSettings()).agentCModel)

    // Return a default evaluation on parse failure
    return {
      overallScore: 0,
      subscores: {
        relevance: 0,
        coverage: 0,
        clarity: 0,
        efficiency: 0,
        redundancy: 0,
        reasoning: 0,
        tone: 0,
      },
      strengths: [],
      weaknesses: ['Evaluation failed to parse'],
      actionableSuggestions: [],
      stopTiming: 'appropriate',
      evidence: [],
    }
  }
}
