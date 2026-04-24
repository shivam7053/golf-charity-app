import SubscribeButton from '@/components/subscribe-button'
import DummyPaymentButton from '@/components/dummy-payment-button'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Container, Paper, Title, Text, Stack, List, ListItem, ThemeIcon, Center, Divider } from '@mantine/core'
import { Check } from 'lucide-react'

export default async function SubscribePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <Center h="100vh" bg="gray.0">
      <Container size="xs" w="100%">
        <Paper withBorder radius="md" shadow="md" style={{ overflow: 'hidden' }}>
          <Paper p="xl" bg="indigo.6" c="white" radius={0} ta="center">
            <Title order={1} fw={900}>Join the Club</Title>
            <Text size="xs" tt="uppercase" fw={700} style={{ letterSpacing: 1.5, opacity: 0.8 }}>Monthly Prize Draw Access</Text>
          </Paper>

          <Stack p="xl" gap="lg">
            <Stack gap={0} align="center">
              <Title order={2} style={{ fontSize: 48, fontWeight: 900 }}>₹499</Title>
              <Text size="sm" c="dimmed" fw={500}>per month</Text>
            </Stack>

            <List
              spacing="sm"
              size="sm"
              center
              icon={<ThemeIcon color="teal" size={20} radius="xl"><Check size={12} /></ThemeIcon>}
            >
              <ListItem>Support your favorite charities</ListItem>
              <ListItem>Monthly Stableford prize pool access</ListItem>
              <ListItem>Track your rolling 5 golf scores</ListItem>
            </List>

          <SubscribeButton />

          <Divider label="OR" labelPosition="center" />

          <div className="pt-2">
            <DummyPaymentButton />
          </div>
          </Stack>
        </Paper>
      </Container>
    </Center>
  )
}
