import { describe, expect, it } from 'vitest';
import { QueueNames } from '../src/queues.js';
import { runHealthJob } from '../src/jobs/health.job.js';

describe('worker foundation', () => {
  it('defines the document extraction queue', () => {
    expect(QueueNames.documentExtraction).toBe('document-extraction');
  });

  it('runs the health job', () => {
    expect(runHealthJob()).toEqual({
      status: 'ok',
      service: 'athletiq-worker',
    });
  });
});
