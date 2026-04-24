'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Center, Paper, Title, TextInput, PasswordInput, Button, Text, Anchor, Stack } from '@mantine/core'

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <Center h="100vh" bg="gray.0">
      <Container size="xs" w="100%">
        <Paper withBorder p="xl" radius="md" shadow="md">
          <Title order={2} ta="center" mb="xl">Sign in to your account</Title>
          <form onSubmit={handleLogin}>
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
                placeholder="Your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" fullWidth color="indigo" mt="md">
                Sign in
              </Button>
              {message && <Text ta="center" size="sm" c="red">{message}</Text>}
            </Stack>
          </form>
          <Text ta="center" mt="xl" size="sm">
            Don't have an account?{' '}
            <Anchor href="/auth/signup" fw={700} c="indigo">Sign up</Anchor>
          </Text>
        </Paper>
      </Container>
    </Center>
  );
}
