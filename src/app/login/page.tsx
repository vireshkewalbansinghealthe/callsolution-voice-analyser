'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Ongeldig e-mailadres of wachtwoord.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #006600 0%, #009900 50%, #00bb00 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md">
          <div className="mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://callsolution.nl/wp-content/uploads/2023/03/Untitled-design-4-300x150.png"
              alt="CallSolution"
              className="h-14 w-auto object-contain brightness-0 invert"
            />
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Analyseer uw<br />verkoopgesprekken
          </h2>
          <p className="text-green-100 text-lg leading-relaxed">
            Upload, beluister en annoteer salesgesprekken. Ontdek patronen en verbeter de conversie van uw team.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: 'Gesprekken', value: '2.4k+' },
              { label: 'Medewerkers', value: '48' },
              { label: 'Conversie', value: '+23%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-green-200 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://callsolution.nl/wp-content/uploads/2023/03/Untitled-design-4-300x150.png"
              alt="CallSolution"
              className="h-10 w-auto object-contain"
            />
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welkom terug</h2>
          <p className="text-gray-500 mb-8">Log in met uw bedrijfsaccount</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="naam@bedrijf.nl"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-gray-800 transition-all"
                style={{ '--tw-ring-color': '#009900' } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = '#009900'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-gray-800 transition-all"
                onFocus={(e) => e.target.style.borderColor = '#009900'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-60"
              style={{ background: loading ? '#006600' : '#009900' }}
              onMouseEnter={(e) => !loading && ((e.target as HTMLElement).style.background = '#007700')}
              onMouseLeave={(e) => !loading && ((e.target as HTMLElement).style.background = '#009900')}
            >
              {loading ? 'Bezig met inloggen...' : 'Inloggen'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} CallSolution · Alle rechten voorbehouden
          </p>
        </div>
      </div>
    </div>
  )
}
