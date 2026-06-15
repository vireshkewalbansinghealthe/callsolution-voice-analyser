import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import AudioPlayer from '@/components/AudioPlayer'
import NotitiesEditor from '@/components/NotitiesEditor'
import ComplianceChecker from '@/components/ComplianceChecker'

export default async function GesprekDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: gesprek } = await supabase
    .from('gesprekken')
    .select('*')
    .eq('id', id)
    .single()

  if (!gesprek) notFound()

  // Get signed URL for audio
  let audioUrl: string | null = null
  if (gesprek.bestand_pad) {
    const { data } = await supabase.storage
      .from('gesprekken-audio')
      .createSignedUrl(gesprek.bestand_pad, 3600)
    audioUrl = data?.signedUrl ?? null
  }

  const sentimentColors: Record<string, string> = {
    positief: 'text-green-700 bg-green-100',
    negatief: 'text-red-700 bg-red-100',
    neutraal: 'text-gray-600 bg-gray-100',
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f9f5' }}>
      <Navbar userEmail={user.email} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Back + header */}
        <div className="mb-6">
          <Link
            href="/gesprekken"
            className="flex items-center gap-2 text-sm font-medium mb-4 hover:opacity-75 transition-opacity"
            style={{ color: '#009900' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Alle gesprekken
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{gesprek.titel}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {gesprek.medewerker_naam && (
                  <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {gesprek.medewerker_naam}
                  </span>
                )}
                {gesprek.klant_naam && (
                  <span className="text-sm text-gray-500">Klant: {gesprek.klant_naam}</span>
                )}
                <span className="text-sm text-gray-400">
                  {new Date(gesprek.created_at).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
              {gesprek.sentiment && (
                <span className={`text-sm px-3 py-1.5 rounded-xl font-medium ${sentimentColors[gesprek.sentiment] ?? 'bg-gray-100 text-gray-500'}`}>
                  {gesprek.sentiment === 'positief' ? '😊' : gesprek.sentiment === 'negatief' ? '😞' : '😐'} {gesprek.sentiment}
                </span>
              )}
              {gesprek.resultaat && (
                <span className={`text-sm px-3 py-1.5 rounded-xl font-medium ${gesprek.resultaat === 'sale' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {gesprek.resultaat === 'sale' ? '✓ Sale' : gesprek.resultaat}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Audio player */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e8f5e9' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Opname afspelen</h2>
                {gesprek.bestand_naam && (
                  <p className="text-xs text-gray-400">{gesprek.bestand_naam} · {gesprek.bestand_grootte ? `${(gesprek.bestand_grootte / 1024 / 1024).toFixed(1)} MB` : ''}</p>
                )}
              </div>
            </div>

            {audioUrl ? (
              <AudioPlayer url={audioUrl} />
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
                Audiobestand niet beschikbaar
              </div>
            )}
          </div>

          {/* Compliance Checker */}
          <ComplianceChecker
            gesprekId={gesprek.id}
            initialResult={gesprek.compliance_resultaten ?? null}
          />

          {/* Notes */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e8f5e9' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h2 className="font-semibold text-gray-800">Notities & bijzonderheden</h2>
            </div>
            <NotitiesEditor gesprekId={gesprek.id} initieleNotities={gesprek.notities ?? ''} />
          </div>

          {/* Meta info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Informatie</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Medewerker', value: gesprek.medewerker_naam ?? '—' },
                { label: 'Klant', value: gesprek.klant_naam ?? '—' },
                { label: 'Sentiment', value: gesprek.sentiment ?? '—' },
                { label: 'Resultaat', value: gesprek.resultaat ?? '—' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl" style={{ background: '#f5f9f5' }}>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-1 capitalize">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
