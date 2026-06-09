'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NotitiesEditor({ gesprekId, initieleNotities }: { gesprekId: string; initieleNotities: string }) {
  const [notities, setNotities] = useState(initieleNotities)
  const [opgeslagen, setOpgeslagen] = useState(true)
  const [saving, setSaving] = useState(false)

  async function opslaan() {
    const supabase = createClient()
    setSaving(true)
    await supabase.from('gesprekken').update({ notities }).eq('id', gesprekId)
    setSaving(false)
    setOpgeslagen(true)
  }

  function onChange(val: string) {
    setNotities(val)
    setOpgeslagen(false)
  }

  return (
    <div>
      <textarea
        value={notities}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
        placeholder="Schrijf hier uw notities en bijzonderheden over dit gesprek...

Denk aan: de sfeer tijdens het gesprek, bezwaren van de klant, welke argumenten goed werkten, verbeterpunten voor de volgende keer."
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none text-gray-800 text-sm resize-none leading-relaxed transition-colors"
        onFocus={(e) => e.target.style.borderColor = '#009900'}
        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
      />
      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs font-medium ${opgeslagen ? 'text-green-600' : 'text-amber-500'}`}>
          {opgeslagen ? '✓ Opgeslagen' : '● Niet opgeslagen'}
        </span>
        <button
          onClick={opslaan}
          disabled={saving || opgeslagen}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: '#009900' }}
        >
          {saving ? 'Opslaan...' : 'Notities opslaan'}
        </button>
      </div>
    </div>
  )
}
