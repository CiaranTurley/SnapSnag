import { NextRequest, NextResponse } from 'next/server'
import { scheduleWeek } from '@/lib/socialScheduler'

// Called every Monday at 08:00 UTC by Vercel Cron (see vercel.json)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await scheduleWeek()
    console.log(`[schedule-social] Scheduled ${result.facebook} Facebook posts and ${result.pinterest} Pinterest pins`)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[schedule-social] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
