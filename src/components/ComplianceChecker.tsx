'use client'

import { useState } from 'react'
import type { ComplianceItem, ComplianceResult } from '@/app/api/gesprekken/[id]/compliance/route'

type Props = {
  gesprekId: string
  initialResult?: ComplianceResult | null
}

const PHASES = [
  { label: 'Audio ophalen...', icon: '🎵' },
  { label: 'Transcriberen...', icon: '📝' },
  { label: 'Analyseren...', icon: '🔍' },
]

export default function ComplianceChecker({ gesprekId, initialResult }: Props) {
  const [result, setResult] = useState<ComplianceResult | null>(initialResult ?? null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState(0)
  const [error, setError] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)

  async function runCheck() {
    setLoading(true)
    setError('')
    setPhase(0)

    const timer = setInterval(() => {
      setPhase(p => (p < PHASES.length - 1 ? p + 1 : p))
    }, 9000)

    try {
      const res = await fetch(`/api/gesprekken/${gesprekId}/compliance`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analyse mislukt')
      setResult(data)
    } catch (err) {
      setError(String(err))
    } finally {
      clearInterval(timer)
      setLoading(false)
      setPhase(0)
    }
  }

  const passed = result?.items.filter(i => i.passed).length ?? 0
  const total = result?.items.length ?? 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e8f5e9' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Compliance Checker</h2>
            <p className="text-xs text-gray-400">ACM & kwalificatie controle</p>
          </div>
        </div>

        {result && !loading && (
          <div
            className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white font-bold shadow-sm flex-shrink-0"
            style={{ background: result.score >= 80 ? '#009900' : result.score >= 60 ? '#f97316' : '#ef4444' }}
          >
            <span className="text-xl leading-none">{result.score}</span>
            <span className="text-xs opacity-80">/100</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-8">
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-16 h-16">
              <svg className="animate-spin w-16 h-16" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="26" stroke="#e8f5e9" strokeWidth="6"/>
                <path d="M32 6a26 26 0 0126 26" stroke="#009900" strokeWidth="6" strokeLinecap="round"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl">
                {PHASES[phase].icon}
              </span>
            </div>

            <div className="text-center w-full max-w-xs">
              <p className="font-semibold text-gray-700 mb-3">{PHASES[phase].label}</p>
              <div className="flex gap-2">
                {PHASES.map((p2, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`h-1.5 w-full rounded-full transition-all duration-700 ${
                        i < phase ? 'opacity-100' : i === phase ? 'opacity-100' : 'opacity-30'
                      }`}
                      style={{ background: i <= phase ? '#009900' : '#d1d5db' }}
                    />
                    <span className={`text-xs ${i <= phase ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                      {p2.label.replace('...', '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-2.5">
          {/* Stats bar */}
          <div className="flex items-center gap-3 p-3 rounded-xl mb-1" style={{ background: '#f5f9f5' }}>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(passed / total) * 100}%`, background: '#009900' }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
              {passed}/{total} vinkjes
            </span>
          </div>

          {result.items.map(item => (
            <ComplianceRow key={item.id} item={item} />
          ))}

          {/* Summary */}
          {result.samenvatting && (
            <div className="mt-2 p-4 rounded-xl text-sm text-gray-600" style={{ background: '#f5f9f5' }}>
              <p className="font-semibold text-gray-700 mb-1 text-xs uppercase tracking-wide">Samenvatting</p>
              <p className="leading-relaxed">{result.samenvatting}</p>
            </div>
          )}

          {/* Transcript */}
          {result.transcript && (
            <div>
              <button
                onClick={() => setShowTranscript(s => !s)}
                className="flex items-center gap-1.5 text-xs font-medium mt-1 hover:opacity-75 transition-opacity"
                style={{ color: '#009900' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                {showTranscript ? 'Verberg transcript' : 'Bekijk transcript'}
              </button>
              {showTranscript && (
                <div className="mt-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-600 leading-relaxed max-h-56 overflow-y-auto border border-gray-100 whitespace-pre-wrap">
                  {result.transcript}
                </div>
              )}
            </div>
          )}

          <button
            onClick={runCheck}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mt-1"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Opnieuw analyseren
          </button>
        </div>
      )}

      {/* Start button */}
      {!result && !loading && (
        <button
          onClick={runCheck}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          style={{ background: '#009900' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          Start compliance analyse
        </button>
      )}
    </div>
  )
}

function ComplianceRow({ item }: { item: ComplianceItem }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className={`rounded-xl border px-4 py-3 cursor-pointer transition-all ${
        item.passed
          ? 'border-green-200 bg-green-50 hover:bg-green-100'
          : 'border-red-200 bg-red-50 hover:bg-red-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          item.passed ? 'bg-green-500' : 'bg-red-400'
        }`}>
          {item.passed ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${item.passed ? 'text-green-800' : 'text-red-800'}`}>
            {item.label}
          </p>
          {!open && (
            <p className={`text-xs mt-0.5 truncate ${item.passed ? 'text-green-600' : 'text-red-500'}`}>
              {item.note}
            </p>
          )}
        </div>

        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <p className={`text-xs leading-relaxed ${item.passed ? 'text-green-700' : 'text-red-600'}`}>
            {item.note}
          </p>
          {item.evidence && (
            <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 italic">
              "{item.evidence}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
