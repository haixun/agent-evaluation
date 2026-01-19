'use client'

import { useState, useEffect } from 'react'
import type { Prompt } from '@/types'

type AgentType = 'agentA' | 'agentB' | 'agentC'

const AGENT_LABELS: Record<AgentType, string> = {
  agentA: 'Agent A (Interviewer)',
  agentB: 'Agent B (Persona)',
  agentC: 'Agent C (Evaluator)',
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

  async function handleSavePrompt() {
    if (!editContent.trim()) {
      setError('Prompt content is required')
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
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccess('Prompt saved and set as active')
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

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Prompt Editor</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Agent Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(Object.keys(AGENT_LABELS) as AgentType[]).map((agent) => (
          <button
            key={agent}
            onClick={() => setSelectedAgent(agent)}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              selectedAgent === agent
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {AGENT_LABELS[agent]}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Prompt Editor */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900">
                Edit {AGENT_LABELS[selectedAgent]} Prompt
              </h2>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Loading...
                </div>
              ) : (
                <>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Enter prompt content..."
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSavePrompt}
                      disabled={saving || !editContent.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save as New Version'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Version History */}
        <div>
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900">Version History</h2>
            </div>
            <div className="p-4">
              {prompts.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No saved versions yet. Save your first prompt above.
                </p>
              ) : (
                <div className="space-y-2">
                  {prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className={`p-3 rounded border cursor-pointer ${
                        prompt.isActive
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectVersion(prompt)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {new Date(prompt.createdAt).toLocaleString()}
                        </div>
                        {prompt.isActive ? (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSetActive(prompt.id)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-700 truncate">
                        {prompt.content.substring(0, 50)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Prompt Info */}
          {activePrompt && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 text-sm mb-2">
                Currently Active
              </h3>
              <p className="text-xs text-gray-500">
                ID: {activePrompt.id}
              </p>
              <p className="text-xs text-gray-500">
                Created: {new Date(activePrompt.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
