-- AlterTable
-- Renseigné volontairement par un compte DIRECTION/ADMIN (dashboard → Profil)
-- pour recevoir le rapport hebdomadaire automatique — voir WeeklyReportJob.
ALTER TABLE "users" ADD COLUMN "email" TEXT;
