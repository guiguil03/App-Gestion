-- AlterTable
ALTER TABLE "parent_guardians" ADD COLUMN     "phone_number_hash" TEXT;

-- CreateIndex
CREATE INDEX "parent_guardians_phone_number_hash_idx" ON "parent_guardians"("phone_number_hash");
