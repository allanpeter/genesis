'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { api, getToken } from '@/lib/api';

interface AgentNode {
  id: string | null;
  slug: string;
  name: string;
  role: string | null;
  model: string;
  provider: string;
  isActive: boolean;
  isBuiltin: boolean;
  hasOverride: boolean;
  parentId: string | null;
  children: AgentNode[];
}

const BUILTIN_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  'product-manager': {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-300 dark:border-blue-700',
    dot: 'bg-blue-500',
  },
  'tech-lead': {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-300 dark:border-purple-700',
    dot: 'bg-purple-500',
  },
  validator: {
    bg: 'bg-green-50 dark:bg-green-950/40',
    border: 'border-green-300 dark:border-green-700',
    dot: 'bg-green-500',
  },
  marketing: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-300 dark:border-orange-700',
    dot: 'bg-orange-500',
  },
};

const DEFAULT_COLOR = {
  bg: 'bg-muted/50',
  border: 'border-border',
  dot: 'bg-muted-foreground',
};

function AgentCard({ node }: { node: AgentNode }) {
  const colors = BUILTIN_COLORS[node.slug] ?? DEFAULT_COLOR;
  const editHref = node.id
    ? `/workspace/agents/${node.id}/edit${node.isBuiltin ? `?builtin=${node.slug}` : ''}`
    : `/workspace/agents/new?preset=${node.slug}`;

  return (
    <div
      className={`relative w-44 rounded-xl border-2 px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${colors.bg} ${colors.border} ${!node.isActive ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug">{node.name}</p>
          {node.role && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{node.role}</p>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground">
          {node.model.split('-').slice(0, 2).join('-')}
        </span>
        <Link href={editHref}>
          <button className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground">
            editar
          </button>
        </Link>
      </div>
      {node.isBuiltin && (
        <span className="absolute -top-2 right-2 rounded-full border bg-background px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          {node.hasOverride ? 'custom' : 'padrão'}
        </span>
      )}
    </div>
  );
}

function TreeNode({ node }: { node: AgentNode }) {
  const hasChildren = node.children.length > 0;
  return (
    <div className="flex flex-col items-center">
      <AgentCard node={node} />

      {hasChildren && (
        <div className="flex flex-col items-center">
          {/* vertical line down from card */}
          <div className="h-8 w-px bg-border" />

          {node.children.length === 1 ? (
            /* single child: straight line */
            <TreeNode node={node.children[0]!} />
          ) : (
            /* multiple children: fork */
            <div className="flex items-start gap-8">
              {node.children.map((child, i) => {
                const isFirst = i === 0;
                const isLast = i === node.children.length - 1;
                const isMid = !isFirst && !isLast;
                return (
                  <div key={child.id ?? child.slug} className="flex flex-col items-center">
                    {/* horizontal + vertical connector */}
                    <div className="relative flex h-8 items-end justify-center">
                      {/* horizontal bar (rendered on first child to span all) */}
                      {isFirst && (
                        <div
                          className="absolute top-0 h-px bg-border"
                          style={{
                            left: '50%',
                            /* extends right for the full siblings gap — approximated by the parent flex gap (2rem * n) */
                            width: `${(node.children.length - 1) * 5}rem`,
                          }}
                        />
                      )}
                      {/* vertical drop down to child */}
                      <div className="h-8 w-px bg-border" />
                    </div>
                    <TreeNode node={child} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentsTreePage() {
  const router = useRouter();
  const [roots, setRoots] = useState<AgentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    void api
      .request<AgentNode[]>('/agents/tree')
      .then(setRoots)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/workspace/agents">
              <Button variant="ghost" size="sm">← Voltar</Button>
            </Link>
            <h1 className="text-2xl font-bold">Hierarquia de agentes</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize as relações de reporte entre agentes. Defina o agente pai no formulário de
            edição.
          </p>
        </div>
        <Link href="/workspace/agents/new">
          <Button>+ Novo agente</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : roots.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
          <p className="text-sm">Nenhum agente configurado ainda.</p>
          <Link href="/workspace/agents/new">
            <Button variant="outline">Criar primeiro agente</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto pb-8">
          <div className="flex min-w-max gap-16 px-8 pt-4">
            {roots.map((root) => (
              <TreeNode key={root.id ?? root.slug} node={root} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
