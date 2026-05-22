import type { FamilyOutboundMutation } from './family-communications-types.js';

export function buildFamilyDashboardRequest(baseUrl: string, token: string) {
  return {
    url: `${baseUrl}/communications/family-dashboard`,
    init: {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  };
}

export function buildFamilyMutationSyncRequest(
  baseUrl: string,
  clientId: string,
  mutations: FamilyOutboundMutation[],
  token: string,
  schoolId: string,
) {
  return {
    url: `${baseUrl}/sync/mutations`,
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        schoolId,
        mutations: mutations.map((mutation) => ({
          id: mutation.mutationId,
          mutationType: mutation.mutationType,
          payload: mutation.payload,
        })),
      }),
    },
  };
}
