import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Admin with Service Role Key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // Verify the event signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    const subscription = body.payload.subscription.entity;
    const supabaseUserId = subscription.notes?.supabase_user_id;

    if (!supabaseUserId) {
      return NextResponse.json({ received: true, message: 'No user metadata found' });
    }

    // Handle subscription events
    if (event === 'subscription.activated' || event === 'subscription.charged') {
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          stripe_customer_id: subscription.customer_id, // Storing Razorpay customer ID in the existing field
        })
        .eq('id', supabaseUserId);
    } else if (event === 'subscription.halted' || event === 'subscription.cancelled') {
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'canceled' })
        .eq('id', supabaseUserId);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}