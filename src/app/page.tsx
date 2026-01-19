'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, RunMode } from '@/types'

const SAMPLE_QUESTIONS = [
  {
    category: 'Relationship Goals',
    questions: [
      "What are you looking for in a long-term partner?",
      "What does your ideal relationship look like in 5 years?",
      "What are your non-negotiables when it comes to a romantic partner?",
    ],
  },
  {
    category: 'Dating Preferences',
    questions: [
      "Tell me about your dating history and what you've learned from past relationships.",
      "What qualities do you find most attractive in a potential partner?",
      "How do you typically meet new people, and what's been working or not working for you?",
    ],
  },
  {
    category: 'Lifestyle & Values',
    questions: [
      "How important is shared lifestyle compatibility (hobbies, social life, routines) to you?",
      "What role does family play in your life, and what are your thoughts on starting one?",
      "How do you handle conflict in relationships, and what communication style works best for you?",
    ],
  },
  {
    category: 'Self-Discovery',
    questions: [
      "What do you think has been holding you back from finding the right partner?",
      "How would your close friends describe you as a partner?",
      "What aspects of yourself are you currently working on improving?",
    ],
  },
  {
    category: 'Matchmaking Intake',
    questions: [
      "Walk me through your typical week - what does work-life balance look like for you?",
      "What's your love language, and how do you prefer to give and receive affection?",
      "If you could design your perfect first date, what would it look like?",
    ],
  },
]

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<RunMode>('human')
  const [initialQuestion, setInitialQuestion] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [maxTurns, setMaxTurns] = useState(20)
  const [questionMode, setQuestionMode] = useState<'sample' | 'custom'>('sample')
  const [selectedSampleQuestion, setSelectedSampleQuestion] = useState('')
  const [profilesLoading, setProfilesLoading] = useState(true)

  // New profile form state
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileContent, setNewProfileContent] = useState('')

  useEffect(() => {
    fetchProfiles()
  }, [])

  async function fetchProfiles() {
    setProfilesLoading(true)
    try {
      const res = await fetch('/api/profiles')
      const data = await res.json()
      if (data.success) {
        setProfiles(data.data)
        if (data.data.length > 0) {
          setSelectedProfileId(data.data[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err)
    } finally {
      setProfilesLoading(false)
    }
  }

  async function handleCreateProfile() {
    if (!newProfileName.trim() || !newProfileContent.trim()) {
      setError('Profile name and content are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProfileName,
          content: newProfileContent,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setProfiles([data.data, ...profiles])
        setSelectedProfileId(data.data.id)
        setShowNewProfile(false)
        setNewProfileName('')
        setNewProfileContent('')
      } else {
        setError(data.error || 'Failed to create profile')
      }
    } catch (err) {
      setError('Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  // Get the actual question to use
  const getQuestion = () => {
    if (questionMode === 'sample') {
      return selectedSampleQuestion
    }
    return initialQuestion.trim()
  }

  async function handleStartRun() {
    const question = getQuestion()
    if (!question) {
      setError(questionMode === 'sample' ? 'Please select a sample question' : 'Please enter a question')
      return
    }

    if (mode === 'simulation' && !selectedProfileId) {
      setError('Please select a profile for simulation mode')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          initialQuestion: question,
          profileId: mode === 'simulation' ? selectedProfileId : undefined,
          maxTurns: mode === 'simulation' ? maxTurns : undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        router.push(`/runs/${data.data.runId}`)
      } else {
        setError(data.error || 'Failed to create run')
      }
    } catch (err) {
      setError('Failed to create run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Start New Interview Run</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interview Mode
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="mode"
                value="human"
                checked={mode === 'human'}
                onChange={() => setMode('human')}
                className="mr-2"
              />
              <span className="text-gray-900">Human Mode</span>
              <span className="text-sm text-gray-500 ml-2">(You answer Agent A)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="mode"
                value="simulation"
                checked={mode === 'simulation'}
                onChange={() => setMode('simulation')}
                className="mr-2"
              />
              <span className="text-gray-900">Simulation Mode</span>
              <span className="text-sm text-gray-500 ml-2">(Agent B answers)</span>
            </label>
          </div>
        </div>

        {/* Initial Question */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Question
          </label>

          {/* Question Mode Toggle */}
          <div className="flex gap-4 mb-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="questionMode"
                checked={questionMode === 'sample'}
                onChange={() => setQuestionMode('sample')}
                className="mr-2"
              />
              <span className="text-gray-900">Sample Question</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="questionMode"
                checked={questionMode === 'custom'}
                onChange={() => setQuestionMode('custom')}
                className="mr-2"
              />
              <span className="text-gray-900">Custom Question</span>
            </label>
          </div>

          {/* Sample Question Selector */}
          {questionMode === 'sample' && (
            <div className="space-y-2">
              <select
                value={selectedSampleQuestion}
                onChange={(e) => setSelectedSampleQuestion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a question --</option>
                {SAMPLE_QUESTIONS.map((category) => (
                  <optgroup key={category.category} label={category.category}>
                    {category.questions.map((q, idx) => (
                      <option key={idx} value={q}>
                        {q}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {selectedSampleQuestion && (
                <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                  {selectedSampleQuestion}
                </div>
              )}
            </div>
          )}

          {/* Custom Question Input */}
          {questionMode === 'custom' && (
            <textarea
              value={initialQuestion}
              onChange={(e) => setInitialQuestion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Enter the initial question Agent A should ask..."
            />
          )}
        </div>

        {/* Profile Selection (Simulation Mode) */}
        {mode === 'simulation' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Agent B Profile (Persona)
              </label>
              <button
                onClick={() => setShowNewProfile(!showNewProfile)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showNewProfile ? 'Cancel' : '+ New Profile'}
              </button>
            </div>

            {profilesLoading ? (
              <div className="p-4 text-center text-gray-500">Loading profiles...</div>
            ) : showNewProfile ? (
              <div className="border border-gray-200 rounded-md p-4 space-y-3">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Profile name (e.g., 'Tech Startup Founder')"
                />
                <textarea
                  value={newProfileContent}
                  onChange={(e) => setNewProfileContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  rows={8}
                  placeholder="Profile content (JSON or YAML describing the persona)..."
                />
                <button
                  onClick={handleCreateProfile}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Create Profile
                </button>
              </div>
            ) : (
              <>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {profiles.length === 0 ? (
                    <option value="">No profiles available</option>
                  ) : (
                    profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))
                  )}
                </select>

                {/* Profile Preview */}
                {selectedProfileId && profiles.find(p => p.id === selectedProfileId) && (
                  <div className="mt-3 border border-gray-200 rounded-md overflow-hidden">
                    <div className="bg-purple-100 px-3 py-2 border-b border-purple-200">
                      <span className="text-sm font-medium text-purple-800">
                        Persona: {profiles.find(p => p.id === selectedProfileId)?.name}
                      </span>
                    </div>
                    <pre className="p-3 text-sm text-gray-700 bg-purple-50 overflow-auto max-h-64 whitespace-pre-wrap font-mono">
                      {profiles.find(p => p.id === selectedProfileId)?.content}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Max Turns (Simulation Mode) */}
        {mode === 'simulation' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Turns
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(Math.max(2, Math.min(100, parseInt(e.target.value) || 2)))}
                min={2}
                max={100}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-500">
                Conversation will stop after this many turns (2-100)
              </span>
            </div>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStartRun}
          disabled={loading || !getQuestion()}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Starting...' : 'Start Interview'}
        </button>
      </div>

      {/* Quick Tips */}
      <div className="mt-6 bg-gray-100 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Quick Tips</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• In Human Mode, you&apos;ll chat directly with Agent A</li>
          <li>• In Simulation Mode, Agent B automatically responds based on its profile</li>
          <li>• Agent A will ask follow-up questions until it has enough information</li>
          <li>• After the interview ends, Agent C evaluates the conversation quality</li>
        </ul>
      </div>
    </div>
  )
}
