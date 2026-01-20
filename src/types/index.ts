// Run modes
export type RunMode = 'human' | 'simulation'

// Transcript message roles
export type TranscriptRole = 'agentA' | 'agentB' | 'user'

// Transcript entry
export interface TranscriptEntry {
  role: TranscriptRole
  content: string
  timestamp: string
  endFlag?: 0 | 1  // Only for agentA messages: 0 = continue, 1 = done
}

// Agent A response format
export interface AgentAResponse {
  message: string
  done: boolean
}

// Evaluation subscores
export interface EvaluationSubscores {
  relevance: number
  coverage: number
  clarity: number
  efficiency: number
  redundancy: number
  reasoning: number
  tone: number
}

// Evaluation evidence item
export interface EvaluationEvidence {
  quote: string
  note: string
  category: keyof EvaluationSubscores
}

// Agent C evaluation result
export interface Evaluation {
  overallScore: number
  subscores: EvaluationSubscores
  strengths: string[]
  weaknesses: string[]
  actionableSuggestions: string[]
  stopTiming: 'too early' | 'appropriate' | 'too late'
  evidence: EvaluationEvidence[]
}

// Run status
export type RunStatus = 'in_progress' | 'completed' | 'error'

// Run record stored in blob
export interface Run {
  runId: string
  mode: RunMode
  status: RunStatus
  createdAt: string
  endedAt?: string
  initialQuestion: string
  taskTopic?: string // Topic for the conversation
  agentAPromptVersionId: string
  agentBPromptVersionId?: string
  agentCPromptVersionId: string
  agentBProfileId?: string
  transcript: TranscriptEntry[]
  evaluation?: Evaluation
  turnCount: number
  maxTurns?: number // Max turns for simulation mode
  error?: string
}

// Prompt record
export interface Prompt {
  id: string
  agentType: 'agentA' | 'agentB' | 'agentC'
  content: string
  createdAt: string
  isActive: boolean
}

// Profile for Agent B
export interface Profile {
  id: string
  name: string
  content: string
  createdAt: string
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Chat request (human mode)
export interface ChatRequest {
  runId: string
  userMessage: string
}

// Chat response
export interface ChatResponse {
  agentMessage: string
  done: boolean
  evaluation?: Evaluation
}

// Simulation step response
export interface SimStepResponse {
  agentAMessage: string
  agentBMessage?: string
  done: boolean
  evaluation?: Evaluation
}

// Create run request
export interface CreateRunRequest {
  mode: RunMode
  initialQuestion: string
  taskTopic?: string // Topic for the conversation
  profileId?: string
  maxTurns?: number // Max turns for simulation mode
}

// Max turns limit
export const MAX_TURNS = 30
