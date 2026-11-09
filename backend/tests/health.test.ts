import request from 'supertest';
import { app } from '../src/app';

describe('Health API', () => {
  it('GET /health should return 200 and database connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });
});

