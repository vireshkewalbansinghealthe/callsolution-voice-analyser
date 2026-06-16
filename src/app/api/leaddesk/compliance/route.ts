import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRecordingDownloadUrl } from '@/lib/leaddesk'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export type ComplianceItem = {
  id: string
  label: string
  passed: boolean
  evidence: string | null
  note: string
}

export type ComplianceResult = {
  score: number
  items: ComplianceItem[]
  samenvatting: string
  transcript: string
  analysed_at: string
}

const PROMPT = `Je bent een compliance controleur voor telemarketing gesprekken in Nederland.

Analyseer het volgende gesprekstranscript en controleer elk punt zorgvuldig.

COMPLIANCE PUNTEN:

1. ACM_INTRODUCTIE: De medewerker geeft aan het begin aan dat ze eerder toestemming hebben gekregen of eerder contact hebben gehad. ACM-proof formulering: "we hebben je in het verleden gesproken om u in de toekomst te mogen benaderen" of vergelijkbaar. Dit is verplicht voor outbound telemarketing.

2. PROVIDER_GEVRAAGD: De medewerker vraagt expliciet wie de huidige provider of leverancier van de klant is.

3. PRIJS_GEVRAAGD: De medewerker vraagt wat de klant momenteel betaalt of wat de huidige kosten zijn.

4. DIENSTEN_GEVRAAGD: De medewerker vraagt welke diensten, producten of abonnementen de klant afneemt.

5. KWALIFICATIE_COMPLEET: De huidige situatie van de klant (provider + prijs + diensten) is volledig gecheckt en besproken.

Roep de tool compliance_analyse aan met je bevindingen.`

const TOOL: Anthropic.Tool = {
  name: 'compliance_analyse',
  description: 'Sla het resultaat van de compliance analyse op',
  input_schema: {
    type: 'object' as const,
    properties: {
      score: { type: 'number', description: 'Score van 0 tot 100' },
      samenvatting: { type: 'string', description: 'Korte Nederlandse samenvatting van de compliance status' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            passed: { type: 'boolean' },
            evidence: { type: 'string', description: 'Korte quote uit het transcript of lege string als niet gevonden' },
            note: { type: 'string', description: 'Korte Nederlandse toelichting' },
          },
          required: ['id', 'label', 'passed', 'evidence', 'note'],
        },
      },
    },
    required: ['score', 'samenvatting', 'items'],
  },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rec } = await req.json()
  if (!rec) return NextResponse.json({ error: 'rec parameter verplicht' }, { status: 400 })

  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY niet ingesteld' }, { status: 500 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY niet ingesteld' }, { status: 500 })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    // Stap 1: Download URL ophalen van LeadDesk
    const downloadUrl = await getRecordingDownloadUrl(rec)

    // Stap 2: Audio downloaden
    const audioRes = await fetch(downloadUrl, { headers: { 'User-Agent': 'CallSolution/1.0' } })
    if (!audioRes.ok) throw new Error('Audio downloaden mislukt')

    const buffer = await audioRes.arrayBuffer()
    const filename = rec.includes('.') ? rec.split('/').pop() ?? 'audio.mp3' : 'audio.mp3'
    const audioFile = new File(
      [buffer],
      filename,
      { type: audioRes.headers.get('content-type') ?? 'audio/mpeg' }
    )

    // Stap 3: Transcriberen met Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'nl',
      response_format: 'text',
    })

    const transcript = String(transcription)

    // Stap 4: Compliance analyse met Claude via tool_use (garandeert geldige JSON)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'compliance_analyse' },
      messages: [{
        role: 'user',
        content: `${PROMPT}\n\nTRANSCRIPT:\n${transcript}`,
      }],
    })

    const toolUse = message.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') throw new Error('Geen analyse resultaat ontvangen')

    const parsed = toolUse.input as { score: number; samenvatting: string; items?: ComplianceItem[] }
    const result: ComplianceResult = {
      score: parsed.score ?? 0,
      samenvatting: parsed.samenvatting ?? '',
      items: parsed.items ?? [],
      transcript,
      analysed_at: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
