-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "address" TEXT,
ADD COLUMN     "closed_weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "consecutive_absence_alert_threshold" INTEGER,
ADD COLUMN     "director_name" TEXT,
ADD COLUMN     "logo_url" TEXT;

-- CreateTable
CREATE TABLE "school_closure_dates" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "school_closure_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_closure_dates_school_id_idx" ON "school_closure_dates"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_closure_dates_school_id_date_key" ON "school_closure_dates"("school_id", "date");

-- AddForeignKey
ALTER TABLE "school_closure_dates" ADD CONSTRAINT "school_closure_dates_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Nouvelle table exposée via l'API PostgREST de Supabase (schéma `public`) —
-- même principe que les migrations RLS précédentes : RLS activé + 0 policy
-- = accès refusé par défaut pour les rôles `anon`/`authenticated`, sans
-- impact sur le backend NestJS (rôle `postgres`, contourne RLS).
ALTER TABLE "school_closure_dates" ENABLE ROW LEVEL SECURITY;
