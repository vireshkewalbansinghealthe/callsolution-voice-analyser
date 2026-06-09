import { createClient } from '@/lib/supabase/server'
import { getRecordingDownloadUrl } from '@/lib/leaddesk'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { call_recording, titel, medewerker_naam, klant_naam, campagne, sentiment, resultaat, notities } = body

  if (!call_recording || !titel?.trim()) {
    return NextResponse.json({ error: 'call_recording en titel zijn verplicht' }, { status: 400 })
  }

  // 1. Resolve the signed download URL from LeadDesk
  let downloadUrl: string
  try {
    downloadUrl = await getRecordingDownloadUrl(call_recording)
  } catch (err) {
    return NextResponse.json({ error: `Kan opname niet ophalen: ${err}` }, { status: 502 })
  }

  // 2. Download the audio from LeadDesk
  const audioRes = await fetch(downloadUrl)
  if (!audioRes.ok) {
    return NextResponse.json(
      { error: `LeadDesk download mislukt (${audioRes.status})` },
      { status: 502 }
    )
  }

  const audioBuffer = await audioRes.arrayBuffer()

  // 3. Upload to Supabase Storage
  const filename = call_recording.startsWith('http')
    ? call_recording.split('/').pop()!
    : call_recording
  const filePath = `${user.id}/${Date.now()}-${filename.slice(-32)}`

  const { error: uploadError } = await supabase.storage
    .from('gesprekken-audio')
    .upload(filePath, audioBuffer, { contentType: 'audio/mpeg' })

  if (uploadError) {
    return NextResponse.json({ error: `Upload mislukt: ${uploadError.message}` }, { status: 500 })
  }

  // 4. Insert into gesprekken table
  const notitiesText = [
    notities?.trim(),
    campagne ? `Campagne: ${campagne}` : '',
    `Bron: LeadDesk (${filename})`,
  ].filter(Boolean).join('\n')

  const { error: dbError } = await supabase.from('gesprekken').insert({
    titel: titel.trim(),
    medewerker_naam: medewerker_naam || null,
    klant_naam: klant_naam?.trim() || null,
    sentiment: sentiment || null,
    resultaat: resultaat || null,
    notities: notitiesText || null,
    bestand_pad: filePath,
    bestand_naam: filename,
    bestand_grootte: audioBuffer.byteLength,
    user_id: user.id,
  })

  if (dbError) {
    // Clean up the uploaded file if DB insert fails
    await supabase.storage.from('gesprekken-audio').remove([filePath])
    return NextResponse.json({ error: `Opslaan mislukt: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
