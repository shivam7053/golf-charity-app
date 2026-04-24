import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()

  const url = new URL(request.url)
  return NextResponse.redirect(new URL('/auth/login', url.origin), {
    status: 303,
  })
}
