'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, getToken, login } from '@/lib/api';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  async function accept() {
    setBusy(true); setError(null);
    try {
      const body: Record<string, string> = { token };
      if (!isLoggedIn) {
        if (!name.trim() || !password.trim()) {
          setError('Preencha nome e senha para criar sua conta.');
          setBusy(false);
          return;
        }
        body.name = name.trim();
        body.password = password;
      }

      const res = await api.request<{ message: string; organizationId?: string; email?: string; userId?: string }>(
        '/members/accept',
        { method: 'POST', body: JSON.stringify(body) },
      );

      if (!isLoggedIn && res.email) {
        try {
          await login(res.email, password);
        } catch {
          // Login falhou — usuário vai ao /login manual
        }
      }

      setSuccess(true);
      setTimeout(() => router.push('/workspace'), 2000);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold">Bem-vindo(a)!</p>
          <p className="text-muted-foreground">Redirecionando para o workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Convite Genesis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoggedIn
              ? 'Clique abaixo para aceitar o convite e entrar na organização.'
              : 'Crie sua conta para aceitar o convite.'}
          </p>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20">{error}</p>}

        {!isLoggedIn && (
          <div className="space-y-3">
            <Input
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
            <Input
              type="password"
              placeholder="Crie uma senha (mín. 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => { if (e.key === 'Enter') void accept(); }}
            />
          </div>
        )}

        <Button className="w-full" onClick={accept} disabled={busy}>
          {busy ? 'Processando…' : 'Aceitar convite'}
        </Button>

        {!isLoggedIn && (
          <p className="text-center text-xs text-muted-foreground">
            Já tem conta?{' '}
            <button onClick={() => router.push('/login')} className="underline">
              Fazer login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
