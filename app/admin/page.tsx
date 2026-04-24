import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { 
  Trophy, Users, Play, Send, CheckCircle2, 
  AlertTriangle, BarChart3, Eye, Check, XCircle, 
  Heart, Wallet, Shield, Settings, Mail, UserPlus
} from 'lucide-react'
import { 
  Container, Paper, Title, Text, Badge, Button, Group, 
  Stack, Alert, SimpleGrid, Card, ThemeIcon, Divider, 
  Table, TableScrollContainer, TableThead, TableTbody, 
  TableTr, TableTh, TableTd, ActionIcon, Anchor, Tabs,
  TabsList, TabsTab, TabsPanel, TextInput
} from '@mantine/core'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const adminClient = createAdminClient()

  // 1. Auth & Admin Security Check
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/auth/login')

  const { data: profile, error: adminCheckError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', authUser.id)
    .single()

  if (adminCheckError) {
    console.error("Admin Security Check Error:", adminCheckError.message)
  }

  if (!profile?.is_admin) redirect('/dashboard')

  // 2. Data Fetching
  const { count: totalUsersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  
  const { data: allProfilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false })

  // Fetch auth.users to get emails and merge with profiles
  const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers()
  const allProfiles = allProfilesData?.map(profile => ({
    ...profile,
    email: authUsers?.users?.find(u => u.id === profile.id)?.email || 'N/A'
  }))

  const { data: pendingScores, error: pendingScoresError } = await supabase
    .from('golf_scores')
    .select(`id, play_date, score_value, is_verified, screenshot_url, user_id`)
    .eq('is_verified', false)
    .order('created_at', { ascending: true })

  const { data: activeProfiles } = await supabase.from('profiles').select('id').eq('subscription_status', 'active')
  const activeIds = activeProfiles?.map(p => p.id) || []
  
  const { data: verifiedScores } = await supabase
    .from('golf_scores')
    .select('user_id, score_value')
    .in('user_id', activeIds)
    .eq('is_verified', true)

  const { data: draws, error: drawsError } = await supabase
    .from('draw_results')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: winners, error: winnersError } = await supabase
    .from('winners')
    .select('*, profiles(id)')
    .order('created_at', { ascending: false })

  const { data: charities } = await supabase.from('charities').select('*')

  // Logic for Draw Simulation
  const userScoreMap = verifiedScores?.reduce((acc: Record<string, any[]>, score) => {
    if (!acc[score.user_id]) acc[score.user_id] = []
    acc[score.user_id].push(score)
    return acc
  }, {}) || {}

  const participants = Object.keys(userScoreMap)
    .filter(uid => userScoreMap[uid].length === 5)
    .map(uid => ({ id: uid, golf_scores: userScoreMap[uid] }))

  const latestDraw = draws && draws.length > 0 ? draws[0] : null
  const isSimulated = latestDraw && !latestDraw.is_published

  let stats = { m5: 0, m4: 0, m3: 0 }
  if (isSimulated) {
    participants.forEach(p => {
      const matchCount = p.golf_scores.filter(s => latestDraw.winning_numbers.includes(s.score_value)).length
      if (matchCount === 5) stats.m5++
      else if (matchCount === 4) stats.m4++
      else if (matchCount === 3) stats.m3++
    })
  }

  const totalPrizePool = draws?.filter(d => d.is_published).reduce((acc, curr) => acc + Number(curr.total_pool), 0) || 0
  const totalCharityContributions = totalPrizePool // Assuming a 50/50 revenue split

  // Server Actions
  async function verifyScore(formData: FormData) {
    'use server'
    const scoreId = formData.get('scoreId') as string
    const sb = await createServerSupabaseClient()
    await sb.from('golf_scores').update({ is_verified: true }).eq('id', scoreId)
    revalidatePath('/admin')
    revalidatePath('/dashboard') // Also revalidate dashboard for user's score status
  }

  async function runDraw() {
    'use server'
    const sb = await createServerSupabaseClient()
    const numbers: number[] = []
    while (numbers.length < 5) {
      const n = Math.floor(Math.random() * 45) + 1
      if (!numbers.includes(n)) numbers.push(n)
    }
    await sb.from('draw_results').insert({
      winning_numbers: numbers,
      total_pool: participants.length * 499,
      is_published: false,
      draw_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
    })
    revalidatePath('/admin')
  }

  async function publishDraw() {
    'use server'
    if (!latestDraw) return
    const sb = await createServerSupabaseClient()
    const winnerRecords: any[] = []
    const pool = Number(latestDraw.total_pool)
    
    participants.forEach(p => {
      const matches = p.golf_scores.filter(s => latestDraw.winning_numbers.includes(s.score_value)).length
      if (matches >= 3) {
        let prize = 0
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

    if (winnerRecords.length > 0) await sb.from('winners').insert(winnerRecords)
    await sb.from('draw_results').update({ is_published: true }).eq('id', latestDraw.id)
    revalidatePath('/admin')
  }

  async function createNewUser(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const isAdmin = formData.get('is_admin') === 'on'

    const adminSb = createAdminClient()
    
    // Use service role key to create user in auth.users
    const { data: authUserData, error: authError } = await adminSb.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
    })

    if (authError) {
      return console.error("Error creating auth user:", authError.message)
    }

    // Create corresponding profile entry
    const { error: profileInsertError } = await adminSb
      .from('profiles')
      .upsert({
        id: authUserData.user?.id,
        is_admin: isAdmin,
        subscription_status: 'inactive', // Default to inactive
      })
    
    if (profileInsertError) {
      console.error("Error creating user profile:", profileInsertError.message)
      // Optionally, delete the auth user if profile creation fails
      await adminSb.auth.admin.deleteUser(authUserData.user!.id)
      return
    }

    revalidatePath('/admin')
  }

  async function toggleAdminStatus(formData: FormData) {
    'use server'
    const userId = formData.get('userId') as string
    const currentStatus = formData.get('currentStatus') === 'true'
    const adminSb = createAdminClient()
    await adminSb.from('profiles').update({ is_admin: !currentStatus }).eq('id', userId)
    revalidatePath('/admin')
  }

  async function toggleSubscriptionStatus(formData: FormData) {
    'use server'
    const userId = formData.get('userId') as string
    const currentStatus = formData.get('currentStatus') as string
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const adminSb = createAdminClient()
    await adminSb.from('profiles').update({ subscription_status: newStatus }).eq('id', userId)
    revalidatePath('/admin')
  }

  async function deleteUserAccount(formData: FormData) {
    'use server'
    const userId = formData.get('userId') as string
    const adminSb = createAdminClient()
    const { error } = await adminSb.auth.admin.deleteUser(userId) // This will cascade delete from profiles
    if (error) console.error("Error deleting user:", error.message)
    revalidatePath('/admin')
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={1}>Admin Command Center</Title>
          <Badge size="lg" color="indigo" variant="filled" leftSection={<Shield size={14} />}>Super Admin</Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Card withBorder radius="md" p="md">
            <Group gap="sm">
              <ThemeIcon variant="light" color="indigo"><Users size={18} /></ThemeIcon>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">Total Users</Text>
            </Group>
            <Text size="xl" fw={900} mt="sm">{totalUsersCount}</Text>
          </Card>
          <Card withBorder radius="md" p="md">
            <Group gap="sm">
              <ThemeIcon variant="light" color="green"><Wallet size={18} /></ThemeIcon>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">Total Prize Pool</Text>
            </Group>
            <Text size="xl" fw={900} mt="sm" c="indigo">₹{totalPrizePool}</Text>
          </Card>
          <Card withBorder radius="md" p="md">
            <Group gap="sm">
              <ThemeIcon variant="light" color="teal"><Heart size={18} /></ThemeIcon>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">Total Charity Contributions</Text>
            </Group>
            <Text size="xl" fw={900} mt="sm" c="teal">₹{totalPrizePool}</Text>
          </Card>
        </SimpleGrid>

        <Tabs defaultValue="verification" variant="outline" radius="md">
          <TabsList>
            <TabsTab value="verification" leftSection={<Check size={16} />}>Verification</TabsTab>
            <TabsTab value="draw" leftSection={<Play size={16} />}>Draws</TabsTab>
            <TabsTab value="winners" leftSection={<Trophy size={16} />}>Winners</TabsTab>
            <TabsTab value="users" leftSection={<Users size={16} />}>User Mgmt</TabsTab>
          </TabsList>

          <TabsPanel value="verification" pt="xl">
            <Paper withBorder p="xl" radius="md">
              <Title order={3} mb="xl">Verification Queue</Title>
              {pendingScoresError && <Alert color="red" mb="md" icon={<AlertTriangle size={16} />}>Error: {pendingScoresError.message}</Alert>}
              <TableScrollContainer minWidth={500}>
                <Table verticalSpacing="md" highlightOnHover>
                  <TableThead><TableTr><TableTh>Player ID</TableTh><TableTh>Date</TableTh><TableTh>Score</TableTh><TableTh ta="center">Proof</TableTh><TableTh ta="right">Action</TableTh></TableTr></TableThead>
                  <TableTbody>
                    {pendingScores?.map((score) => (
                      <TableTr key={score.id}>
                        <TableTd><Text size="xs" ff="monospace">{score.user_id.split('-')[0]}...</Text></TableTd>
                        <TableTd><Text size="sm">{score.play_date}</Text></TableTd>
                        <TableTd><Text size="lg" fw={900} c="indigo">{score.score_value}</Text></TableTd>
                        <TableTd ta="center">
                          {score.screenshot_url ? (
                            <Anchor href={score.screenshot_url} target="_blank" size="xs" fw={700} tt="uppercase">View</Anchor>
                          ) : <Text size="xs" c="dimmed">No Image</Text>}
                        </TableTd>
                        <TableTd ta="right">
                          <form action={verifyScore}><input type="hidden" name="scoreId" value={score.id} />
                            <ActionIcon type="submit" variant="light" color="green" size="lg"><Check size={20} /></ActionIcon>
                          </form>
                        </TableTd>
                      </TableTr>
                    ))}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
              {(!pendingScores || pendingScores.length === 0) && (
                <Stack align="center" py={60} c="dimmed"><XCircle size={48} style={{ opacity: 0.2 }} /><Text>Clean queue!</Text></Stack>
              )}              
            </Paper>
          </TabsPanel>

          <TabsPanel value="draw" pt="xl">
            <Stack gap="lg">
              <Paper withBorder p="xl" radius="md">
                <Group justify="space-between" mb="xl">
                  {drawsError && <Alert color="red" mb="md" icon={<AlertTriangle size={16} />}>Error: {drawsError.message}</Alert>}
                  <Stack gap={0}>
                    <Title order={3}>Monthly Draw Engine</Title>
                    <Text size="sm" c="dimmed">Participants: {participants.length}</Text>
                  </Stack>
                  <form action={runDraw}><Button type="submit" color="indigo" leftSection={<Play size={16} />}>Run Simulation</Button></form>
                </Group>
                
                {isSimulated && (
                  <Stack gap="xl">
                    <Divider label="Simulation Results" labelPosition="center" />
                    <Group gap="md">
                      {latestDraw.winning_numbers.map((n: number, i: number) => (
                        <Badge key={i} size="xl" circle color="indigo" variant="filled" style={{ height: 45, width: 45, fontSize: 18 }}>{n}</Badge>
                      ))}
                    </Group>
                    <SimpleGrid cols={3} spacing="md">
                      <Card withBorder ta="center"><Text size="xl" fw={900} c="indigo">{stats.m5}</Text><Text size="xs" tt="uppercase" fw={700}>5 Matches</Text></Card>
                      <Card withBorder ta="center"><Text size="xl" fw={900}>{stats.m4}</Text><Text size="xs" tt="uppercase" fw={700}>4 Matches</Text></Card>
                      <Card withBorder ta="center"><Text size="xl" fw={900}>{stats.m3}</Text><Text size="xs" tt="uppercase" fw={700}>3 Matches</Text></Card>
                    </SimpleGrid>
                    <Group justify="flex-end">
                      <form action={publishDraw}><Button type="submit" color="green" size="md" leftSection={<Send size={18} />}>Publish Results</Button></form>
                    </Group>
                  </Stack>
                )}
              </Paper>
            </Stack>
          </TabsPanel>

          <TabsPanel value="winners" pt="xl">
            <Paper withBorder p="xl" radius="md">
              <Title order={3} mb="xl">Winner Payouts</Title>
              {winnersError && <Alert color="red" mb="md" icon={<AlertTriangle size={16} />}>Error: {winnersError.message}</Alert>}
              <TableScrollContainer minWidth={600}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <TableThead><TableTr><TableTh>Winner ID</TableTh><TableTh>Matches</TableTh><TableTh>Prize</TableTh><TableTh>Status</TableTh></TableTr></TableThead>
                  <TableTbody>
                    {winners?.map(w => (
                      <TableTr key={w.id}>
                        <TableTd><Text size="xs" ff="monospace">{w.user_id.split('-')[0]}...</Text></TableTd>
                        <TableTd><Badge variant="light">{w.match_count} Matches</Badge></TableTd>
                        <TableTd><Text fw={700}>₹{w.prize_amount}</Text></TableTd>
                        <TableTd>
                          {w.payment_status === 'pending' ? (
                            <Badge color="orange" variant="outline">Pending</Badge>
                          ) : (
                            <Badge color="green" variant="filled">Paid</Badge>
                          )}
                        </TableTd>
                      </TableTr>
                    ))}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
            </Paper>
          </TabsPanel>

          <TabsPanel value="users" pt="xl">
            <Paper withBorder p="xl" radius="md">
              <Title order={3} mb="xl">User Management</Title>
              {profilesError && (
                <Alert color="red" mb="md" icon={<AlertTriangle size={16} />}>
                  Failed to load users: {profilesError.message}
                </Alert>
              )}
              {authUsersError && (
                <Alert color="red" mb="md" icon={<AlertTriangle size={16} />}>
                  Failed to load auth users: {authUsersError.message}
                </Alert>
              )}

              <Group justify="flex-end" mb="md">
                <form action={createNewUser}>
                  <Group>
                    <TextInput name="email" placeholder="New User Email" required type="email" />
                    <TextInput name="password" placeholder="Password" required type="password" />
                    <Button type="submit" leftSection={<UserPlus size={16} />} color="green">Create User</Button>
                  </Group>
                </form>
              </Group>

              <TableScrollContainer minWidth={600}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <TableThead><TableTr>
                    <TableTh>ID</TableTh>
                    <TableTh>Email</TableTh>
                    <TableTh>Subscription</TableTh>
                    <TableTh>Admin</TableTh>
                    <TableTh>Actions</TableTh>
                  </TableTr></TableThead>
                  <TableTbody>
                    {allProfiles?.map(p => (
                      <TableTr key={p.id}>
                        <TableTd><Text size="xs" ff="monospace">{p.id.split('-')[0]}...</Text></TableTd>
                        <TableTd><Text size="sm" fw={500} c="dimmed">{p.email}</Text></TableTd>
                        <TableTd>
                          <Badge color={p.subscription_status === 'active' ? 'green' : 'gray'} variant="light">
                            {p.subscription_status}
                          </Badge>
                        </TableTd>
                        <TableTd>{p.is_admin ? <Shield size={16} color="indigo" /> : <Text size="xs">-</Text>}</TableTd>
                        <TableTd>
                          <Group gap="xs">
                            <form action={toggleAdminStatus}>
                              <input type="hidden" name="userId" value={p.id} />
                              <input type="hidden" name="currentStatus" value={String(p.is_admin)} />
                              <Button type="submit" variant="light" size="xs" color={p.is_admin ? 'orange' : 'indigo'}>
                                {p.is_admin ? 'Revoke Admin' : 'Make Admin'}
                              </Button>
                            </form>
                            <form action={toggleSubscriptionStatus}>
                              <input type="hidden" name="userId" value={p.id} />
                              <input type="hidden" name="currentStatus" value={p.subscription_status} />
                              <Button type="submit" variant="light" size="xs" color={p.subscription_status === 'active' ? 'orange' : 'green'}>
                                {p.subscription_status === 'active' ? 'Deactivate Sub' : 'Activate Sub'}
                              </Button>
                            </form>
                            <form action={deleteUserAccount}>
                              <input type="hidden" name="userId" value={p.id} />
                              <ActionIcon type="submit" variant="light" color="red" size="sm">
                                <XCircle size={18} />
                              </ActionIcon>
                            </form>
                          </Group>
                        </TableTd>
                      </TableTr>
                    ))}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
            </Paper>
          </TabsPanel>
        </Tabs>
      </Stack>
    </Container>
  )
}