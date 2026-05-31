'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getToken } from '@/lib/api';

interface Profile {
  sector?: string;
  description?: string;
  businessModel?: string;
  targetAudience?: string;
  tone?: string;
  managerName?: string;
  managerRole?: string;
}
interface KnowledgeDoc {
  id: string;
  title: string;
  type: string | null;
}

const FIELDS: { key: keyof Profile; label: string; area?: boolean }[] = [
  { key: 'sector', label: 'Setor / indústria' },
  { key: 'description', label: 'O que a empresa faz', area: true },
  { key: 'businessModel', label: 'Modelo de negócio', area: true },
  { key: 'targetAudience', label: 'Público-alvo', area: true },
  { key: 'tone', label: 'Tom de voz' },
  { key: 'managerName', label: 'Gestor (nome)' },
  { key: 'managerRole', label: 'Gestor (cargo)' },
];

const DOC_TYPES = ['context', 'decision', 'learning', 'pattern', 'architecture', 'playbook'];

export default function CompanyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({});
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [doc, setDoc] = useState({ title: '', type: 'context', content: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [p, k] = await Promise.all([
      api.request<Profile | null>('/company/profile'),
      api.request<{ data: KnowledgeDoc[] }>('/knowledge'),
    ]);
    setProfile(p ?? {});
    setDocs(k.data);
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    void load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function saveProfile() {
    setError(null);
    setMsg(null);
    try {
      await api.request('/company/profile', { method: 'PUT', body: JSON.stringify(profile) });
      setMsg('Perfil salvo. Os próximos PRDs usarão este contexto.');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addDoc() {
    if (!doc.title || !doc.content) return;
    setError(null);
    try {
      await api.request('/knowledge', { method: 'POST', body: JSON.stringify(doc) });
      setDoc({ title: '', type: 'context', content: '' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function delDoc(id: string) {
    await api.request(`/knowledge/${id}`, { method: 'DELETE' }).catch((e) => setError((e as Error).message));
    await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Empresa</h1>
        <p className="text-sm text-muted-foreground">
          Contexto de negócio que alimenta os agentes (ex.: geração de PRD).
        </p>
      </header>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {msg && <p className="text-sm text-green-600">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil da empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {FIELDS.map(({ key, label, area }) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block text-muted-foreground">{label}</span>
                {area ? (
                  <textarea
                    className="min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={profile[key] ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    value={profile[key] ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                  />
                )}
              </label>
            ))}
            <Button onClick={saveProfile}>Salvar perfil</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Base de conhecimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-md border p-3">
              <Input
                placeholder="Título do documento"
                value={doc.title}
                onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
              />
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={doc.type}
                onChange={(e) => setDoc((d) => ({ ...d, type: e.target.value }))}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Conteúdo (decisões, aprendizados, contexto…)"
                value={doc.content}
                onChange={(e) => setDoc((d) => ({ ...d, content: e.target.value }))}
              />
              <Button onClick={addDoc} disabled={!doc.title || !doc.content}>
                Adicionar documento
              </Button>
            </div>

            <ul className="space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <span>
                    {d.title}{' '}
                    <span className="text-xs text-muted-foreground">({d.type ?? 'context'})</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => delDoc(d.id)}>
                    remover
                  </Button>
                </li>
              ))}
              {docs.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum documento ainda.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
