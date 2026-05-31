'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, getToken } from '@/lib/api';

interface AgentListItem {
  id: string | null;
  slug: string;
  name: string;
  role: string | null;
  model: string;
  provider: string;
  instructions: string | null;
  isActive: boolean;
  isBuiltin: boolean;
  hasOverride: boolean;
}

const PROVIDER_LABEL: Record<string, string> = {
  ANTHROPIC: 'Anthropic',
  OPENAI: 'OpenAI',
  GEMINI: 'Gemini',
  OPENROUTER: 'OpenRouter',
  OLLAMA: 'Ollama',
};

const BUILTIN_COLORS: Record<string, string> = {
  'product-manager': 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  'tech-lead': 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  validator: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  marketing: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
};

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.request<AgentListItem[]>('/agents');
      setAgents(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      await api.request(`/agents/${id}/toggle`, { method: 'PATCH' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover o agente "${name}"?`)) return;
    try {
      await api.request(`/agents/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const builtins = agents.filter((a) => a.isBuiltin);
  const custom = agents.filter((a) => !a.isBuiltin);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os agentes de IA disponíveis na sua organização.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/workspace/agents/tree">
            <Button variant="outline">Ver hierarquia</Button>
          </Link>
          <Link href="/workspace/agents/new">
            <Button>+ Novo agente</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando agentes…</p>
      ) : (
        <>
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Agentes padrão
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {builtins.map((agent) => (
                <Card
                  key={agent.slug}
                  className={`border ${BUILTIN_COLORS[agent.slug] ?? ''} ${!agent.isActive ? 'opacity-60' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        {agent.role && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{agent.role}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium border">
                          padrão
                        </span>
                        {agent.hasOverride && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                            personalizado
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{PROVIDER_LABEL[agent.provider] ?? agent.provider}</span>
                      <span>·</span>
                      <span className="font-mono">{agent.model}</span>
                    </div>
                    {agent.instructions && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {agent.instructions}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Link href={`/workspace/agents/${agent.id ?? agent.slug}/edit?builtin=${agent.slug}`}>
                        <Button variant="outline" size="sm">
                          {agent.hasOverride ? 'Editar' : 'Personalizar'}
                        </Button>
                      </Link>
                      {agent.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleToggle(agent.id!)}
                        >
                          {agent.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                      )}
                      {agent.id && agent.hasOverride && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(agent.id!, agent.name)}
                        >
                          Resetar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {custom.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Agentes customizados
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {custom.map((agent) => (
                  <Card key={agent.id} className={!agent.isActive ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          {agent.role && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{agent.role}</p>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            agent.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {agent.isActive ? 'ativo' : 'inativo'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{PROVIDER_LABEL[agent.provider] ?? agent.provider}</span>
                        <span>·</span>
                        <span className="font-mono">{agent.model}</span>
                      </div>
                      {agent.instructions && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {agent.instructions}
                        </p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Link href={`/workspace/agents/${agent.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleToggle(agent.id!)}
                        >
                          {agent.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(agent.id!, agent.name)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {custom.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              Nenhum agente customizado ainda.{' '}
              <Link href="/workspace/agents/new" className="underline underline-offset-2">
                Criar um agente
              </Link>
              .
            </p>
          )}
        </>
      )}
    </div>
  );
}
