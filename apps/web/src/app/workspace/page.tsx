'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getToken } from '@/lib/api';

type Complexity = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  status: string;
  complexity: Complexity | null;
  revenuePotential: number | null;
  ecosystemSynergy: number | null;
  estimatedMvpDays: number | null;
  viabilityScore: number | null;
}

const COMPLEXITY_INV: Record<Complexity, number> = { LOW: 100, MEDIUM: 66, HIGH: 33, VERY_HIGH: 0 };

/** Score de priorização: receita (0.5) + sinergia (0.2) + facilidade de execução (0.3). */
function priorityScore(i: Idea): number {
  const rev = i.revenuePotential ?? 0;
  const syn = i.ecosystemSynergy ?? 0;
  const ease = i.complexity ? COMPLEXITY_INV[i.complexity] : 50;
  return Math.round(rev * 0.5 + syn * 0.2 + ease * 0.3);
}

const EMPTY = {
  title: '',
  description: '',
  category: '',
  tags: '',
  complexity: 'MEDIUM' as Complexity,
  revenuePotential: 50,
  ecosystemSynergy: 50,
  estimatedMvpDays: 30,
};

export default function IdeaHubPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sort, setSort] = useState<'priority' | 'recent'>('priority');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.request<{ data: Idea[] }>('/ideas?pageSize=100');
    setIdeas(res.data);
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    void load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const sorted = useMemo(() => {
    const list = [...ideas];
    if (sort === 'priority') list.sort((a, b) => priorityScore(b) - priorityScore(a));
    return list;
  }, [ideas, sort]);

  function startEdit(idea: Idea) {
    setEditingId(idea.id);
    setForm({
      title: idea.title,
      description: idea.description ?? '',
      category: idea.category ?? '',
      tags: idea.tags.join(', '),
      complexity: idea.complexity ?? 'MEDIUM',
      revenuePotential: idea.revenuePotential ?? 50,
      ecosystemSynergy: idea.ecosystemSynergy ?? 50,
      estimatedMvpDays: idea.estimatedMvpDays ?? 30,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY });
    setError(null);
  }

  async function save() {
    if (form.title.trim().length < 3) {
      setError('Título precisa de pelo menos 3 caracteres.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      description: form.description || undefined,
      category: form.category || undefined,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      complexity: form.complexity,
      revenuePotential: Number(form.revenuePotential),
      ecosystemSynergy: Number(form.ecosystemSynergy),
      estimatedMvpDays: Number(form.estimatedMvpDays),
    };
    try {
      if (editingId) {
        await api.request(`/ideas/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setEditingId(null);
      } else {
        await api.request('/ideas', { method: 'POST', body: JSON.stringify(payload) });
      }
      setForm({ ...EMPTY });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (editingId === id) cancelEdit();
    await api
      .request(`/ideas/${id}`, { method: 'DELETE' })
      .catch((e) => setError((e as Error).message));
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Idea Hub</h1>
          <p className="text-sm text-muted-foreground">
            Capture todas as ideias e priorize por receita × esforço.
          </p>
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as 'priority' | 'recent')}
        >
          <option value="priority">Ordenar: prioridade</option>
          <option value="recent">Ordenar: recentes</option>
        </select>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? 'Editar ideia' : 'Nova ideia'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Input
            placeholder="Categoria"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <textarea
            className="min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            placeholder="Tags (separadas por vírgula)"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.complexity}
            onChange={(e) => setForm((f) => ({ ...f, complexity: e.target.value as Complexity }))}
          >
            <option value="LOW">Complexidade: Baixa</option>
            <option value="MEDIUM">Complexidade: Média</option>
            <option value="HIGH">Complexidade: Alta</option>
            <option value="VERY_HIGH">Complexidade: Muito alta</option>
          </select>
          <NumberField
            label="Potencial de receita (0-100)"
            value={form.revenuePotential}
            onChange={(v) => setForm((f) => ({ ...f, revenuePotential: v }))}
          />
          <NumberField
            label="Sinergia com ecossistema (0-100)"
            value={form.ecosystemSynergy}
            onChange={(v) => setForm((f) => ({ ...f, ecosystemSynergy: v }))}
          />
          <NumberField
            label="Tempo de MVP (dias)"
            value={form.estimatedMvpDays}
            onChange={(v) => setForm((f) => ({ ...f, estimatedMvpDays: v }))}
          />
          <div className="flex items-center gap-2 md:col-span-2">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar ideia'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((idea) => (
          <Card key={idea.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <CardTitle className="text-base">{idea.title}</CardTitle>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                  title="Score de prioridade"
                >
                  {priorityScore(idea)}
                </span>
                {idea.viabilityScore != null && (
                  <span
                    className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    title="Score de viabilidade (Validation Engine)"
                  >
                    viab. {idea.viabilityScore}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {idea.description && <p className="line-clamp-2">{idea.description}</p>}
              <div className="flex flex-wrap gap-1">
                {idea.tags.map((t) => (
                  <span key={t} className="rounded bg-muted px-1.5 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span>
                  {idea.category ?? 'sem categoria'} · {idea.complexity ?? '—'}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(idea)}
                    className={editingId === idea.id ? 'text-primary' : ''}
                  >
                    editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(idea.id)}>
                    remover
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {ideas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ideia ainda.</p>}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
