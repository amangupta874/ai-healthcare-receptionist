import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from './auditService';

export class IdentityService {
  static async resolveIdentity(telegramId: string) {
    let user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          role: Role.PATIENT
        }
      });
    }

    return {
      userId: user.id,
      role: user.role,
      clinicId: user.clinicId,
      telegramId: user.telegramId,
      name: user.name,
      phone: user.phone
    };
  }

  static async linkInviteCode(telegramId: string, inviteCode: string, name?: string, requestId?: string) {
    return await prisma.$transaction(async (tx) => {
      const invite = await tx.inviteCode.findUnique({
        where: { code: inviteCode.trim().toUpperCase() }
      });

      if (!invite) {
        throw new NotFoundError('Invalid invite code. Please check with your clinic administrator.', 'INVITE_CODE_NOT_FOUND');
      }

      if (invite.usedAt) {
        throw new AppError('This invite code has already been redeemed.', 400, 'INVITE_CODE_ALREADY_USED');
      }

      if (new Date() > invite.expiresAt) {
        throw new AppError('This invite code has expired.', 400, 'INVITE_CODE_EXPIRED');
      }

      let user = await tx.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            telegramId,
            role: invite.role,
            clinicId: invite.clinicId,
            name: name || null
          }
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            role: invite.role,
            clinicId: invite.clinicId,
            name: name || user.name
          }
        });
      }

      // Mark invite code used
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: {
          usedAt: new Date(),
          usedBy: user.id
        }
      });

      const clinic = await tx.clinic.findUnique({
        where: { id: invite.clinicId }
      });

      await AuditService.log(
        {
          clinicId: invite.clinicId,
          actorType: 'MANAGER',
          actorId: user.telegramId,
          action: 'LINK_INVITE_CODE',
          entity: 'User',
          entityId: user.id,
          afterJson: { role: user.role, clinicId: user.clinicId, inviteCode },
          requestId
        },
        tx
      );

      return {
        success: true,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: clinic?.name || 'Clinic'
      };
    });
  }
}

