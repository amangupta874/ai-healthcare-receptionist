import { prisma } from '../lib/prisma';
import { EscalationStatus } from '@prisma/client';
import { logger } from '../lib/logger';
import { AuditService } from './auditService';

export interface CreateEscalationDTO {
  clinicId: string;
  userId?: string;
  patientName?: string;
  patientPhone?: string;
  reason: string;
  summary: string;
  requestId?: string;
}

export class EscalationService {
  static async createEscalation(dto: CreateEscalationDTO) {
    const escalation = await prisma.escalation.create({
      data: {
        clinicId: dto.clinicId,
        userId: dto.userId || null,
        patientName: dto.patientName || null,
        patientPhone: dto.patientPhone || null,
        reason: dto.reason,
        summary: dto.summary,
        status: EscalationStatus.OPEN
      }
    });

    logger.warn(`🚨 Escalation created [${escalation.reason}]: ${escalation.summary}`, {
      escalationId: escalation.id,
      clinicId: escalation.clinicId,
      patientPhone: escalation.patientPhone ? '[REDACTED]' : undefined
    });

    await AuditService.log({
      clinicId: dto.clinicId,
      actorType: 'SERVICE',
      actorId: dto.userId || 'SYSTEM',
      action: 'CREATE_ESCALATION',
      entity: 'Escalation',
      entityId: escalation.id,
      afterJson: { reason: escalation.reason, summary: escalation.summary },
      requestId: dto.requestId
    });

    return escalation;
  }

  static async listEscalations(clinicId: string, status?: EscalationStatus) {
    return await prisma.escalation.findMany({
      where: {
        clinicId,
        ...(status ? { status } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

