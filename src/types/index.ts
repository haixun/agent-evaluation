// Run modes
export type RunMode = 'human' | 'simulation' | 'transcript'

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

// Evaluation subscores - now dynamic based on scoring factors
export interface EvaluationSubscores {
  [key: string]: number  // Dynamic subscores based on configured factors
}

// Evaluation evidence item
export interface EvaluationEvidence {
  quote: string
  note: string
  category: string  // References a scoring factor name
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
  agentAPromptName?: string      // Snapshot of prompt name at run time (e.g., "v1.30")
  agentAPromptAuthor?: string    // Snapshot of prompt author at run time
  agentBPromptVersionId?: string
  agentBPromptName?: string      // Snapshot of prompt name at run time (e.g., "v1.30")
  agentBPromptAuthor?: string    // Snapshot of prompt author at run time
  agentCPromptVersionId: string
  agentCPromptName?: string      // Snapshot of prompt name at run time (e.g., "v1.30")
  agentCPromptAuthor?: string    // Snapshot of prompt author at run time
  agentBProfileId?: string
  agentBProfileName?: string     // Snapshot of profile name at run time
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
  name?: string      // Version name (e.g., "v1.30")
  author: string     // Author of this version
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

// Transcript upload request
export interface UploadTranscriptRequest {
  initialQuestion: string
  taskTopic?: string
  transcript: TranscriptEntry[]
}

// Max turns limit
export const MAX_TURNS = 30

// Available LLM models
export type LLMModel =
  | 'gpt-5'
  | 'gpt-5.1'
  | 'gpt-5.2'
  | 'gpt-5-mini'
  | 'gpt-5-nano'
  | 'gpt-5.1-codex'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'o1'
  | 'o1-mini'
  | 'o3-mini'

// Scoring Factor
export interface ScoringFactor {
  name: string           // e.g., "relevance"
  label: string          // e.g., "Relevance" (for display)
  type: 'score'          // extensible for future types
  range: [number, number] // e.g., [0, 100]
  description?: string   // e.g., "Were follow-ups on-topic and goal-directed?"
}

// Evaluation Output Option
export interface EvaluationOutputOption {
  name: string                    // e.g., "strengths", "overallScore"
  label: string                   // e.g., "Strengths", "Overall Score"
  description: string             // e.g., "List key strengths observed"
  type: 'number' | 'string' | 'array' | 'object'  // data type for schema
  itemType?: 'string' | 'object'  // for arrays, what type of items
  enabled: boolean                // whether to include in evaluation
}

// Settings
export interface Settings {
  agentAModel: LLMModel
  agentBModel: LLMModel
  agentCModel: LLMModel

  scoringFactors: ScoringFactor[]
  outputOptions: EvaluationOutputOption[]
}
