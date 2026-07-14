-- AlterTable
ALTER TABLE "users" ADD COLUMN     "disabled_at" TIMESTAMP(3),
ADD COLUMN     "expo_push_token" TEXT;

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "justified" BOOLEAN NOT NULL DEFAULT false,
    "justification_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "absences_student_id_idx" ON "absences"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "absences_student_id_date_key" ON "absences"("student_id", "date");

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
