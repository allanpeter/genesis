'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { api, getToken } from '@/lib/api';

type ArtifactType = 'prd' | 'roadmap' | 'validation' | 'marketing';

interface Agent { slug: string; name: string; role: string }
interface IdeaRow { id: string; title: string }
interface Msg { role: 'USER' | 'ASSISTANT'; content: string }
interface ConvDetail { id: string; messages: Msg[] }

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

export default function ChatPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [agentSlug, setAgentSlug] = useState('product-manager');
  const [ideaId, setIdeaId] = useState('');
  const [conv, setConv] = useState<ConvDetail | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [artifact, setArtifact] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    void Promise.all([
      api.request<Agent[]>('/conversations/agents'),
      api.request<{ data: IdeaRow[] }>('/ideas?pageSize=100'),
    ]).then(([a, i]) => {
      setAgents(a);
      setIdeas(i.data);
      if (i.data[0]) setIdeaId(i.data[0].id);
    }).catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages, streaming]);

  async function start() {
    setBusy(true); setError(null); setArtifact(null); setConv(null);
    try {
      const c = await api.request<ConvDetail>('/conversations/start', {
        method: 'POST',
        body: JSON.stringify({ agentSlug, ideaId: ideaId || undefined }),
      });
      setConv(c);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!conv || !input.trim() || busy) return;
    const userMsg = input.trim();
    setInput('');
    setBusy(true); setError(null); setStreaming('');
    setConv((c) => c ? { ...c, messages: [...c.messages, { role: 'USER', content: userMsg }] } : c);
    try {
      const reply = await api.request<{ content: string }>(`/conversations/${conv.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content: userMsg }),
      });
      setConv((c) => c ? { ...c, messages: [...c.messages, { role: 'ASSISTANT', content: reply.content }] } : c);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); setStreaming(''); }
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
    <div className="flex h-[calc(100vh-2rem)] flex-col space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Agentes</h1>
        <p className="text-sm text-muted-foreground">
          Converse com um agente especialista antes de gerar o artefato.
        </p>
      </header>

      {/* Config bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
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

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Chat area */}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex flex-1 flex-col rounded-lg border bg-card">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !busy && (
              <p className="text-center text-sm text-muted-foreground pt-8">
                Selecione um agente, vincule uma ideia (opcional) e clique em Iniciar.
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
            {busy && streaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2 text-sm">
                  {streaming}
                </div>
              </div>
            )}
            {busy && !streaming && conv && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                  Pensando…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {conv && (
            <div className="flex items-end gap-2 border-t p-3">
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
          <div className="w-[420px] shrink-0 overflow-y-auto rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">{artLabel.replace('Gerar ', '')}</h2>
              <Button variant="ghost" size="sm" onClick={() => setArtifact(null)}>✕</Button>
            </div>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
              {JSON.stringify(artifact, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
