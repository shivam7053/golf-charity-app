import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScoreForm from '@/components/score-form'
import CharityPicker from '@/components/charity-picker'
import { Eye, CheckCircle2, Clock, Trophy, ShieldCheck, Wallet } from 'lucide-react'
import { Container, Flex, Box, Paper, Title, Text, Badge, Button, Group, Stack, Alert, Card, ActionIcon, Divider, SimpleGrid } from '@mantine/core'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch profile to get selected charity and subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('selected_charity_id, subscription_status, is_admin')
    .eq('id', user.id)
    .single()

  // Fetch all active charities for the picker
  const { data: charities } = await supabase
    .from('charities')
    .select('id, name')

  // Fetch the latest published draw
  const { data: draws } = await supabase
    .from('draw_results')
    .select('*')
    .eq('is_published', true)
    .order('draw_date', { ascending: false })
    .limit(1)

  const lastDraw = draws && draws.length > 0 ? draws[0] : null

  // Fetch the latest 5 scores
  const { data: scores } = await supabase
    .from('golf_scores')
    .select('*')
    .eq('user_id', user.id)
    .order('play_date', { ascending: false })
    .limit(5)

  const isActive = profile?.subscription_status === 'active'

  // Fetch winnings for the user
  const { data: winnings } = await supabase
    .from('winners')
    .select('prize_amount, payment_status')
    .eq('user_id', user.id)

  const totalWon = winnings?.reduce((acc, curr) => acc + Number(curr.prize_amount), 0) || 0
  const pendingPayout = winnings?.filter(w => w.payment_status === 'pending')
    .reduce((acc, curr) => acc + Number(curr.prize_amount), 0) || 0

  // Calculate user matches for the last draw
  let userMatches = 0
  if (lastDraw && scores && scores.length === 5) {
    userMatches = scores.filter(s => 
      lastDraw.winning_numbers.includes(s.score_value)
    ).length
  }

  return (
    <Container size="lg" py="xl">
      <Flex gap={{ base: 'md', md: 'xl' }} direction={{ base: 'column', md: 'row' }} align="flex-start">
        <Box style={{ flex: 2, width: '100%' }}>
          <Stack gap="lg">
            <Paper withBorder p="xl" radius="md" shadow="sm">
              <Title order={2} mb="xs">Dashboard</Title>
              <Text c="dimmed">
                Welcome back, <Text span fw={600} c="indigo">{user.email || 'Golfer'}</Text>!
              </Text>
              {!isActive && (
                <Alert color="yellow" title="Subscription Inactive" icon={<Clock size={16} />} mt="md">
                  <Text size="sm">
                    Your subscription is currently <strong>{profile?.subscription_status || 'inactive'}</strong>. 
                    Please subscribe to participate in the monthly draws.
                  </Text>
                  <Button component="a" href="/subscribe" color="indigo" size="xs" mt="xs">
                    Subscribe Now
                  </Button>
                </Alert>
              )}
            </Paper>

            <Paper withBorder p="xl" radius="md" shadow="sm">
              <Group gap="xs" mb="md">
                <Wallet size={20} color="var(--mantine-color-indigo-6)" />
                <Title order={4}>Winnings Overview</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                <Card withBorder radius="md">
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">Total Won</Text>
                  <Text size="xl" fw={900} c="indigo">₹{totalWon}</Text>
                </Card>
                <Card withBorder radius="md">
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">Payment Status</Text>
                  <Group gap={0} mt={4}>
                    {pendingPayout > 0 ? (
                      <Badge color="orange" variant="light">₹{pendingPayout} Pending Payout</Badge>
                    ) : (
                      <Badge color="green" variant="light">All Payouts Completed</Badge>
                    )}
                  </Group>
                </Card>
              </SimpleGrid>
            </Paper>

            {lastDraw && (
              <Paper withBorder p="xl" radius="md" shadow="sm" style={{ borderLeft: '6px solid var(--mantine-color-indigo-6)' }}>
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <Trophy size={20} color="var(--mantine-color-indigo-6)" />
                    <Title order={4}>Last Draw Results</Title>
                  </Group>
                  <Text size="xs" c="dimmed" fw={700}>{lastDraw.draw_date}</Text>
                </Group>
                <Group gap="xs" mb="md">
                  {lastDraw.winning_numbers.map((n: number, i: number) => (
                    <Badge 
                      key={i} 
                      variant={scores?.some(s => s.score_value === n) ? "filled" : "outline"} 
                      color="indigo" 
                      size="lg" 
                      circle
                    >
                      {n}
                    </Badge>
                  ))}
                </Group>
                {isActive && scores?.length === 5 ? (
                  <Text size="sm" fw={500}>
                    You matched <Text span fw={700} c="indigo">{userMatches}</Text> numbers!
                    {userMatches >= 3 ? " Congratulations, you are a winner!" : " Better luck next time."}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed" fs="italic">
                    You weren't eligible for this draw. Ensure you have 5 verified scores and an active subscription for the next one.
                  </Text>
                )}
              </Paper>
            )}

            <Paper withBorder p="xl" radius="md" shadow="sm">
              <Group justify="space-between" mb="md">
                <Title order={4}>Your Recent Scores (Rolling 5)</Title>
                {isActive && (
                  <Badge color="green" variant="light" radius="xl">
                    Draw Eligible
                  </Badge>
                )}
              </Group>
              <Stack gap="xs">
                {scores && scores.length > 0 ? (
                  scores.map((s) => (
                    <Card key={s.id} withBorder p="sm" radius="sm" bg="gray.0">
                      <Group justify="space-between">
                        <Stack gap={0}>
                          <Text size="sm" fw={500} c="dimmed">{s.play_date}</Text>
                          {s.is_verified ? (
                            <Group gap={4}>
                              <CheckCircle2 size={12} color="var(--mantine-color-green-6)" />
                              <Text size="xs" fw={700} c="green" style={{ textTransform: 'uppercase' }}>Verified</Text>
                            </Group>
                          ) : (
                            <Group gap={4}>
                              <Clock size={12} color="var(--mantine-color-orange-6)" />
                              <Text size="xs" fw={700} c="orange" style={{ textTransform: 'uppercase' }}>Pending</Text>
                            </Group>
                          )}
                        </Stack>
                        <Group gap="md">
                          {s.screenshot_url && (
                            <ActionIcon component="a" href={s.screenshot_url} target="_blank" variant="subtle" color="gray">
                              <Eye size={18} />
                            </ActionIcon>
                          )}
                          <Text size="xl" fw={700} c="indigo">
                            {s.score_value} <Text span size="xs" fw={400} c="dimmed">PTS</Text>
                          </Text>
                        </Group>
                      </Group>
                    </Card>
                  ))
                ) : (
                  <Text size="sm" c="dimmed" fs="italic">No scores entered yet. Start by submitting your first score!</Text>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Box>

        <Box style={{ flex: 1, width: '100%' }}>
          <Stack gap="md">
            <Paper withBorder p="md" radius="md">
              <CharityPicker charities={charities || []} selectedId={profile?.selected_charity_id} />
            </Paper>

            {profile?.is_admin && (
              <Paper p="md" radius="md" bg="indigo.9" c="white" shadow="sm">
                <Group gap="xs" mb="sm">
                  <ShieldCheck size={20} />
                  <Text fw={700}>Admin Panel</Text>
                </Group>
                <Stack gap="xs">
                  <Button component="a" href="/admin/verify" variant="filled" color="indigo.8" fullWidth size="xs">
                    Verify Scorecards
                  </Button>
                  <Button component="a" href="/admin/draw" variant="filled" color="indigo.8" fullWidth size="xs">
                    Run Monthly Draw
                  </Button>
                </Stack>
              </Paper>
            )}

            <Paper withBorder p="xl" radius="md" shadow="sm">
              <ScoreForm />
            </Paper>

            <form action="/auth/logout" method="post">
              <Button type="submit" variant="light" color="red" fullWidth>
                Sign Out
              </Button>
            </form>
          </Stack>
        </Box>
      </Flex>
    </Container>
  )
}