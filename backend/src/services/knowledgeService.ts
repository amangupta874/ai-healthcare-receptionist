import { prisma } from '../lib/prisma';
import { DraftStatus, KnowledgeStatus, KnowledgeType } from '@prisma/client';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from './auditService';

export class KnowledgeService {
  static async getApprovedKnowledge(clinicId: string, type?: KnowledgeType) {
    return await prisma.knowledgeItem.findMany({
      where: {
        clinicId,
        status: KnowledgeStatus.APPROVED,
        ...(type ? { type } : {})
      },
      select: {
        id: true,
        type: true,
        question: true,
        content: true,
        version: true,
        approvedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createDraft(
    clinicId: string,
    uploadedBy: string,
    fileName: string,
    extractedJson: any,
    issuesJson?: any,
    requestId?: string
  ) {
    const draft = await prisma.documentDraft.create({
      data: {
        clinicId,
        uploadedBy,
        fileName,
        status: DraftStatus.PENDING,
        extractedJson,
        issuesJson: issuesJson || null
      }
    });

    await AuditService.log({
      clinicId,
      actorType: 'MANAGER',
      actorId: uploadedBy,
      action: 'CREATE_DOCUMENT_DRAFT',
      entity: 'DocumentDraft',
      entityId: draft.id,
      afterJson: { fileName, status: draft.status },
      requestId
    });

    return draft;
  }

  static async getDraft(draftId: string) {
    const draft = await prisma.documentDraft.findUnique({
      where: { id: draftId }
    });
    if (!draft) {
      throw new NotFoundError(`Draft not found with ID ${draftId}`, 'DRAFT_NOT_FOUND');
    }
    return draft;
  }

  static async approveDraft(draftId: string, actorId: string, requestId?: string) {
    return await prisma.$transaction(async (tx) => {
      const draft = await tx.documentDraft.findUnique({
        where: { id: draftId }
      });

      if (!draft) {
        throw new NotFoundError(`Draft not found with ID ${draftId}`, 'DRAFT_NOT_FOUND');
      }

      if (draft.status === DraftStatus.APPROVED) {
        throw new AppError('This draft has already been approved and activated.', 400, 'DRAFT_ALREADY_APPROVED');
      }

      // 1. Mark draft as APPROVED
      const updatedDraft = await tx.documentDraft.update({
        where: { id: draftId },
        data: { status: DraftStatus.APPROVED }
      });

      const extracted = draft.extractedJson as any;
      let activatedCount = 0;

      // 2. Activate FAQs
      if (Array.isArray(extracted?.faqCandidates)) {
        for (const faq of extracted.faqCandidates) {
          if (faq.question && faq.answer) {
            await tx.knowledgeItem.create({
              data: {
                clinicId: draft.clinicId,
                type: KnowledgeType.FAQ,
                question: faq.question,
                content: faq.answer,
                status: KnowledgeStatus.APPROVED,
                version: 1,
                approvedBy: actorId,
                approvedAt: new Date()
              }
            });
            activatedCount++;
          }
        }
      }

      // 3. Activate Timings
      if (extracted?.timings) {
        await tx.knowledgeItem.create({
          data: {
            clinicId: draft.clinicId,
            type: KnowledgeType.TIMING,
            question: 'Clinic Timings',
            content: typeof extracted.timings === 'string' ? extracted.timings : JSON.stringify(extracted.timings),
            status: KnowledgeStatus.APPROVED,
            version: 1,
            approvedBy: actorId,
            approvedAt: new Date()
          }
        });
        activatedCount++;
      }

      // 4. Activate Fees / Rules
      if (Array.isArray(extracted?.rules)) {
        for (const rule of extracted.rules) {
          await tx.knowledgeItem.create({
            data: {
              clinicId: draft.clinicId,
              type: KnowledgeType.POLICY,
              question: rule.title || 'Clinic Policy',
              content: rule.description || String(rule),
              status: KnowledgeStatus.APPROVED,
              version: 1,
              approvedBy: actorId,
              approvedAt: new Date()
            }
          });
          activatedCount++;
        }
      }

      // 5. Update doctors and fees if present
      if (Array.isArray(extracted?.doctors)) {
        for (const doc of extracted.doctors) {
          if (doc.name && doc.specialty) {
            const fee = Number(doc.consultationFee) || 400;
            const existingDoc = await tx.doctor.findFirst({
              where: { clinicId: draft.clinicId, name: doc.name }
            });
            if (existingDoc) {
              await tx.doctor.update({
                where: { id: existingDoc.id },
                data: { specialty: doc.specialty, consultationFee: fee }
              });
            } else {
              await tx.doctor.create({
                data: {
                  clinicId: draft.clinicId,
                  name: doc.name,
                  specialty: doc.specialty,
                  consultationFee: fee,
                  isActive: true
                }
              });
            }
          }
        }
      }

      await AuditService.log(
        {
          clinicId: draft.clinicId,
          actorType: 'MANAGER',
          actorId,
          action: 'APPROVE_DOCUMENT_DRAFT',
          entity: 'DocumentDraft',
          entityId: draft.id,
          afterJson: { draftId, activatedCount, status: 'APPROVED' },
          requestId
        },
        tx
      );

      return {
        success: true,
        draftId: updatedDraft.id,
        status: updatedDraft.status,
        activatedItemsCount: activatedCount
      };
    });
  }

  static async rejectDraft(draftId: string, actorId: string, requestId?: string) {
    const draft = await prisma.documentDraft.findUnique({ where: { id: draftId } });
    if (!draft) {
      throw new NotFoundError(`Draft not found with ID ${draftId}`, 'DRAFT_NOT_FOUND');
    }

    const updated = await prisma.documentDraft.update({
      where: { id: draftId },
      data: { status: DraftStatus.REJECTED }
    });

    await AuditService.log({
      clinicId: draft.clinicId,
      actorType: 'MANAGER',
      actorId,
      action: 'REJECT_DOCUMENT_DRAFT',
      entity: 'DocumentDraft',
      entityId: draft.id,
      afterJson: { status: 'REJECTED' },
      requestId
    });

    return updated;
  }
}

