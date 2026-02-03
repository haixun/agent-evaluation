'use client'

import { useState, useEffect } from 'react'
import type { Settings, LLMModel, ScoringFactor, EvaluationOutputOption, Prompt } from '@/types'

type TabType = 'evaluation' | 'prompts' | 'models'
type AgentType = 'agentA' | 'agentB' | 'agentC'

const availableModels: LLMModel[] = [
  'gpt-5',
  'gpt-5.1',
  'gpt-5.2',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5.1-codex',
  'gpt-4o',
  'gpt-4o-mini',
  'o1',
  'o1-mini',
  'o3-mini',
]

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('evaluation')

  // Settings state
  const [settings, setSettings] = useState<Settings>({
    agentAModel: 'gpt-5.1',
    agentBModel: 'gpt-4o-mini',
    agentCModel: 'gpt-5.1',
    scoringFactors: [],
    outputOptions: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Scoring factors state
  const [editingFactor, setEditingFactor] = useState<number | null>(null)
  const [newFactor, setNewFactor] = useState<ScoringFactor>({
    name: '',
    label: '',
    type: 'score',
    range: [0, 100],
    description: '',
  })

  // Output options state
  const [editingOption, setEditingOption] = useState<number | null>(null)
  const [newOption, setNewOption] = useState<EvaluationOutputOption>({
    name: '',
    label: '',
    description: '',
    type: 'array',
    itemType: 'string',
    enabled: true,
  })

  // Prompts state
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('agentA')
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null)
  const [editContent, setEditContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [promptsLoading, setPromptsLoading] = useState(false)
  const [promptsSaving, setPromptsSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [authorName, setAuthorName] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'prompts') {
      fetchPrompts(selectedAgent)
    }
  }, [activeTab, selectedAgent])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  // Scoring factor handlers
  const addScoringFactor = () => {
    if (!newFactor.name || !newFactor.label) {
      setMessage({ type: 'error', text: 'Name and label are required' })
      return
    }
    setSettings({
      ...settings,
      scoringFactors: [...settings.scoringFactors, newFactor],
    })
    setNewFactor({ name: '', label: '', type: 'score', range: [0, 100], description: '' })
    setMessage(null)
  }

  const removeScoringFactor = (index: number) => {
    setSettings({
      ...settings,
      scoringFactors: settings.scoringFactors.filter((_, i) => i !== index),
    })
  }

  const updateScoringFactor = (index: number, factor: ScoringFactor) => {
    const updated = [...settings.scoringFactors]
    updated[index] = factor
    setSettings({ ...settings, scoringFactors: updated })
  }

  const moveScoringFactor = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= settings.scoringFactors.length) return

    const updated = [...settings.scoringFactors]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setSettings({ ...settings, scoringFactors: updated })
  }

  // Output option handlers
  const addOutputOption = () => {
    if (!newOption.name || !newOption.label || !newOption.description) {
      setMessage({ type: 'error', text: 'Name, label, and description are required' })
      return
    }
    setSettings({
      ...settings,
      outputOptions: [...settings.outputOptions, newOption],
    })
    setNewOption({
      name: '',
      label: '',
      description: '',
      type: 'array',
      itemType: 'string',
      enabled: true,
    })
    setMessage(null)
  }

  const removeOutputOption = (index: number) => {
    setSettings({
      ...settings,
      outputOptions: settings.outputOptions.filter((_, i) => i !== index),
    })
  }

  const updateOutputOption = (index: number, option: EvaluationOutputOption) => {
    const updated = [...settings.outputOptions]
    updated[index] = option
    setSettings({ ...settings, outputOptions: updated })
  }

  const moveOutputOption = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= settings.outputOptions.length) return

    const updated = [...settings.outputOptions]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setSettings({ ...settings, outputOptions: updated })
  }

  // Prompts handlers
  async function fetchPrompts(agentType: AgentType) {
    setPromptsLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/prompts?agentType=${agentType}`)
      const data = await res.json()
      if (data.success) {
        setPrompts(data.data.prompts)
        setActivePrompt(data.data.activePrompt)
        const content = data.data.activePrompt?.content || ''
        setEditContent(content)
        setOriginalContent(content)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch prompts' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch prompts' })
    } finally {
      setPromptsLoading(false)
    }
  }

  function openSaveModal() {
    if (!editContent.trim()) {
      setMessage({ type: 'error', text: 'Prompt content is required' })
      return
    }
    setVersionName('')
    setAuthorName('')
    setShowSaveModal(true)
  }

  async function handleSavePrompt() {
    if (!editContent.trim() || !versionName.trim() || !authorName.trim()) {
      setMessage({ type: 'error', text: 'All fields are required' })
      return
    }

    setPromptsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: selectedAgent,
          content: editContent.trim(),
          setAsActive: true,
          name: versionName.trim(),
          author: authorName.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Prompt saved and set as active' })
        setShowSaveModal(false)
        setVersionName('')
        setAuthorName('')
        fetchPrompts(selectedAgent)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save prompt' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save prompt' })
    } finally {
      setPromptsSaving(false)
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
        setMessage({ type: 'success', text: 'Active prompt updated' })
        fetchPrompts(selectedAgent)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to set active prompt' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to set active prompt' })
    }
  }

  function handleSelectVersion(prompt: Prompt) {
    setEditContent(prompt.content)
  }

  async function handleDeletePrompt(promptId: string) {
    if (!confirm('Are you sure you want to delete this prompt version?')) {
      return
    }

    setDeleting(promptId)
    setMessage(null)

    try {
      const res = await fetch(`/api/prompts?agentType=${selectedAgent}&id=${promptId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Prompt deleted successfully' })
        fetchPrompts(selectedAgent)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete prompt' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete prompt' })
    } finally {
      setDeleting(null)
    }
  }

  const hasPromptChanges = editContent.trim() !== originalContent.trim()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="card">
          <div className="card-body">
            <p className="text-slate-500">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure your voice agent system</p>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {message.type === 'success' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto hover:opacity-70">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <div className="card sticky top-6">
            <div className="p-4 space-y-1">
              <button
                onClick={() => setActiveTab('evaluation')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'evaluation'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Evaluation
                </div>
              </button>
              <button
                onClick={() => setActiveTab('prompts')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'prompts'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Prompt Editor
                </div>
              </button>
              <button
                onClick={() => setActiveTab('models')}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'models'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Models
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              {/* Scoring Factors */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-slate-900">Scoring Factors</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Define the criteria used by Agent C to evaluate conversation quality
                  </p>
                </div>
                <div className="card-body space-y-6">
                  {/* Current Scoring Factors - keeping the existing implementation */}
                  <div className="space-y-3">
                    {settings.scoringFactors.length === 0 ? (
                      <p className="text-slate-500 text-sm">No scoring factors configured</p>
                    ) : (
                      settings.scoringFactors.map((factor, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50"
                        >
                          {editingFactor === index ? (
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Name (internal)
                                  </label>
                                  <input
                                    type="text"
                                    value={factor.name}
                                    onChange={(e) =>
                                      updateScoringFactor(index, { ...factor, name: e.target.value })
                                    }
                                    className="input text-sm"
                                    placeholder="e.g., relevance"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Label (display)
                                  </label>
                                  <input
                                    type="text"
                                    value={factor.label}
                                    onChange={(e) =>
                                      updateScoringFactor(index, { ...factor, label: e.target.value })
                                    }
                                    className="input text-sm"
                                    placeholder="e.g., Relevance"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={factor.description || ''}
                                  onChange={(e) =>
                                    updateScoringFactor(index, { ...factor, description: e.target.value })
                                  }
                                  className="input text-sm"
                                  rows={2}
                                  placeholder="e.g., Were follow-ups on-topic and goal-directed?"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Range Min
                                  </label>
                                  <input
                                    type="number"
                                    value={factor.range[0]}
                                    onChange={(e) =>
                                      updateScoringFactor(index, {
                                        ...factor,
                                        range: [parseInt(e.target.value) || 0, factor.range[1]],
                                      })
                                    }
                                    className="input text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Range Max
                                  </label>
                                  <input
                                    type="number"
                                    value={factor.range[1]}
                                    onChange={(e) =>
                                      updateScoringFactor(index, {
                                        ...factor,
                                        range: [factor.range[0], parseInt(e.target.value) || 100],
                                      })
                                    }
                                    className="input text-sm"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingFactor(null)}
                                  className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">{factor.label}</span>
                                  <span className="text-xs text-slate-500">({factor.name})</span>
                                </div>
                                {factor.description && (
                                  <div className="text-sm text-slate-600 mt-1">{factor.description}</div>
                                )}
                                <div className="text-sm text-slate-500 mt-1">
                                  Range: {factor.range[0]} - {factor.range[1]}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => moveScoringFactor(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => moveScoringFactor(index, 'down')}
                                  disabled={index === settings.scoringFactors.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  onClick={() => setEditingFactor(index)}
                                  className="px-2 py-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeScoringFactor(index)}
                                  className="px-2 py-1 text-sm text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Factor */}
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Add New Factor</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Name (internal)
                          </label>
                          <input
                            type="text"
                            value={newFactor.name}
                            onChange={(e) => setNewFactor({ ...newFactor, name: e.target.value })}
                            className="input text-sm"
                            placeholder="e.g., relevance"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Label (display)
                          </label>
                          <input
                            type="text"
                            value={newFactor.label}
                            onChange={(e) => setNewFactor({ ...newFactor, label: e.target.value })}
                            className="input text-sm"
                            placeholder="e.g., Relevance"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={newFactor.description || ''}
                          onChange={(e) => setNewFactor({ ...newFactor, description: e.target.value })}
                          className="input text-sm"
                          rows={2}
                          placeholder="e.g., Were follow-ups on-topic and goal-directed?"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Range Min
                          </label>
                          <input
                            type="number"
                            value={newFactor.range[0]}
                            onChange={(e) =>
                              setNewFactor({
                                ...newFactor,
                                range: [parseInt(e.target.value) || 0, newFactor.range[1]],
                              })
                            }
                            className="input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Range Max
                          </label>
                          <input
                            type="number"
                            value={newFactor.range[1]}
                            onChange={(e) =>
                              setNewFactor({
                                ...newFactor,
                                range: [newFactor.range[0], parseInt(e.target.value) || 100],
                              })
                            }
                            className="input text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={addScoringFactor} className="btn btn-secondary">
                          Add Factor
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Output Options */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-slate-900">Evaluation Output Options</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Configure what sections Agent C includes in evaluation responses
                  </p>
                </div>
                <div className="card-body space-y-6">
                  <div className="space-y-3">
                    {settings.outputOptions.length === 0 ? (
                      <p className="text-slate-500 text-sm">No output options configured</p>
                    ) : (
                      settings.outputOptions.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50"
                        >
                          {editingOption === index ? (
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                  <input
                                    type="text"
                                    value={option.name}
                                    onChange={(e) =>
                                      updateOutputOption(index, { ...option, name: e.target.value })
                                    }
                                    className="input text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                                  <input
                                    type="text"
                                    value={option.label}
                                    onChange={(e) =>
                                      updateOutputOption(index, { ...option, label: e.target.value })
                                    }
                                    className="input text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                  value={option.description}
                                  onChange={(e) =>
                                    updateOutputOption(index, { ...option, description: e.target.value })
                                  }
                                  className="input text-sm"
                                  rows={2}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                  <select
                                    value={option.type}
                                    onChange={(e) =>
                                      updateOutputOption(index, {
                                        ...option,
                                        type: e.target.value as any,
                                      })
                                    }
                                    className="input text-sm"
                                  >
                                    <option value="number">Number</option>
                                    <option value="array">Array</option>
                                    <option value="string">String</option>
                                  </select>
                                </div>
                                {option.type === 'array' && (
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Type</label>
                                    <select
                                      value={option.itemType || 'string'}
                                      onChange={(e) =>
                                        updateOutputOption(index, {
                                          ...option,
                                          itemType: e.target.value as any,
                                        })
                                      }
                                      className="input text-sm"
                                    >
                                      <option value="string">String</option>
                                      <option value="object">Object</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={option.enabled}
                                    onChange={(e) =>
                                      updateOutputOption(index, { ...option, enabled: e.target.checked })
                                    }
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">Enabled</span>
                                </label>
                                <button
                                  onClick={() => setEditingOption(null)}
                                  className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">{option.label}</span>
                                  <span className="text-xs text-slate-500">({option.name})</span>
                                  {option.enabled ? (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                      Enabled
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-slate-600 mt-1">{option.description}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => moveOutputOption(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => moveOutputOption(index, 'down')}
                                  disabled={index === settings.outputOptions.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                >
                                  ↓
                                </button>
                                <button
                                  onClick={() => setEditingOption(index)}
                                  className="px-2 py-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeOutputOption(index)}
                                  className="px-2 py-1 text-sm text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Output Option */}
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Add New Output Option</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={newOption.name}
                            onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                            className="input text-sm"
                            placeholder="e.g., strengths"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                          <input
                            type="text"
                            value={newOption.label}
                            onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                            className="input text-sm"
                            placeholder="e.g., Strengths"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                          value={newOption.description}
                          onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                          className="input text-sm"
                          rows={2}
                          placeholder="e.g., List key strengths observed"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                          <select
                            value={newOption.type}
                            onChange={(e) =>
                              setNewOption({ ...newOption, type: e.target.value as any })
                            }
                            className="input text-sm"
                          >
                            <option value="number">Number</option>
                            <option value="array">Array</option>
                            <option value="string">String</option>
                          </select>
                        </div>
                        {newOption.type === 'array' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Item Type</label>
                            <select
                              value={newOption.itemType || 'string'}
                              onChange={(e) =>
                                setNewOption({ ...newOption, itemType: e.target.value as any })
                              }
                              className="input text-sm"
                            >
                              <option value="string">String</option>
                              <option value="object">Object</option>
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button onClick={addOutputOption} className="btn btn-secondary">
                          Add Output Option
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-6">
              {/* Agent Tabs */}
              <div className="flex gap-2">
                {(Object.keys(AGENT_LABELS) as AgentType[]).map((agent) => {
                  const color = AGENT_COLORS[agent]
                  const isSelected = selectedAgent === agent
                  return (
                    <button
                      key={agent}
                      onClick={() => setSelectedAgent(agent)}
                      className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        isSelected
                          ? 'text-white shadow-md'
                          : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor:
                                color === 'indigo' ? '#4f46e5' : color === 'purple' ? '#9333ea' : '#059669',
                            }
                          : {}
                      }
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
                      <h2 className="font-semibold text-slate-900">
                        Edit {AGENT_LABELS[selectedAgent]} Prompt
                      </h2>
                      {activePrompt && (
                        <span className="badge badge-primary">
                          Active: {activePrompt.name || activePrompt.id.substring(0, 8)}
                        </span>
                      )}
                    </div>
                    <div className="card-body">
                      {promptsLoading ? (
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
                              disabled={promptsSaving || !editContent.trim() || !hasPromptChanges}
                              className="btn-primary"
                            >
                              Save as New Version
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Version History */}
                <div>
                  <div className="card">
                    <div className="card-header">
                      <h2 className="font-semibold text-slate-900">Version History</h2>
                    </div>
                    <div className="card-body">
                      {prompts.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-slate-500 text-sm">No saved versions yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {prompts.map((prompt) => (
                            <div
                              key={prompt.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                prompt.isActive
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-slate-200 hover:bg-slate-50'
                              }`}
                              onClick={() => handleSelectVersion(prompt)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900 text-sm">
                                    {prompt.name || prompt.id.substring(0, 8)}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1">
                                    by {prompt.author}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {prompt.isActive ? (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                      Active
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSetActive(prompt.id)
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-700"
                                      >
                                        Activate
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeletePrompt(prompt.id)
                                        }}
                                        disabled={deleting === prompt.id}
                                        className="text-xs text-red-600 hover:text-red-700"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-slate-900">Agent Models</h2>
                <p className="text-sm text-slate-600 mt-1">Configure the LLM models used by each agent</p>
              </div>
              <div className="card-body space-y-6">
                {/* Agent A Model */}
                <div className="input-group">
                  <label className="input-label">Agent A Model (Interviewer)</label>
                  <select
                    value={settings.agentAModel}
                    onChange={(e) => setSettings({ ...settings, agentAModel: e.target.value as LLMModel })}
                    className="input"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="input-hint">Conducts the interview by asking questions</p>
                </div>

                {/* Agent B Model */}
                <div className="input-group">
                  <label className="input-label">Agent B Model (Simulated User)</label>
                  <select
                    value={settings.agentBModel}
                    onChange={(e) => setSettings({ ...settings, agentBModel: e.target.value as LLMModel })}
                    className="input"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="input-hint">Simulates user responses in simulation mode</p>
                </div>

                {/* Agent C Model */}
                <div className="input-group">
                  <label className="input-label">Agent C Model (Evaluator)</label>
                  <select
                    value={settings.agentCModel}
                    onChange={(e) => setSettings({ ...settings, agentCModel: e.target.value as LLMModel })}
                    className="input"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="input-hint">Evaluates conversation quality and provides scores</p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          {(activeTab === 'evaluation' || activeTab === 'models') && (
            <div className="flex justify-end mt-6">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Prompt Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Save New Version</h3>
              <p className="text-sm text-slate-500 mt-1">Give this prompt version a name and add your name as author</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="input-group">
                <label className="input-label">Version Name *</label>
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
                <label className="input-label">Author *</label>
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
                disabled={promptsSaving}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={promptsSaving || !versionName.trim() || !authorName.trim()}
                className="btn-primary"
              >
                {promptsSaving ? 'Saving...' : 'Save & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
