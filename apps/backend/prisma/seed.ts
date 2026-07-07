import { randomUUID } from 'node:crypto';

import { AttendanceDirection, Checkpoint, NotificationChannel, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { CardSigningService } from '../src/modules/cards/card-signing.service';

const prisma = new PrismaClient();
const signing = new CardSigningService();

const HISTORY_DAYS = 14;
const STUDENTS_PER_CLASS = 7;

const CLASSES = [
  { name: 'CP A', promotion: '2026-2027' },
  { name: 'CE2 A', promotion: '2026-2027' },
  { name: 'CM1 B', promotion: '2026-2027' },
  { name: 'CM2 A', promotion: '2026-2027' },
];

// Prénoms/noms fictifs (contexte École Pilote de Brazzaville) — réutilisés en
// boucle si le nombre d'élèves dépasse la liste, ce n'est qu'un jeu de démo.
const STUDENT_NAMES: Array<{ lastName: string; firstName: string; sex: 'M' | 'F' }> = [
  { lastName: 'Moukala', firstName: 'Grace', sex: 'F' },
  { lastName: 'Nkounkou', firstName: 'David', sex: 'M' },
  { lastName: 'Batantou', firstName: 'Merveille', sex: 'F' },
  { lastName: 'Malonga', firstName: 'Christ', sex: 'M' },
  { lastName: 'Nzaba', firstName: 'Divine', sex: 'F' },
  { lastName: 'Loubassou', firstName: 'Prince', sex: 'M' },
  { lastName: 'Mbemba', firstName: 'Chancelvie', sex: 'F' },
  { lastName: 'Kimbembe', firstName: 'Yannick', sex: 'M' },
  { lastName: 'Ondongo', firstName: 'Bénie', sex: 'F' },
  { lastName: 'Mabiala', firstName: 'Junior', sex: 'M' },
  { lastName: 'Tchicaya', firstName: 'Rosalie', sex: 'F' },
  { lastName: 'Bikindou', firstName: 'Espoir', sex: 'M' },
  { lastName: 'Goma', firstName: 'Nadège', sex: 'F' },
  { lastName: 'Massamba', firstName: 'Ryan', sex: 'M' },
  { lastName: 'Ibara', firstName: 'Précieuse', sex: 'F' },
  { lastName: 'Samba', firstName: 'Ken', sex: 'M' },
  { lastName: 'Kouka', firstName: 'Gaëlle', sex: 'F' },
  { lastName: 'Miambanzila', firstName: 'Christian', sex: 'M' },
  { lastName: 'Malanda', firstName: 'Aurel', sex: 'M' },
  { lastName: 'Kaya', firstName: 'Sarah', sex: 'F' },
  { lastName: 'Ngoma', firstName: 'Emmanuel', sex: 'M' },
  { lastName: 'Foutou', firstName: 'Belvie', sex: 'F' },
  { lastName: 'Ganga', firstName: 'Trésor', sex: 'M' },
  { lastName: 'Diansoukou', firstName: 'Fardel', sex: 'M' },
  { lastName: 'Loemba', firstName: 'Christevie', sex: 'F' },
  { lastName: 'Poaty', firstName: 'Darel', sex: 'M' },
  { lastName: 'Bakekolo', firstName: 'Anaelle', sex: 'F' },
  { lastName: 'Dzon', firstName: 'Loïc', sex: 'M' },
];

function randomBirthDateForClass(classIndex: number): string {
  // classIndex 0 = CP (plus jeunes) ... 3 = CM2 (plus âgés), écart d'un an par classe.
  const baseYear = 2019 - classIndex;
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${baseYear}-${month}-${day}`;
}

function randomAttendanceTimestamp(dayOffset: number, isLate: boolean): Date {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  // Référence 07:30, tolérance 15 min (seuil de retard 07:45) : les horaires
  // ci-dessous restent dans un intervalle réaliste de chaque côté du seuil.
  const minutesPastSeven = isLate
    ? 46 + Math.floor(Math.random() * 30) // 07:46–08:15
    : 10 + Math.floor(Math.random() * 20); // 07:10–07:29
  date.setHours(7, minutesPastSeven, 0, 0);
  return date;
}

async function resetDatabase() {
  // Ordre respectant les contraintes de clé étrangère.
  await prisma.attendanceRecord.deleteMany();
  await prisma.studentCard.deleteMany();
  await prisma.parentGuardian.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.schoolClass.deleteMany();
  await prisma.school.deleteMany();
}

async function main() {
  await resetDatabase();

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

  const schoolClasses = [];
  for (const classData of CLASSES) {
    schoolClasses.push(await prisma.schoolClass.create({ data: { schoolId: school.id, ...classData } }));
  }

  const passwordHash = await bcrypt.hash('changeme123', 10);
  await prisma.user.create({
    data: {
      username: 'surveillant1',
      passwordHash,
      role: 'SURVEILLANT',
      schoolId: school.id,
      // Assigné à 2 classes (CM1 B, CM2 A) pour tester le sélecteur multi-classes côté mobile.
      assignedClasses: { connect: [{ id: schoolClasses[2].id }, { id: schoolClasses[3].id }] },
    },
  });
  await prisma.user.create({
    data: { username: 'direction1', passwordHash, role: 'DIRECTION', schoolId: school.id },
  });
  await prisma.user.create({
    // Compte de test PARENT : le backend ne filtre pas encore les élèves par
    // parent réel (aucun lien User↔ParentGuardian en base), ce compte voit
    // donc tous les élèves de l'école comme n'importe quel autre rôle — à
    // corriger dans une prochaine itération si le scoping réel est nécessaire.
    data: { username: 'parent1', passwordHash, role: 'PARENT', schoolId: school.id },
  });

  let studentCount = 0;
  let firstQr: string | null = null;

  for (const [classIndex, schoolClass] of schoolClasses.entries()) {
    for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
      const nameData = STUDENT_NAMES[studentCount % STUDENT_NAMES.length];
      studentCount++;

      const student = await prisma.student.create({
        data: {
          lastName: nameData.lastName,
          firstName: nameData.firstName,
          sex: nameData.sex,
          dateOfBirth: randomBirthDateForClass(classIndex),
          schoolId: school.id,
          schoolClassId: schoolClass.id,
        },
      });

      await prisma.parentGuardian.create({
        data: {
          studentId: student.id,
          fullName: `Parent de ${nameData.firstName}`,
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

      if (!firstQr) {
        firstQr = signing.toQrString(payloadBase64, signature);
        console.log(`QR pour ${nameData.firstName} ${nameData.lastName}: ${firstQr}`);
      }

      // Historique de présence fictif sur les 14 derniers jours : ~85% présent
      // à l'heure, ~10% en retard, ~5% absent (aucun pointage ce jour-là) —
      // alimente l'onglet Historique et le graphique de tendance du Dashboard.
      for (let dayOffset = 0; dayOffset < HISTORY_DAYS; dayOffset++) {
        const roll = Math.random();
        if (roll < 0.05) continue; // absent ce jour-là
        const isLate = roll < 0.15; // [0.05, 0.15) = retard, [0.15, 1) = présent à l'heure

        await prisma.attendanceRecord.create({
          data: {
            id: randomUUID(),
            studentId: student.id,
            checkpoint: Checkpoint.PORTAIL,
            direction: AttendanceDirection.ENTREE,
            recordedAt: randomAttendanceTimestamp(dayOffset, isLate),
            isLate,
          },
        });
      }
    }
  }

  console.log(`École créée: ${school.id}`);
  console.log(`${schoolClasses.length} classes, ${studentCount} élèves créés.`);
  console.log('Identifiants de test : surveillant1 / direction1 / parent1, mot de passe "changeme123"');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
