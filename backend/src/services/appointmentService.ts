import { prisma } from '../lib/prisma';
import { AppointmentStatus, Role } from '@prisma/client';
import { AppError, ConflictError, NotFoundError } from '../lib/errors';
import { AuditService } from './auditService';
import { EscalationService } from './escalationService';
import crypto from 'crypto';

export interface ConfirmationPayload {
  confirmed: boolean;
  confirmationId: string;
}

export interface BookAppointmentDTO {
  clinicId: string;
  doctorId: string;
  startsAt: string; // ISO 8601
  patientName: string;
  patientPhone: string;
  confirmation: ConfirmationPayload;
  idempotencyKey?: string;
}

// In-memory verification attempt tracker (keyed by telegramId or IP)
const verificationAttempts: Map<string, { attempts: number; lockedUntil: number }> = new Map();

function generateBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'APT-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class AppointmentService {
  static async bookAppointment(dto: BookAppointmentDTO, actorId: string, requestId?: string) {
    // 1. Mandatory explicit confirmation enforcement
    if (!dto.confirmation || dto.confirmation.confirmed !== true || !dto.confirmation.confirmationId) {
      throw new AppError(
        'Explicit patient confirmation is strictly required to execute a booking.',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }

    // 2. Validate startsAt
    const startsAtDate = new Date(dto.startsAt);
    if (isNaN(startsAtDate.getTime())) {
      throw new AppError('Invalid startsAt timestamp.', 400, 'INVALID_TIMESTAMP');
    }

    if (startsAtDate.getTime() < Date.now()) {
      throw new AppError('Cannot book an appointment in the past.', 400, 'PAST_SLOT_NOT_ALLOWED');
    }

    // Default slot duration: 30 minutes
    const endsAtDate = new Date(startsAtDate.getTime() + 30 * 60 * 1000);

    return await prisma.$transaction(async (tx) => {
      // 3. Check for existing active booking at this slot for this doctor
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId: dto.doctorId,
          startsAt: startsAtDate,
          status: AppointmentStatus.BOOKED
        }
      });

      if (existing) {
        throw new ConflictError(
          'This appointment slot has already been booked by another patient.',
          'SLOT_ALREADY_BOOKED'
        );
      }

      // 4. Resolve or create patient user
      let patient = await tx.user.findFirst({
        where: {
          OR: [
            { telegramId: actorId },
            { phone: dto.patientPhone }
          ]
        }
      });

      if (!patient) {
        patient = await tx.user.create({
          data: {
            telegramId: actorId,
            name: dto.patientName,
            phone: dto.patientPhone,
            role: Role.PATIENT,
            clinicId: dto.clinicId
          }
        });
      } else {
        // Update contact if provided
        patient = await tx.user.update({
          where: { id: patient.id },
          data: {
            name: dto.patientName || patient.name,
            phone: dto.patientPhone || patient.phone,
            clinicId: dto.clinicId
          }
        });
      }

      // 5. Generate unique booking code
      let bookingCode = generateBookingCode();
      let codeExists = await tx.appointment.findUnique({ where: { bookingCode } });
      while (codeExists) {
        bookingCode = generateBookingCode();
        codeExists = await tx.appointment.findUnique({ where: { bookingCode } });
      }

      // 6. Create appointment
      const appointment = await tx.appointment.create({
        data: {
          clinicId: dto.clinicId,
          doctorId: dto.doctorId,
          patientId: patient.id,
          patientName: dto.patientName,
          patientPhone: dto.patientPhone,
          startsAt: startsAtDate,
          endsAt: endsAtDate,
          status: AppointmentStatus.BOOKED,
          bookingCode
        },
        include: {
          doctor: { select: { name: true, specialty: true, consultationFee: true } }
        }
      });

      // 7. Write audit log
      await AuditService.log(
        {
          clinicId: dto.clinicId,
          actorType: 'PATIENT',
          actorId,
          action: 'BOOK_APPOINTMENT',
          entity: 'Appointment',
          entityId: appointment.id,
          afterJson: {
            bookingCode: appointment.bookingCode,
            doctorId: appointment.doctorId,
            startsAt: appointment.startsAt,
            confirmationId: dto.confirmation.confirmationId
          },
          requestId
        },
        tx
      );

      return {
        appointmentId: appointment.id,
        bookingCode: appointment.bookingCode,
        doctorName: appointment.doctor.name,
        specialty: appointment.doctor.specialty,
        consultationFee: appointment.doctor.consultationFee,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        status: appointment.status
      };
    });
  }

  static async verifyPatient(
    trackingKey: string,
    bookingCode: string,
    phoneOrName?: string
  ): Promise<{
    verified: boolean;
    attemptsRemaining: number;
    locked: boolean;
    appointment: any | null;
  }> {
    const now = Date.now();
    const tracker = verificationAttempts.get(trackingKey) || { attempts: 0, lockedUntil: 0 };

    if (tracker.lockedUntil > now) {
      const waitMinutes = Math.ceil((tracker.lockedUntil - now) / 60000);
      return {
        verified: false,
        attemptsRemaining: 0,
        locked: true,
        appointment: null
      };
    }

    const cleanCode = bookingCode.trim().toUpperCase();
    const appointment = await prisma.appointment.findUnique({
      where: { bookingCode: cleanCode },
      include: {
        doctor: { select: { id: true, name: true, specialty: true, consultationFee: true } },
        clinic: { select: { id: true, name: true, address: true, phone: true } }
      }
    });

    let isMatch = false;
    if (appointment) {
      if (phoneOrName) {
        const cleanInput = phoneOrName.trim().toLowerCase();
        const phoneMatch = appointment.patientPhone && appointment.patientPhone.includes(cleanInput);
        const nameMatch = appointment.patientName && appointment.patientName.toLowerCase().includes(cleanInput);
        isMatch = Boolean(phoneMatch || nameMatch);
      } else {
        isMatch = true;
      }
    }

    if (isMatch && appointment) {
      // Reset attempts on successful verification
      verificationAttempts.delete(trackingKey);
      return {
        verified: true,
        attemptsRemaining: 3,
        locked: false,
        appointment: {
          id: appointment.id,
          bookingCode: appointment.bookingCode,
          clinicId: appointment.clinicId,
          clinicName: appointment.clinic.name,
          doctorId: appointment.doctorId,
          doctorName: appointment.doctor.name,
          specialty: appointment.doctor.specialty,
          consultationFee: appointment.doctor.consultationFee,
          patientName: appointment.patientName,
          startsAt: appointment.startsAt.toISOString(),
          endsAt: appointment.endsAt.toISOString(),
          status: appointment.status
        }
      };
    }

    // Increment failed attempts
    tracker.attempts += 1;
    const remaining = Math.max(0, 3 - tracker.attempts);

    if (tracker.attempts >= 3) {
      tracker.lockedUntil = now + 15 * 60 * 1000; // 15 minute lockout
      verificationAttempts.set(trackingKey, tracker);

      // Auto-escalate to clinic staff
      if (appointment) {
        await EscalationService.createEscalation({
          clinicId: appointment.clinicId,
          reason: 'VERIFICATION_FAILURE_LOCKOUT',
          summary: `Patient failed verification 3 times for booking code ${bookingCode}.`,
          patientName: appointment.patientName,
          patientPhone: appointment.patientPhone
        });
      }

      return {
        verified: false,
        attemptsRemaining: 0,
        locked: true,
        appointment: null
      };
    }

    verificationAttempts.set(trackingKey, tracker);
    return {
      verified: false,
      attemptsRemaining: remaining,
      locked: false,
      appointment: null
    };
  }

  static async cancelAppointment(
    appointmentId: string,
    confirmation: ConfirmationPayload,
    actorId: string,
    reason?: string,
    requestId?: string
  ) {
    if (!confirmation || confirmation.confirmed !== true || !confirmation.confirmationId) {
      throw new AppError(
        'Explicit patient confirmation is required to cancel an appointment.',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!existing) {
        throw new NotFoundError(`Appointment not found with ID ${appointmentId}`, 'APPOINTMENT_NOT_FOUND');
      }

      if (existing.status === AppointmentStatus.CANCELLED) {
        throw new AppError('This appointment has already been cancelled.', 400, 'ALREADY_CANCELLED');
      }

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CANCELLED }
      });

      await AuditService.log(
        {
          clinicId: existing.clinicId,
          actorType: 'PATIENT',
          actorId,
          action: 'CANCEL_APPOINTMENT',
          entity: 'Appointment',
          entityId: appointmentId,
          beforeJson: { status: existing.status },
          afterJson: { status: updated.status, reason, confirmationId: confirmation.confirmationId },
          requestId
        },
        tx
      );

      return {
        success: true,
        appointmentId: updated.id,
        bookingCode: updated.bookingCode,
        status: updated.status
      };
    });
  }

  static async rescheduleAppointment(
    appointmentId: string,
    newStartsAtStr: string,
    confirmation: ConfirmationPayload,
    actorId: string,
    requestId?: string
  ) {
    if (!confirmation || confirmation.confirmed !== true || !confirmation.confirmationId) {
      throw new AppError(
        'Explicit patient confirmation is required to reschedule an appointment.',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }

    const newStartsAt = new Date(newStartsAtStr);
    if (isNaN(newStartsAt.getTime()) || newStartsAt.getTime() < Date.now()) {
      throw new AppError('Invalid or past slot for rescheduling.', 400, 'INVALID_SLOT');
    }
    const newEndsAt = new Date(newStartsAt.getTime() + 30 * 60 * 1000);

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!existing) {
        throw new NotFoundError(`Appointment not found with ID ${appointmentId}`, 'APPOINTMENT_NOT_FOUND');
      }

      // Check if new slot is taken
      const slotConflict = await tx.appointment.findFirst({
        where: {
          doctorId: existing.doctorId,
          startsAt: newStartsAt,
          status: AppointmentStatus.BOOKED
        }
      });

      if (slotConflict) {
        throw new ConflictError('The requested new appointment slot is already booked.', 'SLOT_UNAVAILABLE');
      }

      // Mark old appointment rescheduled
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.RESCHEDULED }
      });

      // Create new appointment with new slot
      const newBookingCode = generateBookingCode();
      const newAppointment = await tx.appointment.create({
        data: {
          clinicId: existing.clinicId,
          doctorId: existing.doctorId,
          patientId: existing.patientId,
          patientName: existing.patientName,
          patientPhone: existing.patientPhone,
          startsAt: newStartsAt,
          endsAt: newEndsAt,
          status: AppointmentStatus.BOOKED,
          bookingCode: newBookingCode
        }
      });

      await AuditService.log(
        {
          clinicId: existing.clinicId,
          actorType: 'PATIENT',
          actorId,
          action: 'RESCHEDULE_APPOINTMENT',
          entity: 'Appointment',
          entityId: newAppointment.id,
          beforeJson: { oldAppointmentId: existing.id, oldStartsAt: existing.startsAt },
          afterJson: {
            newAppointmentId: newAppointment.id,
            newStartsAt: newAppointment.startsAt,
            newBookingCode: newAppointment.bookingCode
          },
          requestId
        },
        tx
      );

      return {
        success: true,
        oldAppointmentId: existing.id,
        newAppointmentId: newAppointment.id,
        newBookingCode: newAppointment.bookingCode,
        startsAt: newAppointment.startsAt.toISOString(),
        status: newAppointment.status
      };
    });
  }
}

