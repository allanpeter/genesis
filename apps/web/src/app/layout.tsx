import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Genesis',
  description: 'Transforme ideias em produtos com agentes de IA.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Apply saved theme before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
