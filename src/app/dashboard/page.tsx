import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import DashboardDropUpload from '@/components/DashboardDropUpload'

type Gesprek = {
  id: string
  titel: string
  medewerker_naam: string | null
  klant_naam: string | null
  sentiment: string | null
  resultaat: string | null
  notities: string | null
  bestand_naam: string | null
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: gesprekken } = await supabase
    .from('gesprekken')
    .select('*')
    .order('created_at', { ascending: false })

  const sentimentBadge = (s: string | null) => {
    const map: Record<string, string> = {
      positief: 'bg-green-100 text-green-700',
      negatief: 'bg-red-100 text-red-700',
      neutraal: 'bg-gray-100 text-gray-600',
    }
    return map[s ?? ''] ?? 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f9f5' }}>
      <Navbar userEmail={user.email} />
      <DashboardDropUpload />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gesprekken</h1>
            <p className="text-gray-500 mt-1">{gesprekken?.length ?? 0} opgenomen gesprekken</p>
          </div>
          <Link
            href="/gesprekken/nieuw"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#009900' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nieuw gesprek
          </Link>
        </div>

        {/* Conversations list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {gesprekken && gesprekken.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {gesprekken.map((g: Gesprek) => (
                <Link
                  key={g.id}
                  href={`/gesprekken/${g.id}`}
                  className="flex items-start justify-between px-6 py-5 hover:bg-gray-50 transition-colors block"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#e8f5e9' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
                        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{g.titel}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {g.medewerker_naam && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                            {g.medewerker_naam}
                          </span>
                        )}
                        {g.klant_naam && (
                          <span className="text-xs text-gray-500">Klant: {g.klant_naam}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(g.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      {g.notities && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{g.notities}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                    {g.sentiment && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sentimentBadge(g.sentiment)}`}>
                        {g.sentiment === 'positief' ? '😊' : g.sentiment === 'negatief' ? '😞' : '😐'} {g.sentiment}
                      </span>
                    )}
                    {g.resultaat === 'sale' && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-600 text-white">
                        Sale ✓
                      </span>
                    )}
                    {g.resultaat && g.resultaat !== 'sale' && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                        {g.resultaat}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#e8f5e9' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="text-gray-600 font-semibold text-lg">Nog geen gesprekken</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">
                Sleep een audiobestand op het scherm of klik op de knop om te beginnen
              </p>
              <Link
                href="/gesprekken/nieuw"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#009900' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Eerste gesprek uploaden
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
