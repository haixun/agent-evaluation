import openai from './openai'
import type { AgentAResponse, Evaluation, TranscriptEntry } from '@/types'

const MODEL = 'gpt-4o'

function formatTranscript(transcript: TranscriptEntry[]): string {
  return transcript
    .map((entry) => {
      const role = entry.role === 'agentA' ? 'Agent A' : entry.role === 'agentB' ? 'Agent B' : 'User'
      return `${role}: ${entry.content}`
    })
    .join('\n\n')
}

// ============ AGENT A (Interviewer) ============

export async function callAgentA(
  systemPrompt: string,
  initialQuestion: string,
  transcript: TranscriptEntry[]
): Promise<AgentAResponse> {
  const transcriptText = formatTranscript(transcript)

  const userContent = `INITIAL_QUESTION:
${initialQuestion}

TRANSCRIPT:
${transcriptText || '(No conversation yet)'}`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  const responseText = completion.choices[0]?.message?.content || ''

  // Try to parse JSON response
  try {
    // Remove any markdown code fences if present
    const cleanedText = responseText
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
    console.error('Failed to parse Agent A response as JSON:', e)
    console.error('Raw response:', responseText)
  }

  // Fallback: treat as plain message, not done
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

  const userContent = `PROFILE:
${profileContent}

TRANSCRIPT:
${transcriptText}

QUESTION:
${lastQuestion}`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.8,
    max_tokens: 1000,
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
${transcriptText}`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  })

  const responseText = completion.choices[0]?.message?.content || ''

  try {
    // Remove any markdown code fences if present
    const cleanedText = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleanedText)

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
    console.error('Failed to parse Agent C response as JSON:', e)
    console.error('Raw response:', responseText)

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
