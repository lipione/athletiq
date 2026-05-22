import type { SyncMutation } from './match-day-types.js';

export type MobileRequestDescriptor = {
  url: string;
  init: {
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
  };
};

export type SecureTokenAdapter = {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
};

const TOKEN_KEY = 'athletiq.mobile.access-token';

function jsonHeaders(token?: string) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function buildLoginRequest(
  baseUrl: string,
  email: string,
  password: string,
): MobileRequestDescriptor {
  return {
    url: `${baseUrl}/auth/login`,
    init: {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password }),
    },
  };
}

export function buildMatchPacketRequest(
  baseUrl: string,
  matchId: string,
  token: string,
): MobileRequestDescriptor {
  return {
    url: `${baseUrl}/matches/${matchId}`,
    init: {
      method: 'GET',
      headers: jsonHeaders(token),
    },
  };
}

export function buildQrScanRequest(
  baseUrl: string,
  code: string,
  token: string,
): MobileRequestDescriptor {
  return {
    url: `${baseUrl}/qr/scan`,
    init: {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ code }),
    },
  };
}

export function buildSubmitResultRequest(
  baseUrl: string,
  matchId: string,
  token: string,
  input: { homeScore: number; awayScore: number; notes?: string },
): MobileRequestDescriptor {
  return {
    url: `${baseUrl}/matches/${matchId}/submit-result`,
    init: {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(input),
    },
  };
}

export function buildPushMutationsRequest(
  baseUrl: string,
  clientId: string,
  mutations: SyncMutation[],
  token: string,
  schoolId?: string,
): MobileRequestDescriptor {
  const body = {
    clientId,
    mutations: mutations.map((mutation) => ({
      mutationId: mutation.mutationId,
      mutationType: mutation.mutationType,
      payload: mutation.payload,
    })),
    ...(schoolId ? { schoolId } : {}),
  };

  return {
    url: `${baseUrl}/sync/mutations/push`,
    init: {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(body),
    },
  };
}

export function createSecureTokenAdapter(): SecureTokenAdapter {
  return {
    async getToken() {
      const secureStore = await import('expo-secure-store');
      return secureStore.getItemAsync(TOKEN_KEY);
    },
    async setToken(token: string) {
      const secureStore = await import('expo-secure-store');
      await secureStore.setItemAsync(TOKEN_KEY, token);
    },
    async clearToken() {
      const secureStore = await import('expo-secure-store');
      await secureStore.deleteItemAsync(TOKEN_KEY);
    },
  };
}

export function createQrScannerDescriptor() {
  return {
    module: 'expo-camera',
    permission: 'camera',
    supportedTypes: ['qr'] as const,
    purpose: 'Scan athlete, team, match, venue, and check-in QR codes.',
  };
}

export function createLocalDatabaseDescriptor() {
  return {
    module: 'expo-sqlite',
    databaseName: 'athletiq-match-day.db',
    tables: ['match_packets', 'sync_mutations', 'conflicts'] as const,
    durability: 'append-only mutation log with retained conflicts',
  };
}
