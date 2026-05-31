'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getToken } from '@/lib/api';

interface Member {
  userId: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string; isActive: boolean };
}
interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Dono',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
};

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [m, i] = await Promise.all([
      api.request<Member[]>('/members'),
      api.request<PendingInvite[]>('/members/invites').catch(() => [] as PendingInvite[]),
    ]);
    setMembers(m);
    setInvites(i);
  }

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    void load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function invite() {
    if (!email.trim()) return;
    setBusy(true); setError(null); setInviteUrl(null);
    try {
      const res = await api.request<{ inviteUrl: string; expiresAt: string }>('/members/invite', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role }),
      });
      setInviteUrl(res.inviteUrl);
      setEmail('');
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function revoke(id: string) {
    await api.request(`/members/invites/${id}`, { method: 'DELETE' }).catch((e) => setError((e as Error).message));
    await load();
  }

  async function remove(userId: string) {
    await api.request(`/members/${userId}`, { method: 'DELETE' }).catch((e) => setError((e as Error).message));
    await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Membros</h1>
        <p className="text-sm text-muted-foreground">Gerencie quem tem acesso à sua organização.</p>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">Convidar membro</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs text-muted-foreground">E-mail</label>
            <Input
              type="email"
              placeholder="colega@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void invite(); }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Papel</label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Membro</option>
              <option value="VIEWER">Visualizador</option>
            </select>
          </div>
          <Button onClick={invite} disabled={busy || !email.trim()}>
            {busy ? 'Enviando…' : 'Enviar convite'}
          </Button>
        </CardContent>
        {inviteUrl && (
          <CardContent className="pt-0">
            <div className="rounded-md bg-green-50 p-3 text-xs dark:bg-green-900/20">
              <p className="mb-1 font-medium text-green-700 dark:text-green-400">Convite enviado! Link para compartilhar:</p>
              <code className="break-all text-green-800 dark:text-green-300">{inviteUrl}</code>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Membros ativos ({members.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    m.role === 'OWNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    m.role === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                  {m.role !== 'OWNER' && (
                    <Button variant="ghost" size="sm" onClick={() => remove(m.userId)}>
                      remover
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Convites pendentes ({invites.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[inv.role] ?? inv.role} · expira {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revoke(inv.id)}>
                  revogar
                </Button>
              </div>
            ))}
            {invites.length === 0 && <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
