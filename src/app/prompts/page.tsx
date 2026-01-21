'use client'

import { useState, useEffect } from 'react'
import type { Prompt } from '@/types'

type AgentType = 'agentA' | 'agentB' | 'agentC'

const AGENT_LABELS: Record<AgentType, string> = {
  agentA: 'Agent A (Interviewer)',
  agentB: 'Agent B (Persona)',
  agentC: 'Agent C (Evaluator)',
}

const AGENT_COLORS: Record<AgentType, string> = {
  agentA: 'indigo',
  agentB: 'purple',
  agentC: 'emerald',
}

export default function PromptsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('agentA')
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [authorName, setAuthorName] = useState('')

  useEffect(() => {
    fetchPrompts(selectedAgent)
  }, [selectedAgent])

  async function fetchPrompts(agentType: AgentType) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/prompts?agentType=${agentType}`)
      const data = await res.json()
      if (data.success) {
        setPrompts(data.data.prompts)
        setActivePrompt(data.data.activePrompt)
        setEditContent(data.data.activePrompt?.content || '')
      } else {
        setError(data.error || 'Failed to fetch prompts')
      }
    } catch (err) {
      setError('Failed to fetch prompts')
    } finally {
      setLoading(false)
    }
  }

  function openSaveModal() {
    if (!editContent.trim()) {
      setError('Prompt content is required')
      return
    }
    setVersionName('')
    setAuthorName('')
    setShowSaveModal(true)
  }

  async function handleSavePrompt() {
    if (!editContent.trim()) {
      setError('Prompt content is required')
      return
    }

    if (!versionName.trim()) {
      setError('Version name is required')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: selectedAgent,
          content: editContent.trim(),
          setAsActive: true,
          name: versionName.trim(),
          author: authorName.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccess('Prompt saved and set as active')
        setShowSaveModal(false)
        setVersionName('')
        setAuthorName('')
        fetchPrompts(selectedAgent)
      } else {
        setError(data.error || 'Failed to save prompt')
      }
    } catch (err) {
      setError('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetActive(promptId: string) {
    try {
      const res = await fetch('/api/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: selectedAgent,
          promptId,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccess('Active prompt updated')
        fetchPrompts(selectedAgent)
      } else {
        setError(data.error || 'Failed to set active prompt')
      }
    } catch (err) {
      setError('Failed to set active prompt')
    }
  }

  function handleSelectVersion(prompt: Prompt) {
    setEditContent(prompt.content)
  }

  const agentColor = AGENT_COLORS[selectedAgent]

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Prompt Editor</h1>
        <p className="page-description">Manage and version your agent prompts</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Agent Tabs */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(AGENT_LABELS) as AgentType[]).map((agent) => {
          const color = AGENT_COLORS[agent]
          const isSelected = selectedAgent === agent
          return (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isSelected
                  ? `bg-${color}-600 text-white shadow-md`
                  : `bg-white text-slate-600 hover:bg-slate-50 border border-slate-200`
              }`}
              style={isSelected ? {
                backgroundColor: color === 'indigo' ? '#4f46e5' : color === 'purple' ? '#9333ea' : '#059669'
              } : {}}
            >
              {AGENT_LABELS[agent]}
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Prompt Editor */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit {AGENT_LABELS[selectedAgent]} Prompt
              </h2>
              {activePrompt && (
                <span className="badge badge-primary">
                  Active: {activePrompt.name || activePrompt.id.substring(0, 8)}
                </span>
              )}
            </div>
            <div className="card-body">
              {loading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="spinner text-indigo-600"></div>
                </div>
              ) : (
                <>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="input min-h-[400px] font-mono text-sm leading-relaxed"
                    placeholder="Enter prompt content..."
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={openSaveModal}
                      disabled={saving || !editContent.trim()}
                      className="btn-primary"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save as New Version
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Version History */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Version History
              </h2>
            </div>
            <div className="card-body">
              {prompts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm">
                    No saved versions yet.<br />
                    Save your first prompt above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        prompt.isActive
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      onClick={() => handleSelectVersion(prompt)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {prompt.name || `Version ${prompt.id.substring(0, 8)}`}
                          </div>
                          {prompt.author && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              by {prompt.author}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 mt-1">
                            {new Date(prompt.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {prompt.isActive ? (
                          <span className="badge badge-success shrink-0">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSetActive(prompt.id)
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium shrink-0"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 line-clamp-2 font-mono">
                        {prompt.content.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Prompt Info */}
          {activePrompt && (
            <div className="card bg-gradient-to-br from-slate-50 to-white">
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Currently Active
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name</span>
                    <span className="text-slate-900 font-medium">{activePrompt.name || 'Default'}</span>
                  </div>
                  {activePrompt.author && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Author</span>
                      <span className="text-slate-900">{activePrompt.author}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID</span>
                    <span className="text-slate-900 font-mono text-xs">{activePrompt.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created</span>
                    <span className="text-slate-900 text-xs">{new Date(activePrompt.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-fade-in">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Save New Version</h3>
              <p className="text-sm text-slate-500 mt-1">Give this prompt version a name and optionally add your name as author.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="input-group">
                <label className="input-label">
                  Version Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="input"
                  placeholder="e.g., Improved follow-up questions"
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  Author <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="input"
                  placeholder="e.g., John Smith"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={saving}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={saving || !versionName.trim()}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <div className="spinner text-white w-4 h-4"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save & Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
