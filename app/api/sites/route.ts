import { NextResponse } from 'next/server'
import { getSites } from '@/lib/notion/pages'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getSites()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch sites:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
} 