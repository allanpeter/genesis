'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, getToken, me } from '@/lib/api';
import type { AuthUser } from '@genesis/shared';

interface IdeaRow {
  id: string;
  title: string;
  status: string;
  category: string | null;
}

export default function IdeaHubPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    void (async () => {
      try {
        setUser(await me());
        const res = await api.request<{ data: IdeaRow[] }>('/ideas');
        setIdeas(res.data);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [router]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Idea Hub</h1>
        <p className="text-sm text-muted-foreground">
          {user ? `Org: ${user.organizationId} · ${user.email}` : 'Carregando…'}
        </p>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => (
          <Card key={idea.id}>
            <CardHeader>
              <CardTitle className="text-base">{idea.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{idea.category ?? 'sem categoria'}</span>
              <span className="rounded bg-muted px-2 py-1">{idea.status}</span>
            </CardContent>
          </Card>
        ))}
        {ideas.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">Nenhuma ideia ainda.</p>
        )}
      </div>
    </div>
  );
}
