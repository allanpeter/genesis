import type { AuthTokens, AuthUser } from '@genesis/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';
const ACCESS_KEY = 'genesis.accessToken';
const REFRESH_KEY = 'genesis.refreshToken';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

function setTokens(tokens: AuthTokens): void {
  window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearToken(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

/** Tenta renovar o access token usando o refresh token. Retorna true se conseguiu. */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const tokens = (await res.json()) as AuthTokens;
    setTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cliente fetch tipado.
 * Em 401: tenta renovar o token uma vez e repete a requisição.
 * Se o refresh falhar, limpa os tokens e redireciona para /login.
 */
async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, init, true);
    }
    // Refresh falhou — sessão expirou de vez
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login?reason=session_expired';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const tokens = await request<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(tokens);
  return tokens;
}

export function me(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me');
}

export const api = { request };
