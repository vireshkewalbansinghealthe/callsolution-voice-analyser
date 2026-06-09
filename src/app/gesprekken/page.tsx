import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import DashboardDropUpload from '@/components/DashboardDropUpload'
import GesprekkenClient from '@/components/GesprekkenClient'

export default async function GesprekkenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: gesprekken } = await supabase
    .from('gesprekken')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen" style={{ background: '#f5f9f5' }}>
      <Navbar userEmail={user.email} />
      <DashboardDropUpload />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gesprekken</h1>
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

        {gesprekken && gesprekken.length > 0 ? (
          <GesprekkenClient gesprekken={gesprekken} />
        ) : (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#e8f5e9' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nog geen gesprekken</h3>
            <p className="text-gray-400 mb-6">Begin met het uploaden van uw eerste salesgesprek</p>
            <Link
              href="/gesprekken/nieuw"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#009900' }}
            >
              Eerste gesprek uploaden
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
