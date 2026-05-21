export const QueueNames = {
  documentExtraction: 'document-extraction',
  notifications: 'notifications',
  reports: 'reports',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];
