import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { AppointmentStatus } from '@prisma/client';

export interface AvailableSlot {
  startsAt: string; // ISO 8601
  endsAt: string;   // ISO 8601
  formattedTime: string; // "10:00 AM"
}

export class AvailabilityService {
  /**
   * Computes open appointment slots for a doctor on a given date (YYYY-MM-DD) in Asia/Kolkata timezone.
   */
  static async getAvailableSlots(doctorId: string, targetDateStr: string): Promise<{
    doctorId: string;
    doctorName: string;
    specialty: string;
    consultationFee: number;
    date: string;
    slots: AvailableSlot[];
  }> {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        clinic: true,
        schedules: true,
        leaves: true
      }
    });

    if (!doctor || !doctor.isActive) {
      throw new NotFoundError(`Active doctor not found with ID ${doctorId}`, 'DOCTOR_NOT_FOUND');
    }

    // Parse date YYYY-MM-DD (target date is in Asia/Kolkata timezone)
    const [year, month, day] = targetDateStr.split('-').map(Number);
    if (!year || !month || !day) {
      throw new NotFoundError('Invalid date format. Expected YYYY-MM-DD', 'INVALID_DATE_FORMAT');
    }

    // Target date in UTC boundaries matching the IST calendar day
    // IST is UTC+05:30. Midnight IST on YYYY-MM-DD is (YYYY-MM-DD 00:00:00 +05:30) => UTC: previous day 18:30:00
    const istMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
    const istEndOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000);

    // Day of week in IST
    // Date in IST:
    const istDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const weekday = istDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if doctor is on leave on this date
    const onLeave = doctor.leaves.some((leave) => {
      const leaveDate = new Date(leave.date);
      return (
        leaveDate.getUTCFullYear() === year &&
        leaveDate.getUTCMonth() === month - 1 &&
        leaveDate.getUTCDate() === day
      );
    });

    if (onLeave) {
      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        consultationFee: doctor.consultationFee,
        date: targetDateStr,
        slots: []
      };
    }

    // Check schedules for this weekday
    const daySchedules = doctor.schedules.filter((s) => s.weekday === weekday);
    if (daySchedules.length === 0) {
      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        consultationFee: doctor.consultationFee,
        date: targetDateStr,
        slots: []
      };
    }

    // Query booked appointments for this doctor on target date
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: AppointmentStatus.BOOKED,
        startsAt: {
          gte: istMidnight,
          lte: istEndOfDay
        }
      },
      select: { startsAt: true }
    });

    const bookedTimes = new Set(bookedAppointments.map((a) => a.startsAt.toISOString()));

    // Generate slots
    const now = new Date();
    const availableSlots: AvailableSlot[] = [];

    for (const schedule of daySchedules) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const slotMinutes = schedule.slotMinutes || 30;

      let currentSlotIstMinutes = startHour * 60 + startMin;
      const endIstMinutes = endHour * 60 + endMin;

      while (currentSlotIstMinutes + slotMinutes <= endIstMinutes) {
        const slotH = Math.floor(currentSlotIstMinutes / 60);
        const slotM = currentSlotIstMinutes % 60;

        // Slot start time in UTC
        // IST = UTC + 5:30 => UTC = IST - 5:30
        const slotStartUtc = new Date(
          Date.UTC(year, month - 1, day, slotH, slotM, 0) - 5.5 * 60 * 60 * 1000
        );
        const slotEndUtc = new Date(slotStartUtc.getTime() + slotMinutes * 60 * 1000);

        // Filter out past slots (current time + 10 min buffer)
        if (slotStartUtc.getTime() > now.getTime() + 10 * 60 * 1000) {
          // Check if not already booked
          if (!bookedTimes.has(slotStartUtc.toISOString())) {
            const period = slotH >= 12 ? 'PM' : 'AM';
            const displayH = slotH % 12 === 0 ? 12 : slotH % 12;
            const displayM = slotM < 10 ? `0${slotM}` : slotM;
            const formattedTime = `${displayH}:${displayM} ${period}`;

            availableSlots.push({
              startsAt: slotStartUtc.toISOString(),
              endsAt: slotEndUtc.toISOString(),
              formattedTime
            });
          }
        }

        currentSlotIstMinutes += slotMinutes;
      }
    }

    return {
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      consultationFee: doctor.consultationFee,
      date: targetDateStr,
      slots: availableSlots
    };
  }
}

