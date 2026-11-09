import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { AuditService } from './auditService';

export class DoctorService {
  static async listDoctors(clinicId: string, specialty?: string) {
    const where: any = {
      clinicId,
      isActive: true
    };

    if (specialty) {
      where.specialty = {
        contains: specialty,
        mode: 'insensitive'
      };
    }

    return await prisma.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        clinicId: true,
        name: true,
        specialty: true,
        consultationFee: true,
        isActive: true
      }
    });
  }

  static async getDoctorById(id: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        schedules: true,
        leaves: true
      }
    });

    if (!doctor) {
      throw new NotFoundError(`Doctor not found with ID ${id}`, 'DOCTOR_NOT_FOUND');
    }

    return doctor;
  }

  static async createDoctor(
    clinicId: string,
    data: { name: string; specialty: string; consultationFee: number },
    actorId: string,
    requestId?: string
  ) {
    const doctor = await prisma.doctor.create({
      data: {
        clinicId,
        name: data.name,
        specialty: data.specialty,
        consultationFee: data.consultationFee,
        isActive: true
      }
    });

    await AuditService.log({
      clinicId,
      actorType: 'MANAGER',
      actorId,
      action: 'CREATE_DOCTOR',
      entity: 'Doctor',
      entityId: doctor.id,
      afterJson: doctor,
      requestId
    });

    return doctor;
  }

  static async updateDoctor(
    id: string,
    updates: { name?: string; specialty?: string; consultationFee?: number; isActive?: boolean },
    actorId: string,
    requestId?: string
  ) {
    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Doctor not found with ID ${id}`, 'DOCTOR_NOT_FOUND');
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: updates
    });

    await AuditService.log({
      clinicId: existing.clinicId,
      actorType: 'MANAGER',
      actorId,
      action: 'UPDATE_DOCTOR',
      entity: 'Doctor',
      entityId: id,
      beforeJson: existing,
      afterJson: doctor,
      requestId
    });

    return doctor;
  }

  static async addSchedule(
    doctorId: string,
    scheduleData: { weekday: number; startTime: string; endTime: string; slotMinutes?: number },
    actorId: string,
    requestId?: string
  ) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundError(`Doctor not found with ID ${doctorId}`, 'DOCTOR_NOT_FOUND');
    }

    const schedule = await prisma.schedule.create({
      data: {
        doctorId,
        weekday: scheduleData.weekday,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        slotMinutes: scheduleData.slotMinutes || 30
      }
    });

    await AuditService.log({
      clinicId: doctor.clinicId,
      actorType: 'MANAGER',
      actorId,
      action: 'CREATE_SCHEDULE',
      entity: 'Schedule',
      entityId: schedule.id,
      afterJson: schedule,
      requestId
    });

    return schedule;
  }

  static async getDoctorSchedules(doctorId: string) {
    return await prisma.schedule.findMany({
      where: { doctorId },
      orderBy: { weekday: 'asc' }
    });
  }
}

