import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Eye, Check, XCircle, AlertCircle } from 'lucide-react'
import { Container, Paper, Title, Table, TableScrollContainer, TableThead, TableTbody, TableTr, TableTh, TableTd, Group, ActionIcon, Text, Alert, Stack, Anchor } from '@mantine/core'

export default async function AdminVerifyPage() {
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

  // Fetch pending scores
  const { data: pendingScores, error: fetchError } = await supabase
    .from('golf_scores')
    .select(`
      id, play_date, score_value, is_verified, screenshot_url, user_id
    `)
    .eq('is_verified', false)
    .order('created_at', { ascending: true })

  async function verifyScore(formData: FormData) {
    'use server'
    const scoreId = formData.get('scoreId') as string
    const supabase = await createServerSupabaseClient()
    
    await supabase
      .from('golf_scores')
      .update({ is_verified: true })
      .eq('id', scoreId)

    revalidatePath('/admin/verify')
    revalidatePath('/dashboard')
  }

  return (
    <Container size="lg" py="xl">
      <Paper withBorder p="xl" radius="md" shadow="sm">
        <Title order={1} mb="xl">Verification Queue</Title>
        
        {fetchError && (
          <Alert color="red" title="Error" icon={<AlertCircle size={16} />} mb="md">
            Error fetching scores: {fetchError.message}
          </Alert>
        )}

        <TableScrollContainer minWidth={500}>
          <Table verticalSpacing="md" highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Player</TableTh>
                <TableTh>Date</TableTh>
                <TableTh>Score</TableTh>
                <TableTh ta="center">Screenshot</TableTh>
                <TableTh ta="right">Action</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {pendingScores?.map((score) => (
                <TableTr key={score.id}>
                  <TableTd>
                    <Text size="xs" ff="monospace" c="dimmed">{score.user_id.split('-')[0]}...</Text>
                  </TableTd>
                  <TableTd>
                    <Text size="sm" fw={500}>{score.play_date}</Text>
                  </TableTd>
                  <TableTd>
                    <Text size="lg" fw={900} c="indigo">{score.score_value}</Text>
                  </TableTd>
                  <TableTd ta="center">
                    {score.screenshot_url ? (
                      <Anchor href={score.screenshot_url} target="_blank" size="xs" fw={700} tt="uppercase" c="indigo">
                        <Group gap={4} justify="center">
                          <Eye size={14} /> View
                        </Group>
                      </Anchor>
                    ) : (
                      <Text size="xs" fs="italic" c="dimmed">No image</Text>
                    )}
                  </TableTd>
                  <TableTd ta="right">
                    <form action={verifyScore}>
                      <input type="hidden" name="scoreId" value={score.id} />
                      <ActionIcon type="submit" variant="light" color="green" size="lg">
                        <Check size={20} />
                      </ActionIcon>
                    </form>
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>

        {(!pendingScores || pendingScores.length === 0) && (
          <Stack align="center" justify="center" py={60} c="dimmed">
            <XCircle size={48} style={{ opacity: 0.2 }} />
            <Text fs="italic">No pending scores to verify.</Text>
          </Stack>
        )}
      </Paper>
    </Container>
  )
}