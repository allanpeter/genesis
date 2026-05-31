'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { api, getToken } from '@/lib/api';

type ArtifactType = 'prd' | 'roadmap' | 'validation' | 'marketing';

interface Agent { slug: string; name: string; role: string }
interface IdeaRow { id: string; title: string }
interface Msg { role: 'USER' | 'ASSISTANT'; content: string; createdAt?: string }
interface ConvDetail { id: string; title: string; messages: Msg[]; updatedAt: string }
interface ConvSummary { id: string; title: string; updatedAt: string }

const AGENT_ARTIFACT: Record<string, ArtifactType> = {
  'product-manager': 'prd',
  'tech-lead': 'roadmap',
  validator: 'validation',
  marketing: 'marketing',
};

const AGENT_ARTIFACT_LABEL: Record<ArtifactType, string> = {
  prd: 'Gerar PRD',
  roadmap: 'Gerar Roadmap',
  validation: 'Gerar Análise de Viabilidade',
  marketing: 'Gerar Plano de Marketing',
};

/** Extrai o slug do agente do título "[slug] ..." */
function slugFromTitle(title: string): string {
  return title.match(/^\[([^\]]+)\]/)?.[1] ?? 'product-manager';
}

/** Label amigável do título sem o [slug] prefixo */
function labelFromTitle(title: string): string {
  return title.replace(/^\[[^\]]+\]\s*/, '');
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function ChatPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [history, setHistory] = useState<ConvSummary[]>([]);
  const [agentSlug, setAgentSlug] = useState('product-manager');
  const [ideaId, setIdeaId] = useState('');
  const [conv, setConv] = useState<ConvDetail | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [artifact, setArtifact] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    const res = await api.request<ConvSummary[]>('/conversations');
    setHistory(res);
  }

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    void Promise.all([
      api.request<Agent[]>('/conversations/agents'),
      api.request<{ data: IdeaRow[] }>('/ideas?pageSize=100'),
      api.request<ConvSummary[]>('/conversations'),
    ]).then(([a, i, h]) => {
      setAgents(a);
      setIdeas(i.data);
      setHistory(h);
      if (i.data[0]) setIdeaId(i.data[0].id);
    }).catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages]);

  async function resume(id: string) {
    setBusy(true); setError(null); setArtifact(null);
    try {
      const c = await api.request<ConvDetail>(`/conversations/${id}`);
      setConv(c);
      setAgentSlug(slugFromTitle(c.title));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function start() {
    setBusy(true); setError(null); setArtifact(null); setConv(null);
    try {
      const c = await api.request<ConvDetail>('/conversations/start', {
        method: 'POST',
        body: JSON.stringify({ agentSlug, ideaId: ideaId || undefined }),
      });
      setConv(c);
      await loadHistory();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!conv || !input.trim() || busy) return;
    const userMsg = input.trim();
    setInput('');
    setBusy(true); setError(null);
    setConv((c) => c ? { ...c, messages: [...c.messages, { role: 'USER', content: userMsg }] } : c);
    try {
      const reply = await api.request<{ content: string }>(`/conversations/${conv.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content: userMsg }),
      });
      setConv((c) => c ? { ...c, messages: [...c.messages, { role: 'ASSISTANT', content: reply.content }] } : c);
      await loadHistory();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function generate() {
    if (!conv) return;
    setBusy(true); setError(null);
    const art = AGENT_ARTIFACT[agentSlug] ?? 'prd';
    try {
      const res = await api.request<{ artifact: string; result: unknown }>(`/conversations/${conv.id}/generate`, {
        method: 'POST',
        body: JSON.stringify({ artifact: art }),
      });
      setArtifact(res.result as Record<string, unknown>);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const artLabel = AGENT_ARTIFACT_LABEL[AGENT_ARTIFACT[agentSlug] ?? 'prd'];
  const messages = conv?.messages ?? [];

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col space-y-3">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Agentes</h1>
        <p className="text-sm text-muted-foreground">
          Converse com um agente especialista antes de gerar o artefato.
        </p>
      </header>

      {error && <p className="text-sm text-red-500 shrink-0">{error}</p>}

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Sidebar: histórico de conversas */}
        <aside className="flex w-52 shrink-0 flex-col rounded-lg border bg-card overflow-hidden">
          <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Conversas
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>
            )}
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => resume(h.id)}
                className={`w-full px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-border/50 ${
                  conv?.id === h.id ? 'bg-muted' : ''
                }`}
              >
                <div className="text-xs font-medium truncate">{labelFromTitle(h.title)}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="rounded bg-primary/10 px-1 text-primary">
                    {slugFromTitle(h.title).replace('product-manager', 'PM').replace('tech-lead', 'TL').replace('validator', 'Val').replace('marketing', 'Mkt')}
                  </span>
                  <span>{relativeDate(h.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main: config + chat */}
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {/* Config bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shrink-0">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={agentSlug}
              onChange={(e) => setAgentSlug(e.target.value)}
              disabled={!!conv}
            >
              {agents.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </select>
            <select
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={ideaId}
              onChange={(e) => setIdeaId(e.target.value)}
              disabled={!!conv}
            >
              <option value="">— sem ideia vinculada —</option>
              {ideas.map((i) => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </select>
            <Button onClick={start} disabled={busy} variant={conv ? 'outline' : 'default'} size="sm">
              {conv ? 'Nova conversa' : 'Iniciar'}
            </Button>
            {conv && (
              <Button onClick={generate} disabled={busy} size="sm">
                {busy ? 'Aguarde…' : artLabel}
              </Button>
            )}
          </div>

          {/* Chat + artifact */}
          <div className="flex min-h-0 flex-1 gap-3">
            <div className="flex flex-1 flex-col rounded-lg border bg-card min-w-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && !busy && (
                  <p className="text-center text-sm text-muted-foreground pt-8">
                    {history.length > 0
                      ? 'Selecione uma conversa à esquerda para retomar, ou inicie uma nova.'
                      : 'Selecione um agente, vincule uma ideia e clique em Iniciar.'}
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                        m.role === 'USER'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {busy && conv && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground animate-pulse">
                      Pensando…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {conv && (
                <div className="flex items-end gap-2 border-t p-3 shrink-0">
                  <textarea
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    rows={3}
                    placeholder="Sua resposta… (Enter envia, Shift+Enter quebra linha)"
                    value={input}
                    disabled={busy}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
                    }}
                  />
                  <Button onClick={send} disabled={busy || !input.trim()} size="sm">
                    Enviar
                  </Button>
                </div>
              )}
            </div>

            {/* Artifact panel */}
            {artifact && (
              <div className="w-[380px] shrink-0 overflow-y-auto rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold text-sm">{artLabel.replace('Gerar ', '')}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setArtifact(null)}>✕</Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {JSON.stringify(artifact, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
