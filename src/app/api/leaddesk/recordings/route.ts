import { createClient } from '@/lib/supabase/server'
import { getRecordingsByPhone } from '@/lib/leaddesk'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ error: 'phone parameter required' }, { status: 400 })

  try {
    const recordings = await getRecordingsByPhone(phone)
    return NextResponse.json({ recordings })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
