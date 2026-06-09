'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const SENTIMENT_OPTIES = ['positief', 'negatief', 'neutraal']
const RESULTAAT_OPTIES = ['sale', 'geen sale', 'follow-up', 'onbekend']

export default function NieuwGesprekPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [titel, setTitel] = useState('')
  const [medewerkerNaam, setMedewerkerNaam] = useState('')
  const [klantNaam, setKlantNaam] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [resultaat, setResultaat] = useState('')
  const [notities, setNotities] = useState('')
  const [bestand, setBestand] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [pageDragOver, setPageDragOver] = useState(false)
  const [zoneDragOver, setZoneDragOver] = useState(false)
  const dragCounter = useRef(0)

  // Full-page drag & drop listeners
  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      e.preventDefault()
      dragCounter.current++
      if (dragCounter.current === 1) setPageDragOver(true)
    }
    function onDragLeave(e: DragEvent) {
      e.preventDefault()
      dragCounter.current--
      if (dragCounter.current === 0) setPageDragOver(false)
    }
    function onDragOver(e: DragEvent) { e.preventDefault() }
    function onDrop(e: DragEvent) {
      e.preventDefault()
      dragCounter.current = 0
      setPageDragOver(false)
      setZoneDragOver(false)
      const file = e.dataTransfer?.files[0]
      if (file) handleFileChange(file)
    }
    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titel])

  const handleFileChange = useCallback((file: File | null) => {
    if (!file) return
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/mp4', 'video/mp4']
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|mp4)$/i)) {
      setError('Alleen audiobestanden zijn toegestaan (mp3, wav, ogg, m4a, aac)')
      return
    }
    setError('')
    setBestand(file)
    if (!titel) setTitel(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  }, [titel])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bestand) { setError('Selecteer een audiobestand'); return }
    if (!titel.trim()) { setError('Voer een titel in'); return }

    setUploading(true)
    setUploadProgress(10)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const ext = bestand.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${ext}`

    setUploadProgress(30)

    const { error: uploadError } = await supabase.storage
      .from('gesprekken-audio')
      .upload(filePath, bestand)

    if (uploadError) {
      setError('Fout bij het uploaden: ' + uploadError.message)
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(80)

    const { error: dbError } = await supabase.from('gesprekken').insert({
      titel: titel.trim(),
      medewerker_naam: medewerkerNaam.trim() || null,
      klant_naam: klantNaam.trim() || null,
      sentiment: sentiment || null,
      resultaat: resultaat || null,
      notities: notities.trim() || null,
      bestand_pad: filePath,
      bestand_naam: bestand.name,
      bestand_grootte: bestand.size,
      user_id: user.id,
    })

    if (dbError) {
      setError('Fout bij opslaan: ' + dbError.message)
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(100)
    router.push('/gesprekken')
    router.refresh()
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f9f5' }}>
      <Navbar />

      {/* Full-page drop overlay */}
      {pageDragOver && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
          style={{ background: 'rgba(0, 153, 0, 0.92)' }}
        >
          <div className="text-white text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 border-4 border-white border-dashed">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-3xl font-bold mb-2">Loslaten om te uploaden</p>
            <p className="text-green-200 text-lg">MP3 · WAV · OGG · M4A · AAC</p>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium mb-4 hover:opacity-75 transition-opacity"
            style={{ color: '#009900' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Terug
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Nieuw gesprek uploaden</h1>
          <p className="text-gray-500 mt-1">Upload een salesgesprek en voeg uw notities toe</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left column: audio + notes */}
            <div className="space-y-6">
              {/* Audio upload zone */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 pb-4">
                  <h2 className="font-semibold text-gray-800">Audiobestand</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Sleep een bestand op deze pagina of klik op het vak hieronder</p>
                </div>

                {/* Drop zone */}
                <div
                  className={`mx-6 mb-6 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer select-none ${
                    zoneDragOver
                      ? 'border-green-400 scale-[1.01]'
                      : bestand
                      ? 'border-green-300'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                  style={{
                    background: zoneDragOver ? '#f0fdf0' : bestand ? '#f0fdf4' : undefined,
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setZoneDragOver(true) }}
                  onDragLeave={(e) => { e.stopPropagation(); setZoneDragOver(false) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setZoneDragOver(false)
                    handleFileChange(e.dataTransfer.files[0])
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />

                  {bestand ? (
                    <div className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#dcfce7' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="2">
                          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{bestand.name}</p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {(bestand.size / 1024 / 1024).toFixed(1)} MB · {bestand.type || 'audio'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setBestand(null) }}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform"
                        style={{ background: zoneDragOver ? '#bbf7d0' : '#f0fdf4' }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#009900" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <p className="font-semibold text-gray-700 text-base">
                        {zoneDragOver ? 'Loslaten om te uploaden' : 'Sleep uw audiobestand hierheen'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">of klik om te bladeren</p>
                      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                        {['MP3', 'WAV', 'OGG', 'M4A', 'AAC'].map((fmt) => (
                          <span key={fmt} className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500">
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload progress bar */}
                {uploading && (
                  <div className="px-6 pb-6">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Uploaden...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${uploadProgress}%`, background: '#009900' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4">Notities & bijzonderheden</h2>
                <textarea
                  value={notities}
                  onChange={(e) => setNotities(e.target.value)}
                  rows={8}
                  placeholder="Beschrijf bijzonderheden van het gesprek...

Bijvoorbeeld: Dit was een gesprek waarbij de klant aanvankelijk ontevreden was over de huidige provider. Halverwege het gesprek merkten we dat de klant openstond voor ons aanbod en hebben we succesvol kunnen omzetten naar een sale."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none text-gray-800 text-sm resize-none leading-relaxed"
                  onFocus={(e) => e.target.style.borderColor = '#009900'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Right column: details */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                <h2 className="font-semibold text-gray-800">Details</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Titel <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={titel}
                    onChange={(e) => setTitel(e.target.value)}
                    required
                    placeholder="bijv. Gesprek Telecom Plus - Jan de Vries"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none text-gray-800 transition-all text-sm"
                    onFocus={(e) => e.target.style.borderColor = '#009900'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Medewerker</label>
                    <input
                      type="text"
                      value={medewerkerNaam}
                      onChange={(e) => setMedewerkerNaam(e.target.value)}
                      placeholder="Naam medewerker"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none text-gray-800 text-sm"
                      onFocus={(e) => e.target.style.borderColor = '#009900'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Klant</label>
                    <input
                      type="text"
                      value={klantNaam}
                      onChange={(e) => setKlantNaam(e.target.value)}
                      placeholder="Naam klant"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none text-gray-800 text-sm"
                      onFocus={(e) => e.target.style.borderColor = '#009900'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>

                {/* Sentiment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sentiment tijdens gesprek</label>
                  <div className="flex gap-2 flex-wrap">
                    {SENTIMENT_OPTIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSentiment(sentiment === s ? '' : s)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                          sentiment === s
                            ? 'text-white border-transparent'
                            : 'text-gray-600 border-gray-200 hover:border-green-300 bg-white'
                        }`}
                        style={sentiment === s ? { background: '#009900', borderColor: '#009900' } : {}}
                      >
                        {s === 'positief' ? '😊' : s === 'negatief' ? '😞' : '😐'} {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resultaat */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Resultaat</label>
                  <div className="flex gap-2 flex-wrap">
                    {RESULTAAT_OPTIES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setResultaat(resultaat === r ? '' : r)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                          resultaat === r
                            ? 'text-white border-transparent'
                            : 'text-gray-600 border-gray-200 hover:border-green-300 bg-white'
                        }`}
                        style={resultaat === r ? { background: r === 'sale' ? '#006600' : '#009900', borderColor: '#009900' } : {}}
                      >
                        {r === 'sale' ? '✓ ' : ''}{r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 py-3 px-6 rounded-xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-3 px-6 rounded-xl font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#009900' }}
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Uploaden... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Gesprek opslaan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
