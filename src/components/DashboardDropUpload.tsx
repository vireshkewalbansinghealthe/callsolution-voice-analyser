'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const SENTIMENT_OPTIES = ['positief', 'negatief', 'neutraal']
const RESULTAAT_OPTIES = ['sale', 'geen sale', 'follow-up', 'onbekend']

export default function DashboardDropUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const [pageDragOver, setPageDragOver] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [bestand, setBestand] = useState<File | null>(null)
  const [titel, setTitel] = useState('')
  const [medewerkerNaam, setMedewerkerNaam] = useState('')
  const [klantNaam, setKlantNaam] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [resultaat, setResultaat] = useState('')
  const [notities, setNotities] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')

  const openFile = useCallback((file: File) => {
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/mp4']
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|mp4)$/i)) return
    setBestand(file)
    setTitel(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
    setModalOpen(true)
  }, [])

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
      const file = e.dataTransfer?.files[0]
      if (file) openFile(file)
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
  }, [openFile])

  function closeModal() {
    setModalOpen(false)
    setBestand(null)
    setTitel('')
    setMedewerkerNaam('')
    setKlantNaam('')
    setSentiment('')
    setResultaat('')
    setNotities('')
    setError('')
    setUploadProgress(0)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!bestand || !titel.trim()) return

    setUploading(true)
    setUploadProgress(15)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const ext = bestand.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${ext}`

    setUploadProgress(40)
    const { error: uploadError } = await supabase.storage
      .from('gesprekken-audio')
      .upload(filePath, bestand)

    if (uploadError) {
      setError('Upload mislukt: ' + uploadError.message)
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
      setError('Opslaan mislukt: ' + dbError.message)
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(100)
    closeModal()
    router.refresh()
  }

  return (
    <>
      {/* Hidden file input for click-to-upload fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f) }}
      />

      {/* Full-page drag overlay */}
      {pageDragOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
          style={{ background: 'rgba(0,153,0,0.93)' }}>
          <div className="text-white text-center">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6 border-4 border-white border-dashed">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-4xl font-bold mb-3">Loslaten om te uploaden</p>
            <p className="text-green-200 text-xl">MP3 · WAV · OGG · M4A · AAC</p>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {modalOpen && (
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
                  <h2 className="font-bold text-gray-800">Gesprek uploaden</h2>
                  <p className="text-xs text-gray-400 truncate max-w-[220px]">{bestand?.name}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* Titel */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Titel <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={titel}
                  onChange={(e) => setTitel(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none"
                  onFocus={(e) => e.target.style.borderColor = '#009900'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Medewerker + Klant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Medewerker</label>
                  <input
                    type="text"
                    value={medewerkerNaam}
                    onChange={(e) => setMedewerkerNaam(e.target.value)}
                    placeholder="Naam"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none"
                    onFocus={(e) => e.target.style.borderColor = '#009900'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Klant</label>
                  <input
                    type="text"
                    value={klantNaam}
                    onChange={(e) => setKlantNaam(e.target.value)}
                    placeholder="Naam"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none"
                    onFocus={(e) => e.target.style.borderColor = '#009900'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sentiment</label>
                <div className="flex gap-2">
                  {SENTIMENT_OPTIES.map((s) => (
                    <button key={s} type="button"
                      onClick={() => setSentiment(sentiment === s ? '' : s)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                        sentiment === s ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-green-300 bg-white'
                      }`}
                      style={sentiment === s ? { background: '#009900' } : {}}
                    >
                      {s === 'positief' ? '😊' : s === 'negatief' ? '😞' : '😐'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultaat */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resultaat</label>
                <div className="flex gap-2 flex-wrap">
                  {RESULTAAT_OPTIES.map((r) => (
                    <button key={r} type="button"
                      onClick={() => setResultaat(resultaat === r ? '' : r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                        resultaat === r ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-green-300 bg-white'
                      }`}
                      style={resultaat === r ? { background: r === 'sale' ? '#006600' : '#009900' } : {}}
                    >
                      {r === 'sale' ? '✓ ' : ''}{r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notities */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notities</label>
                <textarea
                  value={notities}
                  onChange={(e) => setNotities(e.target.value)}
                  rows={3}
                  placeholder="Bijzonderheden over dit gesprek..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none resize-none"
                  onFocus={(e) => e.target.style.borderColor = '#009900'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Progress bar */}
              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Uploaden...</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${uploadProgress}%`, background: '#009900' }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors text-sm">
                  Annuleren
                </button>
                <button type="submit" disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: '#009900' }}>
                  {uploading ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Bezig...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Opslaan
                    </>
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
