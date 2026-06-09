import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCampaigns } from '@/lib/leaddesk'
import LeadDeskSearch from '@/components/LeadDeskSearch'

export default async function ZoekenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const campaigns = await getCampaigns().catch(() => [])

  return (
    <div className="min-h-screen" style={{ background: '#f5f9f5' }}>
      <Navbar userEmail={user.email} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e8f5e9' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Opnames zoeken</h1>
            <p className="text-sm text-gray-500">Zoek, beluister en importeer LeadDesk opnames op klantnummer</p>
          </div>
        </div>

        <LeadDeskSearch campaigns={campaigns} />
      </main>
    </div>
  )
}
