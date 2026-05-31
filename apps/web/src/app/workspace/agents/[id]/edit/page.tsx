'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const PROVIDERS = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'OPENROUTER', 'OLLAMA'];
const MODELS: Record<string, string[]> = {
  ANTHROPIC: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  OPENAI: ['gpt-4o', 'gpt-4o-mini'],
  GEMINI: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  OPENROUTER: ['openrouter/auto'],
  OLLAMA: ['llama3.2', 'mistral'],
};

interface AgentData {
  id: string;
  name: string;
  role: string | null;
  model: string;
  provider: string;
  instructions: string | null;
  isActive: boolean;
}

export default function EditAgentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const builtinSlug = searchParams.get('builtin');
  const isBuiltinWithoutOverride = builtinSlug && params.id === builtinSlug;

  const [form, setForm] = useState({
    name: '',
    role: '',
    provider: 'ANTHROPIC',
    model: 'claude-opus-4-8',
    instructions: '',
    isActive: true,
    parentId: '',
  });
  const [agentOptions, setAgentOptions] = useState<{ id: string; name: string; role: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'provider' && typeof value === 'string') {
        next.model = MODELS[value]?.[0] ?? prev.model;
      }
      return next;
    });
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [listData, agentData] = await Promise.all([
          api.request<(AgentData & { slug: string; parentId: string | null })[]>('/agents'),
          isBuiltinWithoutOverride ? Promise.resolve(null) : api.request<AgentData & { parentId: string | null }>(`/agents/${params.id}`),
        ]);

        // Populate parent selector (exclude current agent to avoid self-loop)
        setAgentOptions(
          listData
            .filter((a) => a.id && a.id !== params.id)
            .map((a) => ({ id: a.id as string, name: a.name, role: a.role ?? null })),
        );

        if (isBuiltinWithoutOverride) {
          const found = listData.find((a) => a.slug === builtinSlug);
          if (found) {
            setForm({
              name: found.name,
              role: found.role ?? '',
              provider: found.provider,
              model: found.model,
              instructions: found.instructions ?? '',
              isActive: found.isActive,
              parentId: found.parentId ?? '',
            });
          }
        } else if (agentData) {
          setForm({
            name: agentData.name,
            role: agentData.role ?? '',
            provider: agentData.provider,
            model: agentData.model,
            instructions: agentData.instructions ?? '',
            isActive: agentData.isActive,
            parentId: agentData.parentId ?? '',
          });
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        role: form.role || undefined,
        provider: form.provider,
        model: form.model,
        instructions: form.instructions || undefined,
        isActive: form.isActive,
        parentId: form.parentId || null,
      };

      if (isBuiltinWithoutOverride) {
        await api.request('/agents', {
          method: 'POST',
          body: JSON.stringify({ name: builtinSlug, ...payload }),
        });
      } else {
        await api.request(`/agents/${params.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: form.name, ...payload }),
        });
      }
      router.push('/workspace/agents');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/workspace/agents">
          <Button variant="ghost" size="sm">← Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {isBuiltinWithoutOverride ? `Personalizar: ${builtinSlug}` : `Editar agente`}
        </h1>
      </div>

      {builtinSlug && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          Este é um agente padrão. As instruções customizadas são <strong>adicionadas antes</strong> do
          prompt base definido no sistema — elas não substituem o comportamento original.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração do agente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {!builtinSlug && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Papel / especialidade</label>
              <Input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="Ex: Especialista em finanças para startups"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => set('provider', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Modelo</label>
                <select
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {(MODELS[form.provider] ?? []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Agente superior (reporta a)</label>
              <select
                value={form.parentId}
                onChange={(e) => set('parentId', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— nenhum (raiz) —</option>
                {agentOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.role ? ` — ${a.role}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {builtinSlug ? 'Instruções customizadas (prefixadas ao prompt base)' : 'Instruções'}
              </label>
              <textarea
                value={form.instructions}
                onChange={(e) => set('instructions', e.target.value)}
                placeholder="Contexto ou regras adicionais para este agente…"
                rows={6}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <label htmlFor="isActive" className="text-sm">Agente ativo</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/workspace/agents">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
