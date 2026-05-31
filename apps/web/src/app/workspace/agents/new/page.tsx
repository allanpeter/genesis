'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface AgentOption { id: string; name: string; role: string | null }

export default function NewAgentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    role: '',
    provider: 'ANTHROPIC',
    model: 'claude-opus-4-8',
    instructions: '',
    parentId: '',
  });
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .request<AgentOption[]>('/agents')
      .then((list) => setAgentOptions(list.filter((a) => a.id !== null) as AgentOption[]))
      .catch(() => null);
  }, []);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'provider') {
        next.model = MODELS[value]?.[0] ?? '';
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.request('/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          role: form.role || undefined,
          provider: form.provider,
          model: form.model,
          instructions: form.instructions || undefined,
          parentId: form.parentId || null,
        }),
      });
      router.push('/workspace/agents');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/workspace/agents">
          <Button variant="ghost" size="sm">← Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold">Novo agente</h1>
      </div>

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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Analista Financeiro"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use um slug como <code>product-manager</code> para personalizar um agente padrão.
              </p>
            </div>

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
              <label className="text-sm font-medium">Instruções customizadas</label>
              <textarea
                value={form.instructions}
                onChange={(e) => set('instructions', e.target.value)}
                placeholder="Instruções adicionais para o agente. Para agentes padrão, estas instruções são adicionadas antes do prompt base do .md."
                rows={6}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/workspace/agents">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : 'Criar agente'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
