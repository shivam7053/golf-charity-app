'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Stack, Title, NumberInput, Button, FileInput, Text, Group, TextInput } from '@mantine/core'

export default function ScoreForm() {
  const [score, setScore] = useState<number>(36)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let screenshotUrl: string | null = null

    if (file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}` // Store in user-specific folder

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('scorecards') // Your bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        setError(`Failed to upload screenshot: ${uploadError.message}`)
        setLoading(false)
        return
      }
      screenshotUrl = supabase.storage.from('scorecards').getPublicUrl(filePath).data.publicUrl
    }

    // Call the PostgreSQL function we created earlier
    const { error: rpcError } = await supabase.rpc('handle_rolling_golf_score', {
      p_user_id: user.id,
      p_score: score,
      p_date: date,
      p_screenshot_url: screenshotUrl
    })

    if (rpcError) {
      setError(`Failed to submit score: ${rpcError.message}`)
    } else {
      router.refresh() // Refresh the server component data
      // Reset form fields and advance date to tomorrow for next entry
      setScore(36) // Reset to a default score
      setDate(new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]) // Set to tomorrow's date
      setFile(null) // Clear the file input
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Title order={5} c="gray.7">Submit New Score</Title>
      
        <Group grow align="flex-end">
          <NumberInput
            label="Stableford Score"
            min={1}
            max={45}
            value={score}
            onChange={(val) => setScore(Number(val))}
            required
          />
        
          <TextInput
            label="Play Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Group>
      
        <FileInput
          label="Scorecard Screenshot (Optional)"
          placeholder="Upload image"
          accept="image/*"
          onChange={setFile}
        />

        {error && <Text c="red" size="xs">{error}</Text>}

        <Button
          type="submit"
          loading={loading}
          color="indigo"
          fullWidth
        >
          Submit Score
        </Button>
      </Stack>
    </form>
  )
}