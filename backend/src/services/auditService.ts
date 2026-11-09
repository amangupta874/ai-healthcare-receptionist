import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export interface CreateAuditLogParams {
  clinicId: string;
  actorType: 'PATIENT' | 'MANAGER' | 'STAFF' | 'SERVICE';
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  requestId?: string;
}

export class AuditService {
  static async log(params: CreateAuditLogParams, tx?: any) {
    const client = tx || prisma;
    try {
      return await client.auditLog.create({
        data: {
          clinicId: params.clinicId,
          actorType: params.actorType,
          actorId: params.actorId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          beforeJson: params.beforeJson ? (params.beforeJson as any) : null,
          afterJson: params.afterJson ? (params.afterJson as any) : null,
          requestId: params.requestId || null
        }
      });
    } catch (err) {
      logger.error('Failed to write audit log', { error: String(err), ...params });
    }
  }
}
