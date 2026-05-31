'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { api, clearToken, getToken } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

export function ProfileSection() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    void api.request<User>('/auth/me').then(setUser).catch(() => null);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setDark(isDark);
  }

  function logout() {
    clearToken();
    router.push('/login');
  }

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="mt-auto border-t pt-4">
      <div className="flex items-center gap-2 rounded-md px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-none">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
      <button
        onClick={logout}
        className="mt-1 w-full rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Sair
      </button>
    </div>
  );
}
