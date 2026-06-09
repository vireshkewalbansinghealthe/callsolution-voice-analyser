import { createClient } from '@/lib/supabase/server'
import { getRecordingDownloadUrl } from '@/lib/leaddesk'
import { NextRequest } from 'next/server'

/**
 * Streaming audio proxy for LeadDesk recordings.
 * Handles range requests so the browser <audio> player can seek.
 * GET /api/leaddesk/stream?rec={call_recording_value}
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const rec = req.nextUrl.searchParams.get('rec')
  if (!rec) return new Response('rec parameter required', { status: 400 })

  try {
    const downloadUrl = await getRecordingDownloadUrl(rec)
    const rangeHeader = req.headers.get('range')

    const audioRes = await fetch(downloadUrl, {
      headers: {
        ...(rangeHeader ? { Range: rangeHeader } : {}),
        'User-Agent': 'CallSolution/1.0',
      },
    })

    const resHeaders = new Headers()
    resHeaders.set('Content-Type', audioRes.headers.get('Content-Type') ?? 'audio/mpeg')
    resHeaders.set('Accept-Ranges', 'bytes')
    resHeaders.set('Cache-Control', 'private, max-age=300')

    const contentLength = audioRes.headers.get('Content-Length')
    if (contentLength) resHeaders.set('Content-Length', contentLength)

    const contentRange = audioRes.headers.get('Content-Range')
    if (contentRange) resHeaders.set('Content-Range', contentRange)

    return new Response(audioRes.body, {
      status: audioRes.status,
      headers: resHeaders,
    })
  } catch (err) {
    return new Response(String(err), { status: 502 })
  }
}
