import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { AuditService } from './auditService';

export class ClinicService {
  static async getProfile(clinicId: string) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });

    if (!clinic) {
      throw new NotFoundError(`Clinic not found with ID ${clinicId}`, 'CLINIC_NOT_FOUND');
    }

    return clinic;
  }

  static async updateProfile(
    clinicId: string,
    updates: { name?: string; address?: string; phone?: string; workingHours?: any },
    actorId: string,
    requestId?: string
  ) {
    const existing = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });

    if (!existing) {
      throw new NotFoundError(`Clinic not found with ID ${clinicId}`, 'CLINIC_NOT_FOUND');
    }

    const updated = await prisma.clinic.update({
      where: { id: clinicId },
      data: updates
    });

    await AuditService.log({
      clinicId,
      actorType: 'MANAGER',
      actorId,
      action: 'UPDATE_CLINIC_PROFILE',
      entity: 'Clinic',
      entityId: clinicId,
      beforeJson: existing,
      afterJson: updated,
      requestId
    });

    return updated;
  }
}

