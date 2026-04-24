'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@mantine/core'

export default function DummyPaymentButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDummyPayment = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dummy-checkout', { method: 'POST' })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      alert('Dummy Payment Successful! Your account is now active.')
      
      // Refresh the page data and redirect
      router.refresh()
      router.push('/dashboard?success=true')
    } catch (error: any) {
      console.error('Dummy Payment Error:', error)
      alert('Dummy Payment Failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="light"
      color="gray"
      fullWidth
      loading={loading}
      onClick={handleDummyPayment}
    >
      Try Dummy Payment (For Demo)
    </Button>
  )
}