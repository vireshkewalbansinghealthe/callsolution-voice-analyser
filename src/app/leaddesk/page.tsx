import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getAgents, getCampaigns } from '@/lib/leaddesk'
import LeadDeskImport from '@/components/LeadDeskImport'

export default async function LeadDeskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [agents, campaigns] = await Promise.all([
    getAgents().catch(() => []),
    getCampaigns().catch(() => []),
  ])

  // Get existing gesprekken counts per medewerker
  const { data: gesprekken } = await supabase
    .from('gesprekken')
    .select('medewerker_naam')

  const countByAgent: Record<string, number> = {}
  for (const g of gesprekken ?? []) {
    if (g.medewerker_naam) {
      countByAgent[g.medewerker_naam] = (countByAgent[g.medewerker_naam] ?? 0) + 1
    }
  }

  const activeAgents = agents.filter(a => a.employment === 'active')
  const inactiveAgents = agents.filter(a => a.employment !== 'active')

  return (
    <div className="min-h-screen" style={{ background: '#f5f9f5' }}>
      <Navbar userEmail={user.email} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e8f5e9' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.86 9.63 19.79 19.79 0 01.79 1a2 2 0 012-2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 6.37a16 16 0 006.29 6.29l.94-.94a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 13.92z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">LeadDesk Import</h1>
                <p className="text-sm text-gray-500">Verbonden · Client #{process.env.LEADDESK_ACCOUNT_ID}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="bg-white rounded-xl px-4 py-2.5 border border-gray-100 shadow-sm text-center">
              <p className="font-bold text-gray-800">{agents.length}</p>
              <p className="text-gray-400 text-xs">Medewerkers</p>
            </div>
            <div className="bg-white rounded-xl px-4 py-2.5 border border-gray-100 shadow-sm text-center">
              <p className="font-bold text-gray-800">{campaigns.length}</p>
              <p className="text-gray-400 text-xs">Campagnes</p>
            </div>
          </div>
        </div>

        <LeadDeskImport
          activeAgents={activeAgents}
          inactiveAgents={inactiveAgents}
          campaigns={campaigns}
          countByAgent={countByAgent}
        />
      </main>
    </div>
  )
}
