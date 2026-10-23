const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

/** Uses same-origin /api by default; Vite proxies it to Express during development. */
export const API_BASE_URL = (configuredApiUrl || '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * The current app stores a session token under "circleup-token".
 * If an AuthContext is introduced, replace this getter with that context's token source.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('circleup-token');
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Explicit Authorization headers win; otherwise attach the stored JWT when available.
  if (!headers.has('Authorization')) {
    const token = getAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      headers
    });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0);
  }

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export interface AuthUser {
  id: number | string;
  name: string;
  email: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password })
    }),
  register: (name: string, email: string, password: string) =>
    apiRequest<{ user: AuthUser; token: string }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ name, email, password })
    })
};

export interface ApiPost {
  id: number | string;
  body: string;
  created_at: string;
  user_id?: number | string;
  name?: string;
  email?: string;
  likes: number;
  comments: number;
  liked_by_me?: boolean;
}

export interface ApiComment {
  id: number | string;
  post_id?: number | string;
  user_id?: number | string;
  name?: string;
  body: string;
  created_at: string;
}

export interface ApiCommunity {
  id: number | string;
  name: string;
  description: string;
  members: number;
  joined_by_me?: boolean;
}

export const postsApi = {
  list: async () => (await apiRequest<{ posts: ApiPost[] }>('/posts')).posts,
  create: async (body: string) => (await apiRequest<{ post: ApiPost }>('/posts', {
    method: 'POST',
    body: JSON.stringify({ body })
  })).post,
  toggleLike: (id: number | string) =>
    apiRequest<{ liked: boolean }>(`/posts/${encodeURIComponent(String(id))}/like`, { method: 'POST' }),
  listComments: async (id: number | string) =>
    (await apiRequest<{ comments: ApiComment[] }>(`/posts/${encodeURIComponent(String(id))}/comments`)).comments,
  addComment: async (id: number | string, body: string) =>
    (await apiRequest<{ comment: ApiComment }>(`/posts/${encodeURIComponent(String(id))}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    })).comment
};

export const communitiesApi = {
  list: async () => (await apiRequest<{ communities: ApiCommunity[] }>('/communities')).communities,
  toggleMembership: (id: number | string) =>
    apiRequest<{ joined: boolean }>(`/communities/${encodeURIComponent(String(id))}/join`, { method: 'POST' })
};
