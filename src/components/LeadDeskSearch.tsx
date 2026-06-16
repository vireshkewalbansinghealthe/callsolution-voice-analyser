'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { LeadDeskCampaign, LeadDeskRecording } from '@/lib/leaddesk'

const SENTIMENT_OPTIES = ['positief', 'negatief', 'neutraal']
const RESULTAAT_OPTIES = ['sale', 'geen sale', 'follow-up', 'onbekend']

const COMPLIANCE_PHASES = ['Audio ophalen…', 'Transcriberen…', 'Analyseren…']

type ComplianceItem = { id: string; label: string; passed: boolean; evidence: string | null; note: string }
type ComplianceResult = { score: number; items: ComplianceItem[]; samenvatting: string; transcript: string }

type Props = {
  campaigns: LeadDeskCampaign[]
}

type ImportState = {
  titel: string
  medewerker: string
  sentiment: string
  resultaat: string
  campagne: string
  notities: string
  busy: boolean
  error: string
}

export default function LeadDeskSearch({ campaigns }: Props) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [recordings, setRecordings] = useState<LeadDeskRecording[] | null>(null)
  const [searchError, setSearchError] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [importMap, setImportMap] = useState<Record<number, ImportState>>({})
  const [successIdx, setSuccessIdx] = useState<number | null>(null)
  const [complianceMap, setComplianceMap] = useState<Record<number, ComplianceResult>>({})
  const [complianceLoadingIdx, setComplianceLoadingIdx] = useState<number | null>(null)
  const [compliancePhase, setCompliancePhase] = useState(0)
  const [complianceError, setComplianceError] = useState<Record<number, string>>({})

  async function runCompliance(idx: number, rec: LeadDeskRecording) {
    setComplianceLoadingIdx(idx)
    setCompliancePhase(0)
    setComplianceError(e => ({ ...e, [idx]: '' }))

    const timer = setInterval(() => {
      setCompliancePhase(p => (p < COMPLIANCE_PHASES.length - 1 ? p + 1 : p))
    }, 9000)

    try {
      const res = await fetch('/api/leaddesk/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rec: rec.call_recording }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analyse mislukt')
      setComplianceMap(m => ({ ...m, [idx]: data }))
    } catch (err) {
      setComplianceError(e => ({ ...e, [idx]: String(err) }))
    } finally {
      clearInterval(timer)
      setComplianceLoadingIdx(null)
      setCompliancePhase(0)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    setSearching(true)
    setRecordings(null)
    setSearchError('')
    setExpandedIdx(null)
    setImportMap({})
    setSuccessIdx(null)

    try {
      const res = await fetch(`/api/leaddesk/recordings?phone=${encodeURIComponent(phone.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Zoeken mislukt')
      setRecordings(data.recordings)
    } catch (err) {
      setSearchError(String(err))
    } finally {
      setSearching(false)
    }
  }

  function toggleExpand(idx: number, rec: LeadDeskRecording) {
    if (expandedIdx === idx) {
      setExpandedIdx(null)
      return
    }
    setExpandedIdx(idx)
    if (!importMap[idx]) {
      const d = new Date(rec.created_at)
      const dateStr = d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      setImportMap(m => ({
        ...m,
        [idx]: {
          titel: `Gesprek ${rec.phone_number ?? ''} – ${dateStr}`,
          medewerker: '',
          sentiment: '',
          resultaat: '',
          campagne: '',
          notities: rec.comment ?? '',
          busy: false,
          error: '',
        },
      }))
    }
  }

  function updateImport(idx: number, patch: Partial<ImportState>) {
    setImportMap(m => ({ ...m, [idx]: { ...m[idx], ...patch } }))
  }

  async function handleImport(idx: number, rec: LeadDeskRecording) {
    const imp = importMap[idx]
    if (!imp?.titel.trim()) return
    updateImport(idx, { busy: true, error: '' })

    try {
      const res = await fetch('/api/leaddesk/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_recording: rec.call_recording,
          titel: imp.titel.trim(),
          medewerker_naam: imp.medewerker.trim() || null,
          klant_naam: rec.phone_number ?? null,
          campagne: imp.campagne || null,
          sentiment: imp.sentiment || null,
          resultaat: imp.resultaat || null,
          notities: imp.notities.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Importeren mislukt')
      setSuccessIdx(idx)
      setExpandedIdx(null)
      router.refresh()
    } catch (err) {
      updateImport(idx, { error: String(err) })
    } finally {
      updateImport(idx, { busy: false })
    }
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Klantnummer bijv. +31612345678"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-800 text-sm shadow-sm focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !phone.trim()}
          className="px-6 py-3.5 rounded-2xl font-semibold text-white text-sm disabled:opacity-50 flex items-center gap-2 shadow-sm transition-opacity hover:opacity-90"
          style={{ background: '#009900' }}
        >
          {searching
            ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          }
          Zoeken
        </button>
      </form>

      {/* Error */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{searchError}</div>
      )}

      {/* Empty */}
      {recordings !== null && recordings.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <svg className="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <p className="font-medium">Geen opnames gevonden</p>
          <p className="text-xs mt-1">Controleer of gespreksopname is ingeschakeld in LeadDesk admin</p>
        </div>
      )}

      {/* Results */}
      {recordings !== null && recordings.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">
            {recordings.length} opname{recordings.length !== 1 ? 's' : ''} gevonden voor {phone}
          </p>
          <div className="space-y-3">
            {recordings.map((rec, idx) => {
              const imp = importMap[idx]
              const isExpanded = expandedIdx === idx
              const isSuccess = successIdx === idx
              const streamSrc = `/api/leaddesk/stream?rec=${encodeURIComponent(rec.call_recording)}`

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${
                    isSuccess ? 'border-green-300' : isExpanded ? 'border-green-400' : 'border-gray-100'
                  }`}
                >
                  {/* Row header */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Direction badge */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${rec.direction === 'in' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={rec.direction === 'in' ? '#3b82f6' : '#f97316'} strokeWidth="2">
                        {rec.direction === 'in'
                          ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                          : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
                        }
                      </svg>
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rec.direction === 'in' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {rec.direction === 'in' ? 'inkomend' : 'uitgaand'}
                        </span>
                        {rec.result && <span className="text-xs text-gray-400 truncate">{rec.result}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{rec.phone_number ?? '—'}</span>
                        {rec.duration && <span>· {rec.duration}</span>}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-sm font-medium text-gray-700">
                        {new Date(rec.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(rec.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSuccess ? (
                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Geïmporteerd
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleExpand(idx, rec)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isExpanded
                              ? 'bg-green-100 text-green-700'
                              : 'text-white hover:opacity-90'
                          }`}
                          style={isExpanded ? {} : { background: '#009900' }}
                        >
                          {isExpanded ? (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Sluiten</>
                          ) : (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M5 21h14"/></svg>Openen</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded: player + import form */}
                  {isExpanded && imp && (
                    <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                      {/* Audio player */}
                      <AudioPlayer src={streamSrc} />

                      {/* Compliance checker */}
                      <div className="bg-white rounded-xl border border-gray-200 p-3.5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#e8f5e9' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2.5">
                                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                              </svg>
                            </div>
                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Compliance</span>
                          </div>
                          {complianceMap[idx] && (
                            <div
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                              style={{ background: complianceMap[idx].score >= 80 ? '#009900' : complianceMap[idx].score >= 60 ? '#f97316' : '#ef4444' }}
                            >
                              {complianceMap[idx].score}/100
                            </div>
                          )}
                        </div>

                        {/* Loading */}
                        {complianceLoadingIdx === idx && (
                          <div className="py-3 text-center space-y-2">
                            <div className="flex justify-center gap-1.5">
                              {COMPLIANCE_PHASES.map((_, i) => (
                                <div key={i} className="h-1 rounded-full transition-all duration-500"
                                  style={{ width: i <= compliancePhase ? '28px' : '12px', background: i <= compliancePhase ? '#009900' : '#d1d5db' }} />
                              ))}
                            </div>
                            <p className="text-xs text-gray-500">{COMPLIANCE_PHASES[compliancePhase]}</p>
                          </div>
                        )}

                        {/* Error */}
                        {complianceError[idx] && complianceLoadingIdx !== idx && (
                          <p className="text-xs text-red-600 mb-2">{complianceError[idx]}</p>
                        )}

                        {/* Results */}
                        {complianceMap[idx] && complianceLoadingIdx !== idx && (
                          <div className="space-y-1.5">
                            {(complianceMap[idx].items ?? []).map(item => (
                              <div key={item.id} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg ${item.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${item.passed ? 'bg-green-500' : 'bg-red-400'}`}>
                                  {item.passed ? (
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                                  ) : (
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  )}
                                </div>
                                <span className={`text-xs font-medium flex-1 ${item.passed ? 'text-green-800' : 'text-red-700'}`}>{item.label}</span>
                              </div>
                            ))}
                            {complianceMap[idx].samenvatting && (
                              <p className="text-xs text-gray-500 pt-1 leading-relaxed">{complianceMap[idx].samenvatting}</p>
                            )}
                            <button
                              onClick={() => runCompliance(idx, rec)}
                              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 pt-0.5"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                              </svg>
                              Opnieuw
                            </button>
                          </div>
                        )}

                        {/* Start button */}
                        {!complianceMap[idx] && complianceLoadingIdx !== idx && (
                          <button
                            onClick={() => runCompliance(idx, rec)}
                            className="w-full py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                            style={{ background: '#009900' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                            </svg>
                            Compliance check uitvoeren
                          </button>
                        )}
                      </div>

                      {/* Import form */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Importeer als gesprek</p>

                        {/* Titel */}
                        <input
                          type="text"
                          value={imp.titel}
                          onChange={e => updateImport(idx, { titel: e.target.value })}
                          placeholder="Titel *"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-green-500"
                        />

                        {/* Medewerker + Campagne */}
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={imp.medewerker}
                            onChange={e => updateImport(idx, { medewerker: e.target.value })}
                            placeholder="Medewerker"
                            className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-green-500"
                          />
                          <select
                            value={imp.campagne}
                            onChange={e => updateImport(idx, { campagne: e.target.value })}
                            className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-green-500"
                          >
                            <option value="">— Campagne —</option>
                            {campaigns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>

                        {/* Sentiment */}
                        <div className="flex gap-2">
                          {SENTIMENT_OPTIES.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => updateImport(idx, { sentiment: imp.sentiment === s ? '' : s })}
                              className={`flex-1 py-2 rounded-xl text-sm border transition-all ${imp.sentiment === s ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 bg-white hover:border-green-300'}`}
                              style={imp.sentiment === s ? { background: '#009900' } : {}}
                            >
                              {s === 'positief' ? '😊' : s === 'negatief' ? '😞' : '😐'}
                            </button>
                          ))}
                        </div>

                        {/* Resultaat */}
                        <div className="flex gap-2 flex-wrap">
                          {RESULTAAT_OPTIES.map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => updateImport(idx, { resultaat: imp.resultaat === r ? '' : r })}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${imp.resultaat === r ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 bg-white hover:border-green-300'}`}
                              style={imp.resultaat === r ? { background: r === 'sale' ? '#006600' : '#009900' } : {}}
                            >
                              {r === 'sale' ? '✓ ' : ''}{r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                          ))}
                        </div>

                        {/* Notities */}
                        <textarea
                          value={imp.notities}
                          onChange={e => updateImport(idx, { notities: e.target.value })}
                          placeholder="Notities (optioneel)"
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:border-green-500 resize-none"
                        />

                        {imp.error && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{imp.error}</div>
                        )}

                        <button
                          onClick={() => handleImport(idx, rec)}
                          disabled={imp.busy || !imp.titel.trim()}
                          className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                          style={{ background: '#009900' }}
                        >
                          {imp.busy ? (
                            <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Downloaden &amp; importeren...</>
                          ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Importeer uit LeadDesk</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Custom audio player ────────────────────────────────────────────────────

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(false)

  // Stop when src changes (different recording opened)
  useEffect(() => {
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
  }, [src])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      setLoading(true)
      audio.play().then(() => { setPlaying(true); setLoading(false) }).catch(() => setLoading(false))
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const t = (Number(e.target.value) / 100) * duration
    audio.currentTime = t
    setCurrentTime(t)
    setProgress(Number(e.target.value))
  }

  function fmt(s: number) {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={() => {
          const a = audioRef.current
          if (!a || !a.duration) return
          setCurrentTime(a.currentTime)
          setProgress((a.currentTime / a.duration) * 100)
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0) }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
      />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 hover:opacity-90 transition-opacity"
        style={{ background: '#009900' }}
      >
        {loading ? (
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        ) : playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )}
      </button>

      {/* Progress bar */}
      <div className="flex-1">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSeek}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200"
          style={{ accentColor: '#009900' }}
        />
      </div>

      {/* Time */}
      <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums">
        {fmt(currentTime)}&nbsp;/&nbsp;{fmt(duration)}
      </span>
    </div>
  )
}
