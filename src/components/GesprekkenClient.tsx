'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Gesprek = {
  id: string
  titel: string
  medewerker_naam: string | null
  klant_naam: string | null
  sentiment: string | null
  resultaat: string | null
  notities: string | null
  bestand_naam: string | null
  duur_seconden: number | null
  created_at: string
}

function formatDuur(sec: number | null) {
  if (!sec) return null
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const SENTIMENT_BADGE: Record<string, { cls: string; label: string }> = {
  positief: { cls: 'bg-green-100 text-green-700', label: '😊 Positief' },
  negatief: { cls: 'bg-red-100 text-red-700', label: '😞 Negatief' },
  neutraal: { cls: 'bg-gray-100 text-gray-600', label: '😐 Neutraal' },
}

const RESULTAAT_BADGE: Record<string, { cls: string }> = {
  sale: { cls: 'bg-green-600 text-white' },
  'geen sale': { cls: 'bg-red-100 text-red-600' },
  'follow-up': { cls: 'bg-blue-100 text-blue-700' },
  onbekend: { cls: 'bg-gray-100 text-gray-500' },
}

const SORT_OPTIONS = [
  { value: 'datum_nieuw', label: 'Datum (nieuwste eerst)' },
  { value: 'datum_oud', label: 'Datum (oudste eerst)' },
  { value: 'titel_az', label: 'Titel (A–Z)' },
  { value: 'titel_za', label: 'Titel (Z–A)' },
]

export default function GesprekkenClient({ gesprekken }: { gesprekken: Gesprek[] }) {
  const [search, setSearch] = useState('')
  const [filterSentiment, setFilterSentiment] = useState<string[]>([])
  const [filterResultaat, setFilterResultaat] = useState<string[]>([])
  const [sort, setSort] = useState('datum_nieuw')
  const [view, setView] = useState<'list' | 'table'>('list')

  const filtered = useMemo(() => {
    let result = [...gesprekken]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(g =>
        g.titel.toLowerCase().includes(q) ||
        (g.medewerker_naam ?? '').toLowerCase().includes(q) ||
        (g.klant_naam ?? '').toLowerCase().includes(q) ||
        (g.notities ?? '').toLowerCase().includes(q)
      )
    }

    if (filterSentiment.length > 0) {
      result = result.filter(g => g.sentiment && filterSentiment.includes(g.sentiment))
    }

    if (filterResultaat.length > 0) {
      result = result.filter(g => g.resultaat && filterResultaat.includes(g.resultaat))
    }

    result.sort((a, b) => {
      if (sort === 'datum_nieuw') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'datum_oud') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'titel_az') return a.titel.localeCompare(b.titel, 'nl')
      if (sort === 'titel_za') return b.titel.localeCompare(a.titel, 'nl')
      return 0
    })

    return result
  }, [gesprekken, search, filterSentiment, filterResultaat, sort])

  function toggleFilter(list: string[], set: (v: string[]) => void, val: string) {
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
  }

  const sentimentOpties = ['positief', 'negatief', 'neutraal']
  const resultaatOpties = ['sale', 'geen sale', 'follow-up', 'onbekend']

  return (
    <div>
      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
        {/* Row 1: search + sort + view toggle */}
        <div className="flex gap-3 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Zoeken op titel, medewerker, klant..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-green-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-green-400 bg-white"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 transition-colors ${view === 'list' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={view === 'list' ? { background: '#009900' } : {}}
              title="Lijst weergave"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 transition-colors ${view === 'table' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={view === 'table' ? { background: '#009900' } : {}}
              title="Tabel weergave"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: filter chips */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filter:</span>
          {sentimentOpties.map(s => {
            const active = filterSentiment.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleFilter(filterSentiment, setFilterSentiment, s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                  active ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-green-300 bg-white'
                }`}
                style={active ? { background: '#009900' } : {}}
              >
                {s === 'positief' ? '😊' : s === 'negatief' ? '😞' : '😐'} {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          })}
          <span className="w-px h-4 bg-gray-200 mx-1" />
          {resultaatOpties.map(r => {
            const active = filterResultaat.includes(r)
            return (
              <button
                key={r}
                onClick={() => toggleFilter(filterResultaat, setFilterResultaat, r)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                  active ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-green-300 bg-white'
                }`}
                style={active ? { background: r === 'sale' ? '#006600' : '#009900' } : {}}
              >
                {r === 'sale' ? '✓ ' : ''}{r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            )
          })}
          {(filterSentiment.length > 0 || filterResultaat.length > 0 || search) && (
            <button
              onClick={() => { setFilterSentiment([]); setFilterResultaat([]); setSearch('') }}
              className="text-xs px-3 py-1.5 rounded-full text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Wissen
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 mb-3 px-1">
        {filtered.length} van {gesprekken.length} gesprekken
      </p>

      {/* List view */}
      {view === 'list' && (
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : filtered.map(g => {
            const badge = SENTIMENT_BADGE[g.sentiment ?? '']
            const rbadge = RESULTAAT_BADGE[g.resultaat ?? '']
            return (
              <Link
                key={g.id}
                href={`/gesprekken/${g.id}`}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8f5e9' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="1.5">
                        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{g.titel}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {g.medewerker_naam && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                            {g.medewerker_naam}
                          </span>
                        )}
                        {g.klant_naam && <span className="text-xs text-gray-500">Klant: {g.klant_naam}</span>}
                        <span className="text-xs text-gray-400">
                          {new Date(g.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {g.duur_seconden && (
                          <span className="text-xs text-gray-400">{formatDuur(g.duur_seconden)}</span>
                        )}
                      </div>
                      {g.notities && <p className="text-sm text-gray-500 mt-1.5 line-clamp-1">{g.notities}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {badge && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>}
                    {rbadge && g.resultaat && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${rbadge.cls}`}>
                        {g.resultaat === 'sale' ? '✓ Sale' : g.resultaat.charAt(0).toUpperCase() + g.resultaat.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Titel</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Medewerker</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Klant</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Datum</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sentiment</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Resultaat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(g => {
                    const badge = SENTIMENT_BADGE[g.sentiment ?? '']
                    const rbadge = RESULTAAT_BADGE[g.resultaat ?? '']
                    return (
                      <tr key={g.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/gesprekken/${g.id}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#e8f5e9' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="1.5">
                                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 max-w-xs truncate">{g.titel}</p>
                              {g.notities && <p className="text-xs text-gray-400 truncate max-w-xs">{g.notities}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600">{g.medewerker_naam ?? <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-4 text-gray-600">{g.klant_naam ?? <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                          {new Date(g.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-4">
                          {badge ? (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          {rbadge && g.resultaat ? (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${rbadge.cls}`}>
                              {g.resultaat === 'sale' ? '✓ Sale' : g.resultaat.charAt(0).toUpperCase() + g.resultaat.slice(1)}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
      <p className="text-gray-500 font-medium">Geen gesprekken gevonden</p>
      <p className="text-gray-400 text-sm mt-1">Pas de zoekopdracht of filters aan</p>
    </div>
  )
}
