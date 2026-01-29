'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, RunMode, TranscriptEntry, Settings } from '@/types'

const SAMPLE_QUESTIONS = [
  {
    category: 'Relationship Goals',
    icon: '💝',
    questions: [
      "What are you looking for in a long-term partner?",
      "What does your ideal relationship look like in 5 years?",
      "What are your non-negotiables when it comes to a romantic partner?",
    ],
  },
  {
    category: 'Dating Preferences',
    icon: '💫',
    questions: [
      "Tell me about your dating history and what you've learned from past relationships.",
      "What qualities do you find most attractive in a potential partner?",
      "How do you typically meet new people, and what's been working or not working for you?",
    ],
  },
  {
    category: 'Lifestyle & Values',
    icon: '🌟',
    questions: [
      "How important is shared lifestyle compatibility (hobbies, social life, routines) to you?",
      "What role does family play in your life, and what are your thoughts on starting one?",
      "How do you handle conflict in relationships, and what communication style works best for you?",
    ],
  },
  {
    category: 'Self-Discovery',
    icon: '🔮',
    questions: [
      "What do you think has been holding you back from finding the right partner?",
      "How would your close friends describe you as a partner?",
      "What aspects of yourself are you currently working on improving?",
    ],
  },
  {
    category: 'Matchmaking Intake',
    icon: '✨',
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
  const [taskTopic, setTaskTopic] = useState('')

  // New profile form state
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileContent, setNewProfileContent] = useState('')

  // Edit profile form state
  const [editingProfile, setEditingProfile] = useState(false)
  const [editProfileName, setEditProfileName] = useState('')
  const [editProfileContent, setEditProfileContent] = useState('')

  // Transcript mode state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedTranscript, setUploadedTranscript] = useState<TranscriptEntry[] | null>(null)
  const [uploadInitialQuestion, setUploadInitialQuestion] = useState('')
  const [uploadTaskTopic, setUploadTaskTopic] = useState('')
  const [fileError, setFileError] = useState('')

  // Settings state
  const [settings, setSettings] = useState<Settings>({
    agentAModel: 'gpt-5.1',
    agentBModel: 'gpt-4o-mini',
    agentCModel: 'gpt-5.1',
  })

  useEffect(() => {
    fetchProfiles()
    fetchSettings()
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

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
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

  function startEditProfile() {
    const profile = profiles.find(p => p.id === selectedProfileId)
    if (profile) {
      setEditProfileName(profile.name)
      setEditProfileContent(profile.content)
      setEditingProfile(true)
      setShowNewProfile(false)
    }
  }

  function cancelEditProfile() {
    setEditingProfile(false)
    setEditProfileName('')
    setEditProfileContent('')
  }

  async function handleUpdateProfile() {
    if (!editProfileName.trim() || !editProfileContent.trim()) {
      setError('Profile name and content are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProfileId,
          name: editProfileName,
          content: editProfileContent,
        }),
      })

      const data = await res.json()
      if (data.success) {
        // Update the profile in the list
        setProfiles(profiles.map(p =>
          p.id === selectedProfileId ? data.data : p
        ))
        setEditingProfile(false)
        setEditProfileName('')
        setEditProfileContent('')
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('Failed to update profile')
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

  // Parse transcript from text input
  function parseTranscript(text: string): TranscriptEntry[] | null {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed
      }
      return null
    } catch {
      // Parse as plain text format:
      // Agent A: message
      // User: message
      const lines = text.split('\n')
      const entries: TranscriptEntry[] = []
      let currentRole: 'agentA' | 'user' | null = null
      let currentContent = ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const agentAMatch = trimmed.match(/^(Agent A|AgentA|Interviewer|A):\s*(.*)$/i)
        const userMatch = trimmed.match(/^(User|Human|Customer|Client|B):\s*(.*)$/i)

        if (agentAMatch) {
          // Save previous entry
          if (currentRole && currentContent) {
            entries.push({
              role: currentRole,
              content: currentContent.trim(),
              timestamp: new Date().toISOString(),
            })
          }
          currentRole = 'agentA'
          currentContent = agentAMatch[2]
        } else if (userMatch) {
          // Save previous entry
          if (currentRole && currentContent) {
            entries.push({
              role: currentRole,
              content: currentContent.trim(),
              timestamp: new Date().toISOString(),
            })
          }
          currentRole = 'user'
          currentContent = userMatch[2]
        } else if (currentRole) {
          // Continue current message
          currentContent += '\n' + trimmed
        }
      }

      // Save last entry
      if (currentRole && currentContent) {
        entries.push({
          role: currentRole,
          content: currentContent.trim(),
          timestamp: new Date().toISOString(),
        })
      }

      return entries.length > 0 ? entries : null
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setFileError('')
    setUploadedFile(file)
    setUploadedTranscript(null)

    // Check file type
    const validTypes = ['.json', '.txt', '.csv']
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!validTypes.includes(fileExt)) {
      setFileError('Please upload a .json, .txt, or .csv file')
      setUploadedFile(null)
      return
    }

    try {
      const text = await file.text()
      const transcript = parseTranscript(text)

      if (!transcript || transcript.length === 0) {
        setFileError('Could not parse transcript from file. Use JSON format or "Agent A: message" / "User: message" format.')
        setUploadedFile(null)
        return
      }

      setUploadedTranscript(transcript)
    } catch (err) {
      setFileError('Failed to read file')
      setUploadedFile(null)
    }
  }

  function clearUploadedFile() {
    setUploadedFile(null)
    setUploadedTranscript(null)
    setFileError('')
  }

  async function handleStartRun() {
    // Handle transcript mode separately
    if (mode === 'transcript') {
      if (!uploadInitialQuestion.trim()) {
        setError('Please enter the initial question that started the conversation')
        return
      }

      if (!uploadedTranscript || uploadedTranscript.length === 0) {
        setError('Please upload a transcript file to evaluate')
        return
      }

      setLoading(true)
      setError('')

      try {
        const res = await fetch('/api/runs/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initialQuestion: uploadInitialQuestion.trim(),
            taskTopic: uploadTaskTopic.trim() || undefined,
            transcript: uploadedTranscript,
          }),
        })

        const data = await res.json()
        if (data.success) {
          router.push(`/runs/${data.data.runId}`)
        } else {
          setError(data.error || 'Failed to upload and evaluate transcript')
        }
      } catch (err) {
        setError('Failed to upload and evaluate transcript')
      } finally {
        setLoading(false)
      }
      return
    }

    // Human and Simulation modes
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
          taskTopic: taskTopic.trim() || undefined,
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
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Start New Evaluation</h1>
        <p className="page-description">Configure and run an agent evaluation session</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mode Selection */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Evaluation Mode
              </h2>
            </div>
            <div className="card-body">
              <div className="grid sm:grid-cols-3 gap-4">
                <label
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    mode === 'human'
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="human"
                    checked={mode === 'human'}
                    onChange={() => setMode('human')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'human' ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                      <svg className={`w-5 h-5 ${mode === 'human' ? 'text-white' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-slate-900">Human Mode</span>
                  </div>
                  <p className="text-sm text-slate-600">You respond to the interviewer agent in real-time</p>
                </label>

                <label
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    mode === 'simulation'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="simulation"
                    checked={mode === 'simulation'}
                    onChange={() => setMode('simulation')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'simulation' ? 'bg-purple-600' : 'bg-slate-200'}`}>
                      <svg className={`w-5 h-5 ${mode === 'simulation' ? 'text-white' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-slate-900">Simulation Mode</span>
                  </div>
                  <p className="text-sm text-slate-600">Automated persona responds based on profile</p>
                </label>

                <label
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    mode === 'transcript'
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="transcript"
                    checked={mode === 'transcript'}
                    onChange={() => setMode('transcript')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'transcript' ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                      <svg className={`w-5 h-5 ${mode === 'transcript' ? 'text-white' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <span className="font-semibold text-slate-900">Transcript Mode</span>
                  </div>
                  <p className="text-sm text-slate-600">Evaluate an existing transcript from a real conversation</p>
                </label>
              </div>
            </div>
          </div>

          {/* Transcript Mode UI */}
          {mode === 'transcript' && (
            <>
              {/* Initial Question for Transcript */}
              <div className="card">
                <div className="card-header">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Initial Question
                  </h2>
                </div>
                <div className="card-body">
                  <input
                    type="text"
                    value={uploadInitialQuestion}
                    onChange={(e) => setUploadInitialQuestion(e.target.value)}
                    className="input"
                    placeholder="What was the initial question that started the conversation?"
                  />
                  <p className="input-hint mt-2">
                    Enter the first question Agent A asked to start the conversation.
                  </p>
                </div>
              </div>

              {/* Task Topic for Transcript */}
              <div className="card">
                <div className="card-header">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Task Topic
                    <span className="text-slate-400 font-normal text-sm">(optional)</span>
                  </h2>
                </div>
                <div className="card-body">
                  <input
                    type="text"
                    value={uploadTaskTopic}
                    onChange={(e) => setUploadTaskTopic(e.target.value)}
                    className="input"
                    placeholder="e.g., ideal partner preferences, deal-breakers..."
                  />
                </div>
              </div>

              {/* Transcript Upload */}
              <div className="card">
                <div className="card-header">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Transcript File
                  </h2>
                </div>
                <div className="card-body">
                  {!uploadedFile ? (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-emerald-400 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-2 text-sm text-slate-600">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-slate-500">.json, .txt, or .csv files</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".json,.txt,.csv"
                        onChange={handleFileUpload}
                      />
                    </label>
                  ) : (
                    <div className="space-y-4">
                      {/* File Info */}
                      <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{uploadedFile.name}</div>
                            <div className="text-sm text-slate-500">
                              {(uploadedFile.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={clearUploadedFile}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Parse Result */}
                      {uploadedTranscript && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium text-slate-900">
                              {uploadedTranscript.length} messages parsed
                            </span>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {uploadedTranscript.slice(0, 5).map((entry, idx) => (
                              <div key={idx} className="text-sm">
                                <span className={`font-medium ${entry.role === 'agentA' ? 'text-indigo-600' : 'text-purple-600'}`}>
                                  {entry.role === 'agentA' ? 'Agent A' : 'User'}:
                                </span>
                                <span className="text-slate-600 ml-2">
                                  {entry.content.length > 80 ? entry.content.slice(0, 80) + '...' : entry.content}
                                </span>
                              </div>
                            ))}
                            {uploadedTranscript.length > 5 && (
                              <div className="text-sm text-slate-400 italic">
                                ... and {uploadedTranscript.length - 5} more messages
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {fileError && (
                    <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {fileError}
                    </div>
                  )}

                  <p className="input-hint mt-3">
                    Supported formats: JSON array or plain text (Agent A: / User:)
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Initial Question (Human & Simulation modes) */}
          {mode !== 'transcript' && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Initial Question
                </h2>
              </div>
              <div className="card-body space-y-4">
                {/* Question Mode Toggle */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                  <button
                    onClick={() => setQuestionMode('sample')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      questionMode === 'sample'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sample Questions
                  </button>
                  <button
                    onClick={() => setQuestionMode('custom')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      questionMode === 'custom'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Custom Question
                  </button>
                </div>

                {/* Sample Question Selector */}
                {questionMode === 'sample' && (
                  <div className="space-y-3">
                    <select
                      value={selectedSampleQuestion}
                      onChange={(e) => setSelectedSampleQuestion(e.target.value)}
                      className="input"
                    >
                      <option value="">Select a question...</option>
                      {SAMPLE_QUESTIONS.map((category) => (
                        <optgroup key={category.category} label={`${category.icon} ${category.category}`}>
                          {category.questions.map((q, idx) => (
                            <option key={idx} value={q}>
                              {q}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {selectedSampleQuestion && (
                      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                        <p className="text-slate-700 italic">&ldquo;{selectedSampleQuestion}&rdquo;</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Question Input */}
                {questionMode === 'custom' && (
                  <textarea
                    value={initialQuestion}
                    onChange={(e) => setInitialQuestion(e.target.value)}
                    className="input min-h-[100px]"
                    placeholder="Enter the initial question the interviewer should ask..."
                  />
                )}
              </div>
            </div>
          )}

          {/* Task Topic (Human & Simulation modes) */}
          {mode !== 'transcript' && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Task Topic
                  <span className="text-slate-400 font-normal text-sm">(optional)</span>
                </h2>
              </div>
              <div className="card-body">
                <input
                  type="text"
                  value={taskTopic}
                  onChange={(e) => setTaskTopic(e.target.value)}
                  className="input"
                  placeholder="e.g., ideal partner preferences, deal-breakers, communication style..."
                />
                <p className="input-hint mt-2">
                  Focus the interview on a specific topic. If empty, the initial question defines the scope.
                </p>
              </div>
            </div>
          )}

          {/* Profile Selection (Simulation Mode) */}
          {mode === 'simulation' && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Persona Profile
                </h2>
                <button
                  onClick={() => setShowNewProfile(!showNewProfile)}
                  className="btn-ghost text-sm"
                >
                  {showNewProfile ? 'Cancel' : '+ New Profile'}
                </button>
              </div>
              <div className="card-body">
                {profilesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="spinner text-indigo-600"></div>
                  </div>
                ) : showNewProfile ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="input"
                      placeholder="Profile name (e.g., 'Tech Startup Founder')"
                    />
                    <textarea
                      value={newProfileContent}
                      onChange={(e) => setNewProfileContent(e.target.value)}
                      className="input min-h-[200px] font-mono text-sm"
                      placeholder="Profile content (JSON or YAML describing the persona)..."
                    />
                    <button
                      onClick={handleCreateProfile}
                      disabled={loading}
                      className="btn-success"
                    >
                      {loading ? 'Creating...' : 'Create Profile'}
                    </button>
                  </div>
                ) : editingProfile ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editProfileName}
                      onChange={(e) => setEditProfileName(e.target.value)}
                      className="input"
                      placeholder="Profile name"
                    />
                    <textarea
                      value={editProfileContent}
                      onChange={(e) => setEditProfileContent(e.target.value)}
                      className="input min-h-[200px] font-mono text-sm"
                      placeholder="Profile content..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateProfile}
                        disabled={loading}
                        className="btn-primary"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEditProfile}
                        disabled={loading}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="input"
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
                      <div className="mt-4 rounded-lg overflow-hidden border border-purple-200">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-white">
                            {profiles.find(p => p.id === selectedProfileId)?.name}
                          </span>
                          <button
                            onClick={startEditProfile}
                            className="text-white/80 hover:text-white transition-colors"
                            title="Edit profile"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                        <pre className="p-4 text-sm text-slate-700 bg-purple-50 overflow-auto max-h-64 whitespace-pre-wrap font-mono">
                          {profiles.find(p => p.id === selectedProfileId)?.content}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Max Turns (Simulation Mode) */}
          {mode === 'simulation' && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Max Turns
                </h2>
              </div>
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={maxTurns}
                    onChange={(e) => setMaxTurns(Math.max(2, Math.min(100, parseInt(e.target.value) || 2)))}
                    min={2}
                    max={100}
                    className="input w-24"
                  />
                  <span className="text-sm text-slate-500">
                    Conversation will stop after this many turns (2-100)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Start Button Card */}
          <div className={`card border-0 ${
            mode === 'transcript'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
          }`}>
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">
                {mode === 'transcript' ? 'Ready to Evaluate?' : 'Ready to Start?'}
              </h3>
              <p className="text-indigo-100 text-sm mb-6">
                {mode === 'human'
                  ? 'You\'ll interact with the interviewer in real-time'
                  : mode === 'simulation'
                  ? 'The simulation will run automatically'
                  : 'Agent C will analyze the transcript'}
              </p>
              <button
                onClick={handleStartRun}
                disabled={loading || (mode !== 'transcript' && !getQuestion()) || (mode === 'transcript' && (!uploadInitialQuestion.trim() || !uploadedTranscript))}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                  mode === 'transcript'
                    ? 'bg-white text-emerald-600 hover:bg-emerald-50'
                    : 'bg-white text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className={`spinner ${mode === 'transcript' ? 'text-emerald-600' : 'text-indigo-600'}`}></div>
                    {mode === 'transcript' ? 'Evaluating...' : 'Starting...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {mode === 'transcript' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {mode === 'transcript' ? 'Evaluate Transcript' : 'Start Evaluation'}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Agent Architecture */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-slate-900">Agent Architecture</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">A</div>
                <div>
                  <div className="text-sm font-medium text-slate-900">Interviewer</div>
                  <div className="text-xs text-slate-500">{settings.agentAModel}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">B</div>
                <div>
                  <div className="text-sm font-medium text-slate-900">Persona</div>
                  <div className="text-xs text-slate-500">{settings.agentBModel}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">C</div>
                <div>
                  <div className="text-sm font-medium text-slate-900">Evaluator</div>
                  <div className="text-xs text-slate-500">{settings.agentCModel}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Quick Tips
              </h3>
            </div>
            <div className="card-body">
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-indigo-500 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span><strong>Human Mode:</strong> Chat directly with Agent A</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-500 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span><strong>Simulation:</strong> Agent B auto-responds based on profile</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span><strong>Transcript:</strong> Evaluate existing conversations</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span><strong>Evaluation:</strong> Agent C scores conversation quality</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
