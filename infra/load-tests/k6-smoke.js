import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: Number(__ENV.K6_VUS || 5),
      duration: __ENV.K6_DURATION || '1m',
    },
  },
};

const baseUrl = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

export default function smoke() {
  const health = http.get(`${baseUrl}/api/health`);

  check(health, {
    'health returned 200': (response) => response.status === 200,
    'health payload is ok': (response) => response.json('status') === 'ok',
  });

  sleep(1);
}
