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
