'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { LeadDeskAgent, LeadDeskCampaign } from '@/lib/leaddesk'

const SENTIMENT_OPTIES = ['positief', 'negatief', 'neutraal']
const RESULTAAT_OPTIES = ['sale', 'geen sale', 'follow-up', 'onbekend']

type Props = {
  activeAgents: LeadDeskAgent[]
  inactiveAgents: LeadDeskAgent[]
  campaigns: LeadDeskCampaign[]
  countByAgent: Record<string, number>
}

export default function LeadDeskImport({ activeAgents, inactiveAgents, campaigns, countByAgent }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState<{ agent: LeadDeskAgent } | null>(null)

  // Upload form state
  const [bestand, setBestand] = useState<File | null>(null)
  const [titel, setTitel] = useState('')
  const [klantNaam, setKlantNaam] = useState('')
  const [campagne, setCampagne] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [resultaat, setResultaat] = useState('')
  const [notities, setNotities] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  function openModal(agent: LeadDeskAgent) {
    setModal({ agent })
    setBestand(null)
    setTitel('')
    setKlantNaam('')
    setCampagne('')
    setSentiment('')
    setResultaat('')
    setNotities('')
    setError('')
    setProgress(0)
  }

  function closeModal() {
    setModal(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!bestand || !titel.trim() || !modal) return

    setUploading(true)
    setProgress(15)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = bestand.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${ext}`

    setProgress(40)
    const { error: uploadError } = await supabase.storage
      .from('gesprekken-audio')
      .upload(filePath, bestand)

    if (uploadError) {
      setError('Upload mislukt: ' + uploadError.message)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(80)
    const notitiesText = [
      notities.trim(),
      campagne ? `Campagne: ${campagne}` : '',
      `LeadDesk agent: ${modal.agent.username}`,
    ].filter(Boolean).join('\n')

    const { error: dbError } = await supabase.from('gesprekken').insert({
      titel: titel.trim(),
      medewerker_naam: modal.agent.name,
      klant_naam: klantNaam.trim() || null,
      sentiment: sentiment || null,
      resultaat: resultaat || null,
      notities: notitiesText || null,
      bestand_pad: filePath,
      bestand_naam: bestand.name,
      bestand_grootte: bestand.size,
      user_id: user.id,
    })

    if (dbError) {
      setError('Opslaan mislukt: ' + dbError.message)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(100)
    closeModal()
    router.refresh()
  }

  const allAgents = showInactive ? [...activeAgents, ...inactiveAgents] : activeAgents

  return (
    <>
      {/* Agent list */}
      <div className="space-y-6">
        {/* Active agents */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Actieve medewerkers ({activeAgents.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                count={countByAgent[agent.name] ?? 0}
                onImport={() => openModal(agent)}
              />
            ))}
            {activeAgents.length === 0 && (
              <p className="text-gray-400 text-sm col-span-3">Geen actieve medewerkers gevonden</p>
            )}
          </div>
        </div>

        {/* Toggle inactive */}
        {inactiveAgents.length > 0 && (
          <div>
            <button
              onClick={() => setShowInactive(v => !v)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform ${showInactive ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              {showInactive ? 'Verberg' : 'Toon'} inactieve medewerkers ({inactiveAgents.length})
            </button>
            {showInactive && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                {inactiveAgents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    count={countByAgent[agent.name] ?? 0}
                    onImport={() => openModal(agent)}
                    inactive
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e8f5e9' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">Gesprek importeren</h2>
                  <p className="text-xs text-gray-400">{modal.agent.name}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* File picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Audiobestand <span className="text-red-400">*</span></label>
                <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setBestand(f)
                    if (!titel) setTitel(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
                  }}
                />
                {bestand ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
                      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                    <span className="text-sm text-gray-700 truncate flex-1">{bestand.name}</span>
                    <button type="button" onClick={() => setBestand(null)} className="text-gray-400 hover:text-red-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors">
                    Klik om audiobestand te selecteren
                  </button>
                )}
              </div>

              {/* Titel */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titel <span className="text-red-400">*</span></label>
                <input type="text" value={titel} onChange={e => setTitel(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none"
                  onFocus={e => e.target.style.borderColor = '#009900'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Klant + Campagne */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Klant</label>
                  <input type="text" value={klantNaam} onChange={e => setKlantNaam(e.target.value)} placeholder="Naam klant"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none"
                    onFocus={e => e.target.style.borderColor = '#009900'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Campagne</label>
                  <select value={campagne} onChange={e => setCampagne(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none bg-white"
                    onFocus={e => e.target.style.borderColor = '#009900'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">— Geen —</option>
                    {campaigns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sentiment</label>
                <div className="flex gap-2">
                  {SENTIMENT_OPTIES.map(s => (
                    <button key={s} type="button" onClick={() => setSentiment(sentiment === s ? '' : s)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${sentiment === s ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-green-300 bg-white'}`}
                      style={sentiment === s ? { background: '#009900' } : {}}>
                      {s === 'positief' ? '😊' : s === 'negatief' ? '😞' : '😐'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultaat */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resultaat</label>
                <div className="flex gap-2 flex-wrap">
                  {RESULTAAT_OPTIES.map(r => (
                    <button key={r} type="button" onClick={() => setResultaat(resultaat === r ? '' : r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${resultaat === r ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-green-300 bg-white'}`}
                      style={resultaat === r ? { background: r === 'sale' ? '#006600' : '#009900' } : {}}>
                      {r === 'sale' ? '✓ ' : ''}{r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notities */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notities</label>
                <textarea value={notities} onChange={e => setNotities(e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none resize-none"
                  onFocus={e => e.target.style.borderColor = '#009900'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Uploaden...</span><span>{progress}%</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: '#009900' }} />
                  </div>
                </div>
              )}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 text-sm">
                  Annuleren
                </button>
                <button type="submit" disabled={uploading} className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: '#009900' }}>
                  {uploading ? (
                    <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Bezig...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Importeren</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function AgentCard({ agent, count, onImport, inactive }: {
  agent: LeadDeskAgent
  count: number
  onImport: () => void
  inactive?: boolean
}) {
  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${inactive ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-green-200 hover:shadow-md'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
          style={{ background: inactive ? '#9ca3af' : '#009900' }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{agent.name}</p>
          <p className="text-xs text-gray-400 truncate">{agent.office ?? agent.username}</p>
        </div>
        {!inactive && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex-shrink-0">actief</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {count > 0 ? `${count} gesprek${count !== 1 ? 'ken' : ''}` : 'Geen gesprekken'}
        </span>
        <button
          onClick={onImport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#009900' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            <path d="M5 21h14"/>
          </svg>
          Importeer
        </button>
      </div>
    </div>
  )
}
