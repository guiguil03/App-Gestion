-- AlterTable
ALTER TABLE "parent_guardians" ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "parent_guardians_user_id_idx" ON "parent_guardians"("user_id");

-- AddForeignKey
ALTER TABLE "parent_guardians" ADD CONSTRAINT "parent_guardians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
