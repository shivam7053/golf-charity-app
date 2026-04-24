'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Select, Stack, Title, Text } from '@mantine/core'

interface Charity {
  id: string
  name: string
}

export default function CharityPicker({ 
  charities, 
  selectedId 
}: { 
  charities: Charity[], 
  selectedId?: string 
}) {
  const [loading, setLoading] = useState(false)
  const [currentId, setCurrentId] = useState(selectedId || '')
  const supabase = createClient()
  const router = useRouter()

  const handleUpdate = async (newId: string | null) => {
    if (!newId) return
    setLoading(true)
    setCurrentId(newId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ selected_charity_id: newId })
      .eq('id', user.id)

    if (error) {
      alert('Failed to update charity')
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Stack gap="xs">
      <div>
        <Title order={6} c="gray.7">Supporting Charity</Title>
        <Text size="xs" c="dimmed">Select where your contributions go.</Text>
      </div>

      <Select
        placeholder="Choose a charity..."
        data={charities.map(c => ({ value: c.id, label: c.name }))}
        value={currentId}
        onChange={handleUpdate}
        disabled={loading}
        checkIconPosition="right"
      />

      {loading && (
        <Text size="10px" fw={700} c="indigo" tt="uppercase" style={{ letterSpacing: 1 }} className="animate-pulse">
          Updating preference...
        </Text>
      )}
    </Stack>
  )
}