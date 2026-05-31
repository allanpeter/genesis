'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, getToken } from '@/lib/api';

interface PrdRow {
  id: string;
  title: string;
  currentVersion: number;
  ideaId: string | null;
}
interface IdeaRow {
  id: string;
  title: string;
}
interface PrdVersion {
  version: number;
  content: PrdContent;
}
interface PrdContent {
  vision: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  mvp: { scope: string[]; outOfScope: string[] };
}
interface PrdDetail extends PrdRow {
  versions: PrdVersion[];
}

export default function PrdPage() {
  const router = useRouter();
  const [prds, setPrds] = useState<PrdRow[]>([]);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [selected, setSelected] = useState<PrdDetail | null>(null);
  const [ideaId, setIdeaId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [p, i] = await Promise.all([
      api.request<{ data: PrdRow[] }>('/prds'),
      api.request<{ data: IdeaRow[] }>('/ideas'),
    ]);
    setPrds(p.data);
    setIdeas(i.data);
    if (i.data[0] && !ideaId) setIdeaId(i.data[0].id);
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    void load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function generate() {
    if (!ideaId) return;
    setBusy(true);
    setError(null);
    try {
      await api.request('/prds/generate', { method: 'POST', body: JSON.stringify({ ideaId }) });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setError(null);
    try {
      setSelected(await api.request<PrdDetail>(`/prds/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const content = selected?.versions[0]?.content;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PRD Generator</h1>
          <p className="text-sm text-muted-foreground">Transforme uma ideia em um PRD versionado.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={ideaId}
            onChange={(e) => setIdeaId(e.target.value)}
          >
            {ideas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
          <Button onClick={generate} disabled={busy || !ideaId}>
            {busy ? 'Gerando…' : 'Gerar PRD (IA)'}
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {prds.map((p) => (
            <button
              key={p.id}
              onClick={() => open(p.id)}
              className={`w-full rounded-md border p-3 text-left text-sm hover:bg-muted ${
                selected?.id === p.id ? 'border-primary bg-muted' : ''
              }`}
            >
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-muted-foreground">v{p.currentVersion}</div>
            </button>
          ))}
          {prds.length === 0 && <p className="text-sm text-muted-foreground">Nenhum PRD ainda.</p>}
        </div>

        {content ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {selected?.title} · v{selected?.versions[0]?.version}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Section title="Visão">
                <p>{content.vision}</p>
              </Section>
              <Section title="Requisitos funcionais">
                <List items={content.functionalRequirements} />
              </Section>
              <Section title="Requisitos não-funcionais">
                <List items={content.nonFunctionalRequirements} />
              </Section>
              <Section title="MVP — escopo">
                <List items={content.mvp.scope} />
              </Section>
              <Section title="Fora do MVP">
                <List items={content.mvp.outOfScope} />
              </Section>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Selecione um PRD para ver o conteúdo.</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-muted-foreground">—</p>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
