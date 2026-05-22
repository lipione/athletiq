import type { FamilyCommunicationsState } from './family-communications-types.js';

export const familyCommunicationsFixture: FamilyCommunicationsState = {
  guardianUserId: 'usr_guardian_nima',
  athletes: [
    {
      id: 'ath-nima-rai',
      fullName: 'Nima Rai',
      athletiqId: 'ATH-NP-2026-000184',
      schoolName: 'Kantipur International School',
      relationship: 'mother',
      nextAction: 'Review updated fixture time',
    },
    {
      id: 'ath-sara-rai',
      fullName: 'Sara Rai',
      athletiqId: 'ATH-NP-2026-000231',
      schoolName: 'Kantipur International School',
      relationship: 'mother',
      nextAction: 'Sign basketball waiver',
    },
  ],
  notices: [
    {
      id: 'notice-fixture',
      athleteId: 'ath-nima-rai',
      title: 'Fixture moved',
      body: 'U16 Football now starts at 14:30.',
      category: 'schedule',
      required: true,
      channel: 'sms',
      locale: 'en',
      status: 'unread',
    },
    {
      id: 'notice-waiver',
      athleteId: 'ath-sara-rai',
      title: 'Waiver reminder',
      body: 'कृपया शुक्रबारअघि अभिभावक सहमति पूरा गर्नुहोस्।',
      category: 'announcement',
      required: false,
      channel: 'push',
      locale: 'ne',
      status: 'unread',
    },
  ],
  preferences: [
    { channel: 'push', category: 'announcement', enabled: true, locale: 'ne' },
    { channel: 'sms', category: 'schedule', enabled: false, locale: 'en' },
  ],
  threads: [
    {
      id: 'thread-fixture',
      title: 'Fixture time change',
      schoolName: 'Kantipur International School',
      status: 'moderated',
      latestMessage: 'Coach reply waiting for approval',
      retainedForReview: true,
    },
  ],
  mutations: [],
  moderation: [],
  sync: { retryCount: 0 },
};
