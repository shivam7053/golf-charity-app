'use client'

import { useState } from 'react'
import { Button } from '@mantine/core'

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false)

  const handleSubscription = async () => {
    setLoading(true)
    try {
      // 1. Call our internal API to create a subscription_id
      const res = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      // 2. Initialize Razorpay options
      const options = {
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'Golf Charity App',
        description: 'Monthly Subscription',
        handler: function (response: any) {
          // Payment successful
          alert('Payment Successful! Your subscription is being processed.')
          window.location.href = '/dashboard?success=true'
        },
        prefill: {
          name: '',
          email: '',
        },
        theme: {
          color: '#4f46e5', // Indigo-600
        },
      }

      // 3. Open the Modal
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (error: any) {
      console.error('Razorpay Error:', error)
      alert('Failed to initialize payment: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="lg"
      fullWidth
      color="indigo"
      loading={loading}
      onClick={handleSubscription}
      style={{ fontWeight: 700, height: 50 }}
    >
      Pay & Subscribe Now
    </Button>
  )
}