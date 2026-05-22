import type { DashboardMetric } from './phase14-data.js';

export type CommunicationTemplate = {
  id: string;
  title: string;
  audience: string;
  channel: 'SMS' | 'Email' | 'WhatsApp';
  status: 'Ready' | 'Review';
  english: string;
  nepali: string;
};

export type ModeratedThread = {
  id: string;
  subject: string;
  school: string;
  team: string;
  state: 'Moderated' | 'Approved' | 'Escalated';
  latestNote: string;
  visibility: string;
};

export type DeliveryQueueItem = {
  id: string;
  recipientGroup: string;
  template: string;
  channel: string;
  status: string;
  nextAction: string;
};

export type FamilyCommunicationsSurface = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryAction: string;
  metrics: DashboardMetric[];
  alerts: string[];
  templates: CommunicationTemplate[];
  threads: ModeratedThread[];
  deliveryQueue: DeliveryQueueItem[];
};

const familyCommunicationsSurface: FamilyCommunicationsSurface = {
  eyebrow: 'Family communications',
  title: 'Guardian communications',
  subtitle:
    'Coordinate school-approved family updates, bilingual reminders, delivery status, and moderated conversation threads without exposing private athlete records.',
  primaryAction: 'Prepare family update',
  metrics: [
    { label: 'Families reached', value: '1,284', detail: '96% delivered this week', trend: 'up' },
    { label: 'Open threads', value: '18', detail: '4 need moderation', trend: 'flat' },
    { label: 'Templates ready', value: '12', detail: '6 bilingual', trend: 'up' },
    { label: 'Delivery issues', value: '3', detail: 'Retry queued', trend: 'down' },
  ],
  alerts: [
    'Family inbox health is stable across school, coach, and guardian communication queues.',
    'Kantipur International School has one schedule update ready for guardian delivery.',
    'U14 Basketball waiver reminders are approved for bilingual outreach.',
  ],
  templates: [
    {
      id: 'template-fixture-moved',
      title: 'Fixture moved',
      audience: 'U16 Football guardians',
      channel: 'SMS',
      status: 'Ready',
      english: 'Fixture moved to 14:30 at Dasharath Field B.',
      nepali: 'खेल तालिका १४:३० बजे दशरथ मैदान बीमा सारिएको छ।',
    },
    {
      id: 'template-waiver-reminder',
      title: 'Waiver reminder',
      audience: 'U14 Basketball guardians',
      channel: 'WhatsApp',
      status: 'Review',
      english: 'Please complete the guardian waiver before Friday practice.',
      nepali: 'कृपया शुक्रबारको अभ्यासअघि अभिभावक सहमति पूरा गर्नुहोस्।',
    },
  ],
  threads: [
    {
      id: 'thread-kantipur-u16-fixture',
      subject: 'Fixture time change',
      school: 'Kantipur International School',
      team: 'U16 Football',
      state: 'Moderated',
      latestNote: 'Coach reply waiting for school admin approval',
      visibility: 'Visible to guardians after approval',
    },
    {
      id: 'thread-u14-waiver',
      subject: 'Waiver completion support',
      school: 'Kantipur International School',
      team: 'U14 Basketball',
      state: 'Approved',
      latestNote: 'Sports office sent bilingual reminder',
      visibility: 'Visible to guardians',
    },
  ],
  deliveryQueue: [
    {
      id: 'delivery-fixture-sms',
      recipientGroup: 'U16 Football families',
      template: 'Fixture moved',
      channel: 'SMS',
      status: 'Ready',
      nextAction: 'Send after admin approval',
    },
    {
      id: 'delivery-waiver-whatsapp',
      recipientGroup: 'U14 Basketball families',
      template: 'Waiver reminder',
      channel: 'WhatsApp',
      status: 'Review',
      nextAction: 'Confirm bilingual copy',
    },
  ],
};

export function getFamilyCommunicationsSurface() {
  return familyCommunicationsSurface;
}
