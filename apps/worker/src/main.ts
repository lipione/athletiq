import { runHealthJob } from './jobs/health.job.js';
import { workerEnv } from './env.js';

function main() {
  const health = runHealthJob();
  console.log(`${health.service} ready in ${workerEnv.NODE_ENV}`);
}

main();
