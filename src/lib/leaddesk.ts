const API_URL = process.env.LEADDESK_API_URL!
const CLIENT_ID = process.env.LEADDESK_CLIENT_ID!
const CLIENT_SECRET = process.env.LEADDESK_CLIENT_SECRET!
const ACCOUNT_ID = process.env.LEADDESK_ACCOUNT_ID!

export type LeadDeskAgent = {
  id: number
  name: string
  username: string
  employment: 'active' | 'inactive'
  office: string | null
  role: string
  primary_email: string
}

export type LeadDeskCampaign = {
  id: number
  name: string
  type: string
  disabled: boolean
}

export type LeadDeskRecording = {
  created_at: string
  call_recording: string        // filename or full URL
  phone_number: string | null
  result: string | null
  comment: string | null
  direction: 'in' | 'out'
  status: string | null
  duration: string | null
}

async function getToken(): Promise<string> {
  const res = await fetch(`${API_URL}/oauth/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'leaddesk_client_id',
      leaddesk_client_id: ACCOUNT_ID,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('LeadDesk auth failed: ' + JSON.stringify(data))
  return data.access_token
}

async function ldFetch(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  return res.json()
}

export async function getAgents(): Promise<LeadDeskAgent[]> {
  const token = await getToken()
  const data = await ldFetch('/users?limit=100', token)
  return data.collection ?? []
}

export async function getCampaigns(): Promise<LeadDeskCampaign[]> {
  const token = await getToken()
  const data = await ldFetch('/campaigns?limit=100', token)
  return (data.collection ?? []).filter((c: LeadDeskCampaign) => !c.disabled)
}

/** Find all recordings for a customer phone number via the GDPR API */
export async function getRecordingsByPhone(phone: string): Promise<LeadDeskRecording[]> {
  const token = await getToken()
  const data = await ldFetch(`/gdpr/contact?phone=${encodeURIComponent(phone)}`, token)
  const calls: LeadDeskRecording[] = data.calls?.agent ?? []
  return calls.filter(c => c.call_recording)
}

/**
 * Get the signed download URL for a recording.
 * `callRecording` can be a filename like "3699-CALL-agent-...mp3"
 * or a full URL; we extract the filename if needed.
 */
export async function getRecordingDownloadUrl(callRecording: string): Promise<string> {
  // If it's already a full URL (rec-*.leaddesk.com), return it directly
  if (callRecording.startsWith('http')) return callRecording

  const token = await getToken()
  const res = await fetch(
    `${API_URL}/audio/files/${encodeURIComponent(callRecording)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'manual',
      cache: 'no-store',
    }
  )
  const location = res.headers.get('location')
  if (!location) throw new Error(`No redirect from LeadDesk audio endpoint (status ${res.status})`)
  return location
}
