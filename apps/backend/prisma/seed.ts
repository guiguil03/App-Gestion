import { randomUUID } from 'node:crypto';

import { NotificationChannel, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { CardSigningService } from '../src/modules/cards/card-signing.service';

const prisma = new PrismaClient();
const signing = new CardSigningService();

async function main() {
  const { privateKey, publicKey } = signing.generateKeyPair();

  const school = await prisma.school.create({
    data: {
      name: 'École Pilote de Brazzaville',
      attendanceReferenceTime: '07:30',
      attendanceToleranceMinutes: 15,
      cardSigningPrivateKey: privateKey,
      cardSigningPublicKey: publicKey,
    },
  });

  const schoolClass = await prisma.schoolClass.create({
    data: { schoolId: school.id, name: 'CM2 A', promotion: '2026-2027' },
  });

  const passwordHash = await bcrypt.hash('changeme123', 10);
  await prisma.user.create({
    data: { username: 'surveillant1', passwordHash, role: 'SURVEILLANT', schoolId: school.id },
  });
  await prisma.user.create({
    data: { username: 'direction1', passwordHash, role: 'DIRECTION', schoolId: school.id },
  });

  const studentsData = [
    { lastName: 'Moukala', firstName: 'Grace', sex: 'F', dateOfBirth: '2015-03-12' },
    { lastName: 'Nkounkou', firstName: 'David', sex: 'M', dateOfBirth: '2015-07-04' },
  ];

  for (const data of studentsData) {
    const student = await prisma.student.create({
      data: { ...data, schoolId: school.id, schoolClassId: schoolClass.id },
    });

    await prisma.parentGuardian.create({
      data: {
        studentId: student.id,
        fullName: `Parent de ${data.firstName}`,
        relationship: 'Mère',
        phoneNumber: '+242060000000',
        notificationChannel: NotificationChannel.BOTH,
      },
    });

    const cardId = randomUUID();
    const issuedAt = Date.now();
    const { payloadBase64, signature } = signing.sign(
      { cardId, studentId: student.id, schoolId: school.id, issuedAt },
      privateKey,
    );
    await prisma.studentCard.create({
      data: { id: cardId, studentId: student.id, signature, issuedAt: new Date(issuedAt), revoked: false },
    });

    console.log(`QR pour ${data.firstName} ${data.lastName}: ${signing.toQrString(payloadBase64, signature)}`);
  }

  console.log(`École créée: ${school.id}`);
  console.log('Identifiants de test : surveillant1 / direction1, mot de passe "changeme123"');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
