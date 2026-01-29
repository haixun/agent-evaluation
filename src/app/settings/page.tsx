'use client'

import { useState, useEffect } from 'react'
import type { Settings, LLMModel } from '@/types'

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    agentAModel: 'gpt-5.1',
    agentBModel: 'gpt-4o-mini',
    agentCModel: 'gpt-5.1',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="card-body">
            <p className="text-slate-500">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure the LLM models used by each agent</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-900">Agent Models</h2>
        </div>
        <div className="card-body space-y-6">
          {/* Agent A Model */}
          <div className="input-group">
            <label className="input-label">
              Agent A Model (Interviewer)
              <span className="text-slate-500 font-normal ml-2">- Asks questions to the user</span>
            </label>
            <select
              value={settings.agentAModel}
              onChange={(e) =>
                setSettings({ ...settings, agentAModel: e.target.value as LLMModel })
              }
              className="input"
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="input-hint">
              Select the language model for Agent A. This agent conducts the interview.
            </p>
          </div>

          {/* Agent B Model */}
          <div className="input-group">
            <label className="input-label">
              Agent B Model (Simulated User)
              <span className="text-slate-500 font-normal ml-2">
                - Simulates user responses (simulation mode only)
              </span>
            </label>
            <select
              value={settings.agentBModel}
              onChange={(e) =>
                setSettings({ ...settings, agentBModel: e.target.value as LLMModel })
              }
              className="input"
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="input-hint">
              Select the language model for Agent B. This agent simulates user responses in
              simulation mode.
            </p>
          </div>

          {/* Agent C Model */}
          <div className="input-group">
            <label className="input-label">
              Agent C Model (Evaluator)
              <span className="text-slate-500 font-normal ml-2">
                - Evaluates the conversation quality
              </span>
            </label>
            <select
              value={settings.agentCModel}
              onChange={(e) =>
                setSettings({ ...settings, agentCModel: e.target.value as LLMModel })
              }
              className="input"
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="input-hint">
              Select the language model for Agent C. This agent evaluates the conversation quality
              and provides scores.
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-900">About Agent Models</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-900 mb-1">Agent A (Interviewer)</p>
              <p>
                Conducts the interview by asking questions. Uses the configured prompt to guide the
                conversation style and depth. Recommended: gpt-5 or gpt-5.1 for best performance.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-1">Agent B (Simulated User)</p>
              <p>
                In simulation mode, this agent responds as the configured persona. Recommended:
                gpt-4o-mini for faster, cost-effective responses.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-1">Agent C (Evaluator)</p>
              <p>
                Analyzes the conversation and provides detailed evaluation scores. Recommended:
                gpt-5 or gpt-5.1 for accurate, nuanced evaluation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
