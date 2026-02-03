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

// Define the evaluation schema for structured outputs
const evaluationSchema = {
  type: 'object',
  properties: {
    overallScore: {
      type: 'number',
      description: 'Overall score from 0 to 100'
    },
    subscores: {
      type: 'object',
      properties: {
        relevance: { type: 'number', description: 'Score 0-100' },
        coverage: { type: 'number', description: 'Score 0-100' },
        clarity: { type: 'number', description: 'Score 0-100' },
        efficiency: { type: 'number', description: 'Score 0-100' },
        redundancy: { type: 'number', description: 'Score 0-100' },
        reasoning: { type: 'number', description: 'Score 0-100' },
        tone: { type: 'number', description: 'Score 0-100' }
      },
      required: ['relevance', 'coverage', 'clarity', 'efficiency', 'redundancy', 'reasoning', 'tone'],
      additionalProperties: false
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of strengths observed'
    },
    weaknesses: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of weaknesses observed'
    },
    actionableSuggestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of actionable suggestions for improvement'
    },
    stopTiming: {
      type: 'string',
      enum: ['too early', 'appropriate', 'too late'],
      description: 'Whether the interview ended at the right time'
    },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string', description: 'Short excerpt from transcript' },
          note: { type: 'string', description: 'Why this supports the evaluation' },
          category: { type: 'string', description: 'One of the subscore categories' }
        },
        required: ['quote', 'note', 'category'],
        additionalProperties: false
      },
      description: 'Evidence supporting the evaluation with 3-8 items'
    }
  },
  required: ['overallScore', 'subscores', 'strengths', 'weaknesses', 'actionableSuggestions', 'stopTiming', 'evidence'],
  additionalProperties: false
} as const

export async function callAgentC(
  systemPrompt: string,
  initialQuestion: string,
  transcript: TranscriptEntry[]
): Promise<Evaluation> {
  const transcriptText = formatTranscript(transcript)

  const userContent = `INITIAL_QUESTION:
${initialQuestion}

TRANSCRIPT:
${transcriptText}`

  const settings = await getModelSettings()
  const tokenParams = getTokenParams(settings.agentCModel, 4000)

  try {
    const completion = await openai.chat.completions.create({
      model: settings.agentCModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'evaluation',
          strict: true,
          schema: evaluationSchema
        }
      },
      ...tokenParams,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const parsed = JSON.parse(responseText) as Evaluation

    console.log('[Agent C] Successfully parsed evaluation with overallScore:', parsed.overallScore)
    return parsed

  } catch (e) {
    console.error('[Agent C] Failed to get evaluation:', e)
    console.error('[Agent C] Model used:', settings.agentCModel)

    // Return a default evaluation on failure
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
      weaknesses: ['Evaluation failed to complete'],
      actionableSuggestions: [],
      stopTiming: 'appropriate',
      evidence: [],
    }
  }
}
