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

const isFormDataBody = (body: RequestInit['body']) =>
  typeof FormData !== 'undefined' && body instanceof FormData;

const normalizeHeaders = (headers: HeadersInit | undefined): Record<string, string> => {
  if (!headers) {
    return {};
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  if (typeof (headers as Headers).forEach === 'function') {
    const normalized: Record<string, string> = {};
    (headers as Headers).forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }
  return headers as Record<string, string>;
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
  const headers: Record<string, string> = {
    ...headersFor(options),
    ...normalizeHeaders(init.headers),
  };
  if (isFormDataBody(init.body)) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${liveApiBaseUrl()}${path}`, {
    ...init,
    headers,
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

export const multipartBody = (value: FormData): RequestInit => ({
  method: 'POST',
  body: value,
});
