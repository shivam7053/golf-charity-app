'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Center, Paper, Title, TextInput, PasswordInput, Button, Text, Anchor, Stack } from '@mantine/core'

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for a confirmation link!');
    }
  };

  return (
    <Center h="100vh" bg="gray.0">
      <Container size="xs" w="100%">
        <Paper withBorder p="xl" radius="md" shadow="md">
          <Title order={2} ta="center" mb="xl">Create your account</Title>
          <form onSubmit={handleSignUp}>
            <Stack gap="md">
              <TextInput
                label="Email address"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PasswordInput
                label="Password"
                placeholder="Choose a strong password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" fullWidth color="indigo" mt="md">
                Sign up
              </Button>
              {message && <Text ta="center" size="sm" fw={500}>{message}</Text>}
            </Stack>
          </form>
          <Text ta="center" mt="xl" size="sm">
            Already have an account?{' '}
            <Anchor href="/auth/login" fw={700} c="indigo">Log in</Anchor>
          </Text>
        </Paper>
      </Container>
    </Center>
  );
}
