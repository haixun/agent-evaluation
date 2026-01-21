'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Run } from '@/types'

export default function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRuns()
  }, [])

  async function fetchRuns() {
    try {
      const res = await fetch('/api/runs')
      const data = await res.json()
      if (data.success) {
        setRuns(data.data)
      } else {
        setError(data.error || 'Failed to fetch runs')
      }
    } catch (err) {
      setError('Failed to fetch runs')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteRun(runId: string) {
    if (!confirm('Are you sure you want to delete this run?')) return

    try {
      const res = await fetch(`/api/runs?id=${runId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setRuns(runs.filter((r) => r.runId !== runId))
      } else {
        setError(data.error || 'Failed to delete run')
      }
    } catch (err) {
      setError('Failed to delete run')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner text-indigo-600"></div>
      </div>
    )
  }

  // Calculate stats
  const completedRuns = runs.filter(r => r.status === 'completed')
  const avgScore = completedRuns.length > 0
    ? (completedRuns.reduce((sum, r) => sum + (r.evaluation?.overallScore || 0), 0) / completedRuns.length).toFixed(1)
    : '-'
  const humanRuns = runs.filter(r => r.mode === 'human').length
  const simRuns = runs.filter(r => r.mode === 'simulation').length
  const uploadRuns = runs.filter(r => r.mode === 'upload').length

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Evaluation History</h1>
        <p className="page-description">View and manage your past evaluation runs</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-label">Total Runs</div>
          <div className="stat-value">{runs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Score</div>
          <div className="stat-value text-indigo-600">{avgScore}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Human Mode</div>
          <div className="stat-value text-indigo-600">{humanRuns}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Simulations</div>
          <div className="stat-value text-purple-600">{simRuns}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uploads</div>
          <div className="stat-value text-emerald-600">{uploadRuns}</div>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="card">
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No evaluation runs yet</h3>
            <p className="text-slate-500 mb-6">Start your first evaluation to see results here</p>
            <Link href="/" className="btn-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Evaluation
            </Link>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Initial Question
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {runs.map((run) => (
                  <tr key={run.runId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`badge ${
                          run.mode === 'human' ? 'badge-primary' :
                          run.mode === 'simulation' ? 'badge-purple' :
                          'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {run.mode === 'human' ? 'Human' : run.mode === 'simulation' ? 'Simulation' : 'Upload'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="text-sm text-slate-700 truncate max-w-xs"
                        title={run.initialQuestion}
                      >
                        {run.initialQuestion}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`badge ${
                          run.status === 'completed'
                            ? 'badge-primary'
                            : run.status === 'error'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {run.status === 'completed' ? 'Completed' : run.status === 'error' ? 'Error' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {run.evaluation ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-slate-900">
                            {run.evaluation.overallScore}
                          </span>
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                              style={{ width: `${run.evaluation.overallScore}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/runs/${run.runId}`}
                          className="btn-ghost text-xs py-1.5 px-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </Link>
                        <button
                          onClick={() => handleDeleteRun(run.runId)}
                          className="btn-ghost text-xs py-1.5 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
