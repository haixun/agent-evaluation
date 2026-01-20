'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import type { Run, Evaluation } from '@/types'

export default function RunPage() {
  const params = useParams()
  const runId = params.id as string

  const [run, setRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userInput, setUserInput] = useState('')
  const [sending, setSending] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (runId) {
      fetchRun()
    }
  }, [runId])

  useEffect(() => {
    scrollToBottom()
  }, [run?.transcript])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchRun() {
    try {
      const res = await fetch(`/api/runs?id=${runId}`)
      const data = await res.json()
      if (data.success) {
        setRun(data.data)

        // If human mode and no transcript, start the conversation
        if (data.data.mode === 'human' && data.data.transcript.length === 0) {
          startChat()
        }
      } else {
        setError(data.error || 'Failed to fetch run')
      }
    } catch (err) {
      setError('Failed to fetch run')
    } finally {
      setLoading(false)
    }
  }

  async function startChat() {
    try {
      const res = await fetch(`/api/chat?runId=${runId}`)
      const data = await res.json()
      if (data.success) {
        setRun(data.data.run)
      }
    } catch (err) {
      console.error('Failed to start chat:', err)
    }
  }

  async function handleSendMessage() {
    if (!userInput.trim() || sending || !run) return

    setSending(true)
    const message = userInput.trim()
    setUserInput('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          userMessage: message,
        }),
      })

      const data = await res.json()
      if (data.success) {
        // Refetch the run to get updated transcript
        await fetchRun()
      } else {
        setError(data.error || 'Failed to send message')
      }
    } catch (err) {
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function runSimulationStep() {
    if (!run || simulating) return

    setSimulating(true)

    try {
      const res = await fetch('/api/sim/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      })

      const data = await res.json()
      if (data.success) {
        await fetchRun()

        // If not done, continue simulation after a short delay
        if (!data.data.done) {
          setTimeout(() => {
            runSimulationStep()
          }, 500)
        } else {
          setSimulating(false)
        }
      } else {
        setError(data.error || 'Simulation step failed')
        setSimulating(false)
      }
    } catch (err) {
      setError('Simulation step failed')
      setSimulating(false)
    }
  }

  function startSimulation() {
    runSimulationStep()
  }

  async function handleStopAndEvaluate() {
    if (!run || stopping) return

    if (!confirm('Are you sure you want to stop the conversation and run the evaluation?')) {
      return
    }

    setStopping(true)
    setSimulating(false) // Stop simulation if running
    setError('')

    try {
      const res = await fetch('/api/runs/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      })

      const data = await res.json()
      if (data.success) {
        setRun(data.data.run)
      } else {
        setError(data.error || 'Failed to stop run')
      }
    } catch (err) {
      setError('Failed to stop run')
    } finally {
      setStopping(false)
    }
  }

  async function handleDiscard() {
    if (!run || discarding) return

    if (!confirm('Are you sure you want to discard this conversation? No evaluation will be run.')) {
      return
    }

    setDiscarding(true)
    setSimulating(false) // Stop simulation if running
    setError('')

    try {
      const res = await fetch('/api/runs/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      })

      const data = await res.json()
      if (data.success) {
        setRun(data.data.run)
      } else {
        setError(data.error || 'Failed to discard run')
      }
    } catch (err) {
      setError('Failed to discard run')
    } finally {
      setDiscarding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (!run) {
    return (
      <div className="text-gray-500">Run not found</div>
    )
  }

  const isCompleted = run.status === 'completed'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Interview Run
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({run.mode === 'human' ? 'Human Mode' : 'Simulation Mode'})
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Initial question: {run.initialQuestion}
          </p>
          {run.taskTopic && (
            <p className="text-sm text-gray-500 mt-1">
              Topic: {run.taskTopic}
            </p>
          )}
          {run.mode === 'simulation' && (
            <p className="text-sm text-gray-500 mt-1">
              Turns: {run.turnCount} / {run.maxTurns || 30}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isCompleted && run.transcript.length >= 1 && (
            <button
              onClick={handleDiscard}
              disabled={discarding || stopping}
              className="px-4 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:opacity-50"
            >
              {discarding ? 'Discarding...' : 'Discard'}
            </button>
          )}
          {!isCompleted && run.transcript.length >= 2 && (
            <button
              onClick={handleStopAndEvaluate}
              disabled={stopping || discarding}
              className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {stopping ? 'Evaluating...' : 'Evaluate'}
            </button>
          )}
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {isCompleted ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>

      {/* Simulation Controls */}
      {run.mode === 'simulation' && !isCompleted && run.transcript.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-700 mb-3">
            Ready to start the simulation. Agent A will interview Agent B automatically.
          </p>
          <button
            onClick={startSimulation}
            disabled={simulating}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {simulating ? 'Running...' : 'Start Simulation'}
          </button>
        </div>
      )}

      {simulating && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
          <span className="text-yellow-700">Simulation in progress...</span>
        </div>
      )}

      {/* Transcript */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-4">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-medium text-gray-900">Transcript</h2>
        </div>
        <div className="p-4 h-96 overflow-y-auto space-y-4">
          {run.transcript.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              {run.mode === 'human'
                ? 'Starting conversation...'
                : 'Click "Start Simulation" to begin'}
            </div>
          ) : (
            run.transcript.map((entry, idx) => (
              <div
                key={idx}
                className={`flex ${
                  entry.role === 'user' || entry.role === 'agentB'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    entry.role === 'agentA'
                      ? 'bg-blue-100 text-blue-900'
                      : entry.role === 'agentB'
                      ? 'bg-purple-100 text-purple-900'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium mb-1 opacity-70">
                    <span>
                      {entry.role === 'agentA'
                        ? 'Agent A (Interviewer)'
                        : entry.role === 'agentB'
                        ? 'Agent B (Persona)'
                        : 'You'}
                    </span>
                    {entry.role === 'agentA' && entry.endFlag !== undefined && (
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-xs font-mono ${
                          entry.endFlag === 1
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        END_FLAG: {entry.endFlag}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap">{entry.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input (Human Mode Only) */}
        {run.mode === 'human' && !isCompleted && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your response..."
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !userInput.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Evaluation */}
      {isCompleted && run.evaluation && (
        <EvaluationPanel evaluation={run.evaluation} />
      )}
    </div>
  )
}

function EvaluationPanel({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-medium text-gray-900">Agent C Evaluation</h2>
      </div>
      <div className="p-4 space-y-6">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-blue-600">
            {evaluation.overallScore}
          </div>
          <div>
            <div className="text-sm text-gray-500">Overall Score</div>
            <div className="text-sm text-gray-700">
              Stop Timing: {evaluation.stopTiming}
            </div>
          </div>
        </div>

        {/* Subscores */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Subscores</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(evaluation.subscores).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-500 capitalize">{key}</div>
                <div className="text-lg font-semibold text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-green-700 mb-2">Strengths</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-500">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-red-700 mb-2">Weaknesses</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {evaluation.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-red-500">-</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Actionable Suggestions</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            {evaluation.actionableSuggestions.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-500">*</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Evidence */}
        {evaluation.evidence.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Evidence</h3>
            <div className="space-y-2">
              {evaluation.evidence.map((e, i) => (
                <div key={i} className="bg-gray-50 rounded p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-gray-200 rounded text-xs capitalize">
                      {e.category}
                    </span>
                  </div>
                  <blockquote className="italic text-gray-600 border-l-2 border-gray-300 pl-2 mb-1">
                    &ldquo;{e.quote}&rdquo;
                  </blockquote>
                  <p className="text-gray-700">{e.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
