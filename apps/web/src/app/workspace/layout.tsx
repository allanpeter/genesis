import Link from 'next/link';
import {
  Bot,
  GitBranch,
  Lightbulb,
  LineChart,
  Map,
  Megaphone,
  Plug,
  ScrollText,
  Workflow,
} from 'lucide-react';

const NAV = [
  { href: '/workspace', label: 'Idea Hub', icon: Lightbulb },
  { href: '/workspace/prd', label: 'PRD', icon: ScrollText },
  { href: '/workspace/roadmap', label: 'Roadmap', icon: Map },
  { href: '/workspace/agents', label: 'Agentes', icon: Bot },
  { href: '/workspace/knowledge', label: 'Knowledge', icon: GitBranch },
  { href: '/workspace/automation', label: 'Automação', icon: Workflow },
  { href: '/workspace/integrations', label: 'Integrações', icon: Plug },
  { href: '/workspace/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/workspace/metrics', label: 'Métricas', icon: LineChart },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r bg-card p-4">
        <div className="mb-6 px-2 text-xl font-bold tracking-tight">Genesis</div>
        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
