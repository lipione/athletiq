export type LiveApiSession = {
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    roles?: string[];
    role?: string;
    schoolIds?: string[];
  };
};

export type LiveApiOptions = {
  session?: LiveApiSession;
  devActor?: {
    id: string;
    role: string;
  };
};

const defaultApiUrl = 'http://localhost:4000/api';

export const liveApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? process.env.WEB_PUBLIC_API_URL ?? defaultApiUrl;

const headersFor = (options: LiveApiOptions = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.session?.accessToken) {
    headers.Authorization = `Bearer ${options.session.accessToken}`;
    return headers;
  }

  if (options.devActor) {
    headers['x-athletiq-user-id'] = options.devActor.id;
    headers['x-athletiq-user-role'] = options.devActor.role;
  }

  return headers;
};

export class LiveApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
  }
}

export async function liveApiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: LiveApiOptions = {},
): Promise<T> {
  const response = await fetch(`${liveApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...headersFor(options),
      ...(init.headers ?? {}),
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `API request failed with ${response.status}`;
    throw new LiveApiError(message, response.status, payload);
  }

  return payload as T;
}

export const jsonBody = (value: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(value),
});
