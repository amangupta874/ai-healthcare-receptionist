import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICE_KEY = process.env.SERVICE_API_KEY!;
const DEMO_CLINIC_ID = '11111111-1111-1111-1111-111111111111';

describe('Document Drafts & Knowledge Activation API', () => {
  let managerTgId: string;
  let draftId: string;

  beforeAll(async () => {
    managerTgId = `mgr_draft_test_${Date.now()}`;
    await prisma.user.create({
      data: {
        telegramId: managerTgId,
        role: 'MANAGER',
        clinicId: DEMO_CLINIC_ID
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { telegramId: managerTgId } });
  });

  it('POST /v1/drafts should create a PENDING document draft', async () => {
    const res = await request(app)
      .post('/v1/drafts')
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', managerTgId)
      .send({
        clinicId: DEMO_CLINIC_ID,
        fileName: 'clinic_policy_2026.pdf',
        extractedJson: {
          timings: 'Monday to Saturday 9:00 AM - 6:00 PM',
          rules: [{ title: 'Emergency Policy', description: 'Emergency cases given priority.' }],
          faqCandidates: [
            {
              question: 'Is wheelchair access available?',
              answer: 'Yes, full wheelchair ramp and lift access is available.'
            }
          ]
        },
        issuesJson: { missing: ['Dr. fees not specified'] }
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    draftId = res.body.id;
  });

  it('POST /v1/drafts/:id/approve should reject non-manager role with 403', async () => {
    const res = await request(app)
      .post(`/v1/drafts/${draftId}/approve`)
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', 'patient_random_tg')
      .send({ approve: true });

    expect(res.status).toBe(403);
  });

  it('POST /v1/drafts/:id/approve should approve draft and activate knowledge items', async () => {
    const res = await request(app)
      .post(`/v1/drafts/${draftId}/approve`)
      .set('x-service-api-key', SERVICE_KEY)
      .set('x-telegram-user-id', managerTgId)
      .send({ approve: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.activatedItemsCount).toBeGreaterThan(0);

    // Verify activated FAQ in live knowledge items
    const knowledgeRes = await request(app)
      .get(`/v1/clinics/${DEMO_CLINIC_ID}/knowledge?type=FAQ`)
      .set('x-service-api-key', SERVICE_KEY);

    expect(knowledgeRes.status).toBe(200);
    const found = knowledgeRes.body.items.some(
      (item: any) => item.question === 'Is wheelchair access available?'
    );
    expect(found).toBe(true);
  });
});
