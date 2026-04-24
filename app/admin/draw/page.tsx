import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Trophy, Users, Play, Send, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react'
import { Container, Paper, Title, Text, Badge, Button, Group, Stack, Alert, SimpleGrid, Card, ThemeIcon, Divider } from '@mantine/core'

export default async function AdminDrawPage() {
  const supabase = await createServerSupabaseClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check authorization
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  // 1. Fetch active subscribers and their verified scores separately to avoid relationship errors
  const { data: activeProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .eq('subscription_status', 'active')

  const activeIds = activeProfiles?.map(p => p.id) || []

  const { data: verifiedScores, error: scoresError } = await supabase
    .from('golf_scores')
    .select('user_id, score_value')
    .in('user_id', activeIds)
    .eq('is_verified', true)

  const usersError = profilesError || scoresError

  // Group scores by user
  const userScoreMap = verifiedScores?.reduce((acc: Record<string, any[]>, score) => {
    if (!acc[score.user_id]) acc[score.user_id] = []
    acc[score.user_id].push(score)
    return acc
  }, {}) || {}

  // Filter for only those with exactly 5 verified scores
  const participants = Object.keys(userScoreMap)
    .filter(uid => userScoreMap[uid].length === 5)
    .map(uid => ({
      id: uid,
      golf_scores: userScoreMap[uid]
    }))

  // 2. Fetch the latest draw to show results
  const { data: draws, error: drawError } = await supabase
    .from('draw_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  const latestDraw = draws && draws.length > 0 ? draws[0] : null
  const isSimulated = latestDraw && !latestDraw.is_published

  // 3. Fetch Analytics Data
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { data: allPublishedDraws } = await supabase
    .from('draw_results')
    .select('total_pool')
    .eq('is_published', true)

  const totalPrizePool = allPublishedDraws?.reduce((acc, curr) => acc + Number(curr.total_pool), 0) || 0
  const totalCharityContributions = totalPrizePool // Assuming a 50/50 revenue split

  // Calculate simulation stats
  let stats = { m5: 0, m4: 0, m3: 0 }
  if (isSimulated) {
    participants.forEach(p => {
      const matchCount = p.golf_scores.filter(s => 
        latestDraw.winning_numbers.includes(s.score_value)
      ).length
      if (matchCount === 5) stats.m5++
      else if (matchCount === 4) stats.m4++
      else if (matchCount === 3) stats.m3++
    })
  }

  async function runDraw() {
    'use server'
    const supabase = await createServerSupabaseClient()

    // Generate 5 unique random numbers between 1 and 45
    const numbers: number[] = []
    while (numbers.length < 5) {
      const n = Math.floor(Math.random() * 45) + 1
      if (!numbers.includes(n)) numbers.push(n)
    }

    // Save the draw result (Unpublished)
    const { error } = await supabase
      .from('draw_results')
      .insert({
        winning_numbers: numbers,
        total_pool: participants.length * 499, // Based on subs
        is_published: false,
        draw_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      })

    if (error) {
      console.error('Failed to run draw:', error.message)
    }

    revalidatePath('/admin/draw')
  }

  async function publishDraw() {
    'use server'
    if (!latestDraw) return
    const supabase = await createServerSupabaseClient()
    
    // 1. Identify all winners for this draw
    const winnerRecords: any[] = []
    const pool = Number(latestDraw.total_pool)
    
    participants.forEach(p => {
      const matches = p.golf_scores.filter(s => 
        latestDraw.winning_numbers.includes(s.score_value)
      ).length

      if (matches >= 3) {
        let prize = 0
        // Simple split logic: (Pool Share / Total Winners in Tier)
        // For this demo, we'll use fixed values based on the tier rules
        if (matches === 5) prize = (pool * 0.40) / (stats.m5 || 1)
        else if (matches === 4) prize = (pool * 0.35) / (stats.m4 || 1)
        else if (matches === 3) prize = (pool * 0.25) / (stats.m3 || 1)

        winnerRecords.push({
          user_id: p.id,
          draw_id: latestDraw.id,
          match_count: matches,
          prize_amount: Math.floor(prize),
          payment_status: 'pending'
        })
      }
    })

    // 2. Insert winners
    if (winnerRecords.length > 0) {
      const { error: winError } = await supabase.from('winners').insert(winnerRecords)
      if (winError) console.error("Error recording winners:", winError.message)
    }

    // 3. Mark draw as published
    await supabase
      .from('draw_results')
      .update({ is_published: true })
      .eq('id', latestDraw.id)

    revalidatePath('/admin/draw')
    revalidatePath('/dashboard')
  }

  return (
    <Container size="lg" py="xl">
        <Stack gap="xl">
          {(usersError || drawError) && (
            <Alert color="red" title="Database Connection Error" icon={<AlertTriangle size={16} />}>
              {usersError?.message || drawError?.message}. 
              Check your Supabase RLS policies for the draw_results table.
            </Alert>
          )}

          <Paper withBorder p="xl" radius="md" shadow="sm">
            <Group gap="xs" mb="xl">
              <ThemeIcon variant="light" color="indigo" size="lg">
                <BarChart3 size={20} />
              </ThemeIcon>
              <Title order={2}>Reports & Analytics</Title>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
              <Card withBorder radius="md" p="md">
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Total Registered Users</Text>
                <Text size="xl" fw={900}>{totalUsers || 0}</Text>
              </Card>
              <Card withBorder radius="md" p="md">
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Total Prize Pool</Text>
                <Text size="xl" fw={900} c="indigo">₹{totalPrizePool}</Text>
              </Card>
              <Card withBorder radius="md" p="md">
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">Charity Contributions</Text>
                <Text size="xl" fw={900} c="teal">₹{totalCharityContributions}</Text>
              </Card>
            </SimpleGrid>
          </Paper>

          <Paper withBorder p="xl" radius="md" shadow="sm">
            <Title order={1} mb="xs">Monthly Draw Engine</Title>
            <Group gap="xs" mb="xl">
              <Users size={16} color="var(--mantine-color-gray-5)" />
              <Text c="dimmed" size="sm">
                Current eligible participants: <Text span fw={700} c="indigo">{participants.length}</Text>
              </Text>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Paper p="md" radius="md" bg="indigo.0" withBorder style={{ borderColor: 'var(--mantine-color-indigo-2)' }}>
                <Title order={4} c="indigo.9" mb="xs">Next Draw Simulation</Title>
                <Text size="sm" c="indigo.7" mb="md">Generate the winning numbers and calculate prize distributions.</Text>
                <form action={runDraw}>
                  <Button type="submit" fullWidth color="indigo" leftSection={<Play size={16} />}>
                    Run Simulation
                  </Button>
                </form>
              </Paper>

              <Paper p="md" radius="md" bg="gray.0" withBorder>
                <Title order={4} mb="xs">Tier Rules</Title>
                <Stack gap={4}>
                  <Text size="sm"><strong>5 Matches:</strong> Jackpot (40% Pool)</Text>
                  <Text size="sm"><strong>4 Matches:</strong> 35% Pool</Text>
                  <Text size="sm"><strong>3 Matches:</strong> 25% Pool</Text>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Paper>

          {isSimulated && (
            <Paper withBorder p="xl" radius="md" shadow="md" style={{ borderTop: '6px solid var(--mantine-color-orange-4)' }}>
              <Group justify="space-between" mb="xl">
                <Stack gap={0}>
                  <Title order={3}>Simulation Results</Title>
                  <Text size="sm" c="dimmed" fs="italic">This draw is currently unpublished.</Text>
                </Stack>
                <form action={publishDraw}>
                  <Button type="submit" color="green" size="md" leftSection={<Send size={18} />}>
                    Publish Results
                  </Button>
                </form>
              </Group>

              <Group gap="md" mb="xl">
                {latestDraw.winning_numbers.map((n: number, i: number) => (
                  <Badge key={i} size="xl" circle color="indigo" variant="filled" style={{ height: 50, width: 50, fontSize: 20 }}>
                    {n}
                  </Badge>
                ))}
              </Group>

              <SimpleGrid cols={3} spacing="md">
                <Card withBorder radius="md" ta="center">
                  <Text size="xl" fw={900} c="indigo">{stats.m5}</Text>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">5 Matches</Text>
                </Card>
                <Card withBorder radius="md" ta="center">
                  <Text size="xl" fw={900}>{stats.m4}</Text>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">4 Matches</Text>
                </Card>
                <Card withBorder radius="md" ta="center">
                  <Text size="xl" fw={900}>{stats.m3}</Text>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">3 Matches</Text>
                </Card>
              </SimpleGrid>
              
              <Alert color="indigo" icon={<Trophy size={18} />} mt="xl">
                Total Prize Pool for {latestDraw.draw_month}: <Text span fw={700}>₹{latestDraw.total_pool}</Text>
              </Alert>
            </Paper>
          )}
        </Stack>
    </Container>
  )
}
