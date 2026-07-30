/**
 * Chiffre les fiches ParentGuardian créées avant l'introduction du
 * chiffrement applicatif (voir FieldEncryptionService et la migration
 * add_parent_guardian_phone_hash). Idempotent : ne touche que les lignes où
 * `phoneNumberHash` est encore null (jamais renseigné avant ce script ni
 * avant le passage de StudentsService en écriture chiffrée) — sûr à relancer
 * plusieurs fois, ne chiffre jamais deux fois la même ligne.
 *
 * Usage : npx ts-node prisma/backfill-encrypt-parent-guardians.ts
 */
import { PrismaClient } from '@prisma/client';

import { FieldEncryptionService } from '../src/common/crypto/field-encryption';

const prisma = new PrismaClient();
const crypto = new FieldEncryptionService();

async function main() {
  const rows = await prisma.parentGuardian.findMany({ where: { phoneNumberHash: null } });

  if (rows.length === 0) {
    console.log('Rien à migrer — toutes les fiches ont déjà un phoneNumberHash.');
    return;
  }

  console.log(`${rows.length} fiche(s) à chiffrer...`);
  let done = 0;

  for (const row of rows) {
    await prisma.parentGuardian.update({
      where: { id: row.id },
      data: {
        phoneNumber: crypto.encrypt(row.phoneNumber),
        phoneNumberHash: crypto.hashForLookup(row.phoneNumber),
        secondaryPhoneNumber: crypto.encrypt(row.secondaryPhoneNumber),
        address: crypto.encrypt(row.address),
      },
    });
    done++;
    if (done % 10 === 0 || done === rows.length) {
      console.log(`  ${done}/${rows.length}`);
    }
  }

  console.log('Terminé.');
}

main()
  .catch((error) => {
    console.error('Échec du backfill :', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
