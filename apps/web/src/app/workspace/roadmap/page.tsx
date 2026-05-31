'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { api, getToken } from '@/lib/api';

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const;
type Status = (typeof STATUSES)[number];

interface RoadmapRow {
  id: string;
  title: string;
}
interface PrdRow {
  id: string;
  title: string;
}
interface WorkItem {
  id: string;
  type: 'EPIC' | 'FEATURE' | 'STORY' | 'TASK';
  title: string;
  status: Status;
  priority: string;
}
interface RoadmapDetail extends RoadmapRow {
  workItems: WorkItem[];
}

export default function RoadmapPage() {
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState<RoadmapRow[]>([]);
  const [prds, setPrds] = useState<PrdRow[]>([]);
  const [detail, setDetail] = useState<RoadmapDetail | null>(null);
  const [prdId, setPrdId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [r, p] = await Promise.all([
      api.request<{ data: RoadmapRow[] }>('/roadmaps'),
      api.request<{ data: PrdRow[] }>('/prds'),
    ]);
    setRoadmaps(r.data);
    setPrds(p.data);
    if (p.data[0] && !prdId) setPrdId(p.data[0].id);
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
    if (!prdId) return;
    setBusy(true);
    setError(null);
    try {
      const rm = await api.request<RoadmapRow>('/roadmaps/generate', {
        method: 'POST',
        body: JSON.stringify({ prdId }),
      });
      await load();
      await open(rm.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setError(null);
    try {
      setDetail(await api.request<RoadmapDetail>(`/roadmaps/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function move(item: WorkItem, status: Status) {
    setDetail((d) =>
      d ? { ...d, workItems: d.workItems.map((w) => (w.id === item.id ? { ...w, status } : w)) } : d,
    );
    try {
      await api.request(`/work-items/${item.id}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ status, position: 0 }),
      });
    } catch (e) {
      setError((e as Error).message);
      if (detail) await open(detail.id);
    }
  }

  // Kanban mostra apenas as folhas executáveis (tasks); se não houver, mostra stories.
  const cards = (detail?.workItems ?? []).filter((w) => w.type === 'TASK');
  const board = cards.length ? cards : (detail?.workItems ?? []).filter((w) => w.type === 'STORY');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roadmap Builder</h1>
          <p className="text-sm text-muted-foreground">Quebre o PRD em backlog e gerencie no Kanban.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={prdId}
            onChange={(e) => setPrdId(e.target.value)}
          >
            {prds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <Button onClick={generate} disabled={busy || !prdId}>
            {busy ? 'Gerando…' : 'Gerar Roadmap (IA)'}
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {roadmaps.map((r) => (
          <button
            key={r.id}
            onClick={() => open(r.id)}
            className={`rounded-md border px-3 py-1.5 text-sm hover:bg-muted ${
              detail?.id === r.id ? 'border-primary bg-muted' : ''
            }`}
          >
            {r.title}
          </button>
        ))}
        {roadmaps.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum roadmap ainda.</p>
        )}
      </div>

      {detail && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {STATUSES.map((status) => {
            const col = board.filter((w) => w.status === status);
            return (
              <div key={status} className="rounded-lg border bg-muted/30 p-2">
                <div className="mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">
                  {status} · {col.length}
                </div>
                <div className="space-y-2">
                  {col.map((item) => (
                    <div key={item.id} className="rounded-md border bg-background p-2 text-sm shadow-sm">
                      <div className="mb-2">{item.title}</div>
                      <select
                        className="h-7 w-full rounded border border-input bg-background text-xs"
                        value={item.status}
                        onChange={(e) => move(item, e.target.value as Status)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
