'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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
        <div className="spinner text-indigo-600"></div>
      </div>
    )
  }

  if (error && !run) {
    return (
      <div className="card">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Run</h3>
          <p className="text-slate-500 mb-6">{error}</p>
          <Link href="/history" className="btn-secondary">
            Back to History
          </Link>
        </div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="card">
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Run not found</h3>
          <Link href="/history" className="btn-secondary">
            Back to History
          </Link>
        </div>
      </div>
    )
  }

  const isCompleted = run.status === 'completed'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/history" className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Evaluation Run</h1>
            <span className={`badge ${run.mode === 'human' ? 'badge-success' : 'badge-purple'}`}>
              {run.mode === 'human' ? 'Human Mode' : 'Simulation'}
            </span>
          </div>
          <p className="text-sm text-slate-500 line-clamp-1">{run.initialQuestion}</p>
          {run.taskTopic && (
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-medium">Topic:</span> {run.taskTopic}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isCompleted && run.transcript.length >= 1 && (
            <button
              onClick={handleDiscard}
              disabled={discarding || stopping}
              className="btn-ghost text-slate-600"
            >
              {discarding ? 'Discarding...' : 'Discard'}
            </button>
          )}
          {!isCompleted && run.transcript.length >= 2 && (
            <button
              onClick={handleStopAndEvaluate}
              disabled={stopping || discarding}
              className="btn-success"
            >
              {stopping ? (
                <>
                  <div className="spinner text-white w-4 h-4"></div>
                  Evaluating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Evaluate
                </>
              )}
            </button>
          )}
          <span
            className={`badge ${
              isCompleted ? 'badge-success' : 'badge-warning'
            }`}
          >
            {isCompleted ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Simulation Controls */}
      {run.mode === 'simulation' && !isCompleted && run.transcript.length === 0 && (
        <div className="card bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 mb-6">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Ready to Start Simulation</h3>
              <p className="text-sm text-slate-600">
                Agent A will interview Agent B automatically based on the selected profile.
              </p>
            </div>
            <button
              onClick={startSimulation}
              disabled={simulating}
              className="btn-primary"
            >
              {simulating ? (
                <>
                  <div className="spinner text-white w-4 h-4"></div>
                  Running...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Simulation
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {simulating && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <div className="spinner text-amber-600"></div>
          <div>
            <span className="font-medium text-amber-700">Simulation in progress</span>
            <span className="text-amber-600 ml-2">Turn {run.turnCount} / {run.maxTurns || 30}</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Transcript */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Conversation
              </h2>
              {run.mode === 'simulation' && (
                <span className="text-sm text-slate-500">
                  {run.turnCount} / {run.maxTurns || 30} turns
                </span>
              )}
            </div>
            <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {run.transcript.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
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
                      className={`${
                        entry.role === 'agentA'
                          ? 'message-agent'
                          : entry.role === 'agentB'
                          ? 'message-persona'
                          : 'message-user'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-medium mb-2 opacity-80">
                        <span>
                          {entry.role === 'agentA'
                            ? 'Agent A (Interviewer)'
                            : entry.role === 'agentB'
                            ? 'Agent B (Persona)'
                            : 'You'}
                        </span>
                        {entry.role === 'agentA' && entry.endFlag !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                              entry.endFlag === 1
                                ? 'bg-white/30 text-white'
                                : 'bg-white/20 text-white/80'
                            }`}
                          >
                            END: {entry.endFlag}
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{entry.content}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input (Human Mode Only) */}
            {run.mode === 'human' && !isCompleted && (
              <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex gap-3">
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
                    className="input"
                    placeholder="Type your response..."
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !userInput.trim()}
                    className="btn-primary px-6"
                  >
                    {sending ? (
                      <div className="spinner text-white w-4 h-4"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Run Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-slate-900">Run Details</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-900">{new Date(run.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Mode</span>
                <span className="text-slate-900">{run.mode === 'human' ? 'Human' : 'Simulation'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Turns</span>
                <span className="text-slate-900">{run.turnCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${isCompleted ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>
          </div>

          {/* Evaluation */}
          {isCompleted && run.evaluation && (
            <EvaluationPanel evaluation={run.evaluation} />
          )}
        </div>
      </div>
    </div>
  )
}

function EvaluationPanel({ evaluation }: { evaluation: Evaluation }) {
  return (
    <>
      {/* Score Card */}
      <div className="card bg-gradient-to-br from-indigo-500 to-purple-600 border-0 text-white">
        <div className="p-6 text-center">
          <div className="text-6xl font-bold mb-2">{evaluation.overallScore}</div>
          <div className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Overall Score</div>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Stop: {evaluation.stopTiming}
          </div>
        </div>
      </div>

      {/* Subscores */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-900">Subscores</h3>
        </div>
        <div className="card-body space-y-3">
          {Object.entries(evaluation.subscores).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-20 text-xs font-medium text-slate-500 capitalize">{key}</div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
              <div className="w-8 text-sm font-semibold text-slate-900 text-right">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-900">Analysis</h3>
        </div>
        <div className="card-body space-y-4">
          {evaluation.strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Strengths
              </h4>
              <ul className="text-sm text-slate-600 space-y-1">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.weaknesses.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Weaknesses
              </h4>
              <ul className="text-sm text-slate-600 space-y-1">
                {evaluation.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-500 shrink-0">-</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {evaluation.actionableSuggestions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Suggestions</h3>
          </div>
          <div className="card-body">
            <ul className="text-sm text-slate-600 space-y-2">
              {evaluation.actionableSuggestions.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-indigo-500 shrink-0">
                    <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Evidence */}
      {evaluation.evidence.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Evidence</h3>
          </div>
          <div className="card-body space-y-3">
            {evaluation.evidence.map((e, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <span className="badge badge-slate text-xs mb-2">{e.category}</span>
                <blockquote className="text-sm text-slate-600 italic border-l-2 border-slate-300 pl-3 mb-2">
                  &ldquo;{e.quote}&rdquo;
                </blockquote>
                <p className="text-sm text-slate-700">{e.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
