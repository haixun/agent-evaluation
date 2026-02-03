import openai from './openai'
import { getSettings } from './storage'
import type { AgentAResponse, Evaluation, TranscriptEntry, Settings } from '@/types'

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

function generateEvaluationSchema(settings: Settings) {
  const subscoreProperties: Record<string, any> = {}
  const subscoreRequired: string[] = []

  // Build subscore properties from scoring factors
  for (const factor of settings.scoringFactors) {
    subscoreProperties[factor.name] = {
      type: 'number',
      description: `${factor.label} score (${factor.range[0]}-${factor.range[1]})`
    }
    subscoreRequired.push(factor.name)
  }

  const properties: Record<string, any> = {}
  const required: string[] = []

  // Add overall score if enabled
  if (settings.includeOverallScore) {
    properties.overallScore = {
      type: 'number',
      description: 'Overall score'
    }
    required.push('overallScore')
  }

  // Add subscores
  properties.subscores = {
    type: 'object',
    properties: subscoreProperties,
    required: subscoreRequired,
    additionalProperties: false
  }
  required.push('subscores')

  // Add optional sections
  if (settings.includeStrengths) {
    properties.strengths = {
      type: 'array',
      items: { type: 'string' },
      description: 'List of strengths observed'
    }
    required.push('strengths')
  }

  if (settings.includeWeaknesses) {
    properties.weaknesses = {
      type: 'array',
      items: { type: 'string' },
      description: 'List of weaknesses observed'
    }
    required.push('weaknesses')
  }

  if (settings.includeSuggestions) {
    properties.actionableSuggestions = {
      type: 'array',
      items: { type: 'string' },
      description: 'List of actionable suggestions for improvement'
    }
    required.push('actionableSuggestions')
  }

  // Always include stopTiming and evidence for compatibility
  properties.stopTiming = {
    type: 'string',
    enum: ['too early', 'appropriate', 'too late'],
    description: 'Whether the interview ended at the right time'
  }
  required.push('stopTiming')

  properties.evidence = {
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
    description: 'Evidence supporting the evaluation'
  }
  required.push('evidence')

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false
  }
}

export async function callAgentC(
  systemPrompt: string,
  initialQuestion: string,
  transcript: TranscriptEntry[]
): Promise<Evaluation> {
  const transcriptText = formatTranscript(transcript)
  const settings = await getSettings()

  // Replace {scoring_factors} placeholder with factor list
  const factorsList = settings.scoringFactors
    .map(f => `- ${f.name}: ${f.label} (${f.range[0]}-${f.range[1]})`)
    .join('\n')

  const processedPrompt = systemPrompt.replace('{scoring_factors}', factorsList)

  const userContent = `INITIAL_QUESTION:
${initialQuestion}

TRANSCRIPT:
${transcriptText}`

  const tokenParams = getTokenParams(settings.agentCModel, 4000)

  try {
    const evaluationSchema = generateEvaluationSchema(settings)

    const completion = await openai.chat.completions.create({
      model: settings.agentCModel,
      messages: [
        { role: 'system', content: processedPrompt },
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
    const parsed = JSON.parse(responseText)

    console.log('[Agent C] Successfully parsed evaluation')

    // Convert to Evaluation type with default values for missing fields
    const evaluation: Evaluation = {
      overallScore: parsed.overallScore ?? 0,
      subscores: parsed.subscores ?? {},
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      actionableSuggestions: parsed.actionableSuggestions ?? [],
      stopTiming: parsed.stopTiming ?? 'appropriate',
      evidence: parsed.evidence ?? [],
    }

    return evaluation

  } catch (e) {
    console.error('[Agent C] Failed to get evaluation:', e)
    console.error('[Agent C] Model used:', settings.agentCModel)

    // Return a default evaluation on failure
    const defaultSubscores: Record<string, number> = {}
    for (const factor of settings.scoringFactors) {
      defaultSubscores[factor.name] = 0
    }

    return {
      overallScore: 0,
      subscores: defaultSubscores,
      strengths: [],
      weaknesses: ['Evaluation failed to complete'],
      actionableSuggestions: [],
      stopTiming: 'appropriate',
      evidence: [],
    }
  }
}
