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
      description: factor.description || `${factor.label} score (${factor.range[0]}-${factor.range[1]})`
    }
    subscoreRequired.push(factor.name)
  }

  const properties: Record<string, any> = {}
  const required: string[] = []

  // Always include subscores
  properties.subscores = {
    type: 'object',
    properties: subscoreProperties,
    required: subscoreRequired,
    additionalProperties: false
  }
  required.push('subscores')

  // Add enabled output options dynamically
  for (const option of settings.outputOptions) {
    if (!option.enabled) continue

    if (option.name === 'overallScore') {
      properties.overallScore = {
        type: 'number',
        description: option.description
      }
      required.push('overallScore')
    } else if (option.name === 'stopTiming') {
      properties.stopTiming = {
        type: 'string',
        enum: ['too early', 'appropriate', 'too late'],
        description: option.description
      }
      required.push('stopTiming')
    } else if (option.name === 'evidence') {
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
        description: option.description
      }
      required.push('evidence')
    } else if (option.type === 'array') {
      properties[option.name] = {
        type: 'array',
        items: { type: option.itemType || 'string' },
        description: option.description
      }
      required.push(option.name)
    } else if (option.type === 'number') {
      properties[option.name] = {
        type: 'number',
        description: option.description
      }
      required.push(option.name)
    } else if (option.type === 'string') {
      properties[option.name] = {
        type: 'string',
        description: option.description
      }
      required.push(option.name)
    }
  }

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

  // Replace all placeholders in the prompt
  const factorsList = settings.scoringFactors
    .map(f => {
      const range = `(${f.range[0]}-${f.range[1]})`
      const desc = f.description ? ` - ${f.description}` : ''
      return `- **${f.name}** (${f.label} ${range})${desc}`
    })
    .join('\n')

  // Build output requirements section from enabled output options
  const outputRequirements = settings.outputOptions
    .filter(opt => opt.enabled)
    .map(opt => `- **${opt.name}**: ${opt.description}`)
    .join('\n')

  const processedPrompt = systemPrompt
    .replace('{initial_question}', initialQuestion)
    .replace('{transcript}', transcriptText)
    .replace('{scoring_factors}', factorsList)
    .replace('{output_requirements}', outputRequirements)

  // User message is now just a trigger for evaluation
  const userContent = `Please evaluate this conversation based on the criteria above.`

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
