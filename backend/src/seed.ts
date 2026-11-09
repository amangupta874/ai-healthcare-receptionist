import { PrismaClient, Role, KnowledgeType, KnowledgeStatus } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

export const DEMO_CLINIC_ID = '11111111-1111-1111-1111-111111111111';

export async function seed() {
  console.log('🌱 Starting database seed...');

  // 1. Demo Clinic
  const clinic = await prisma.clinic.upsert({
    where: { id: DEMO_CLINIC_ID },
    update: {},
    create: {
      id: DEMO_CLINIC_ID,
      name: 'City Care Clinic',
      address: '123 Health Avenue, Civil Lines, Jaipur, Rajasthan 302006',
      phone: '+91 98765 43210',
      email: 'reception@citycareclinic.in',
      timezone: 'Asia/Kolkata',
      workingHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '09:00', close: '18:00' },
        sunday: { closed: true }
      },
      isActive: true
    }
  });
  console.log(`✅ Clinic created/verified: ${clinic.name} (${clinic.id})`);

  // 2. Demo Doctors
  const doctorsData = [
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Dr. Priya Sharma',
      specialty: 'Cardiology',
      consultationFee: 600
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Dr. Rajesh Verma',
      specialty: 'General Physician',
      consultationFee: 400
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Dr. Neha Patel',
      specialty: 'Dentistry',
      consultationFee: 500
    }
  ];

  for (const doc of doctorsData) {
    const doctor = await prisma.doctor.upsert({
      where: { id: doc.id },
      update: {
        name: doc.name,
        specialty: doc.specialty,
        consultationFee: doc.consultationFee
      },
      create: {
        id: doc.id,
        clinicId: clinic.id,
        name: doc.name,
        specialty: doc.specialty,
        consultationFee: doc.consultationFee,
        isActive: true
      }
    });

    // Seed Schedules: Monday to Saturday (1 to 6)
    for (let weekday = 1; weekday <= 6; weekday++) {
      const scheduleId = `sched-${doc.id}-${weekday}`;
      const existingSchedule = await prisma.schedule.findFirst({
        where: { doctorId: doctor.id, weekday }
      });

      if (!existingSchedule) {
        await prisma.schedule.create({
          data: {
            id: scheduleId,
            doctorId: doctor.id,
            weekday,
            startTime: '09:00',
            endTime: '17:00',
            slotMinutes: 30
          }
        });
      }
    }
  }
  console.log(`✅ ${doctorsData.length} Doctors and schedules created/verified.`);

  // 3. Approved Knowledge Items
  const knowledgeData = [
    {
      type: KnowledgeType.TIMING,
      question: 'What are the clinic timings?',
      content: 'City Care Clinic is open Monday to Saturday from 09:00 AM to 06:00 PM. The clinic is closed on Sundays.'
    },
    {
      type: KnowledgeType.FEE,
      question: 'What are the consultation fees?',
      content: 'General Physician consultation fee is ₹400. Cardiology consultation is ₹600. Dentistry checkup is ₹500. Free follow-up consultation is provided within 7 days of your first visit.'
    },
    {
      type: KnowledgeType.POLICY,
      question: 'Is parking available at the clinic?',
      content: 'Yes, ample dedicated parking space for both two-wheelers and four-wheelers is available directly in front of the clinic premises free of charge.'
    },
    {
      type: KnowledgeType.POLICY,
      question: 'Do you accept health insurance for cashless treatment?',
      content: 'Yes, City Care Clinic supports cashless insurance claims for Star Health, Care Health, HDFC ERGO, and ICICI Lombard.'
    },
    {
      type: KnowledgeType.FAQ,
      question: 'Do I need an appointment or can I walk in?',
      content: 'Walk-in patients are accepted based on doctor availability, but booking an advance appointment through our Telegram assistant is strongly recommended to avoid waiting.'
    }
  ];

  for (const item of knowledgeData) {
    const existing = await prisma.knowledgeItem.findFirst({
      where: { clinicId: clinic.id, question: item.question }
    });
    if (!existing) {
      await prisma.knowledgeItem.create({
        data: {
          clinicId: clinic.id,
          type: item.type,
          question: item.question,
          content: item.content,
          status: KnowledgeStatus.APPROVED,
          version: 1,
          approvedBy: 'SYSTEM_SEED',
          approvedAt: new Date()
        }
      });
    }
  }
  console.log(`✅ ${knowledgeData.length} Approved Knowledge Items seeded.`);

  // 4. Invite Code for Manager
  const inviteCodeStr = 'MANAGER1';
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  await prisma.inviteCode.upsert({
    where: { code: inviteCodeStr },
    update: { expiresAt },
    create: {
      clinicId: clinic.id,
      code: inviteCodeStr,
      role: Role.MANAGER,
      expiresAt
    }
  });
  console.log(`✅ Manager invite code seeded: ${inviteCodeStr}`);

  console.log('🎉 Seeding completed successfully!');
}

if (require.main === module) {
  seed()
    .catch((e) => {
      console.error('❌ Seeding error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

