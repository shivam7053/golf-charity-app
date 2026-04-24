import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // If a user is signing in with OAuth, they might have a 'next' parameter
  // in the URL to redirect them to a specific page after login.
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the intended page or dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Log the error for server-side debugging
    console.error('Supabase Auth Callback Error:', error.message);
  }

  // Return the user to an error page or the home page if there's no code or an error occurred
  return NextResponse.redirect(`${origin}/auth/error`);
}
