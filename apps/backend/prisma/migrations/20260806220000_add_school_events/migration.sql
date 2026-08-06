-- CreateTable
CREATE TABLE "school_events" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_events_school_id_idx" ON "school_events"("school_id");

-- CreateIndex
CREATE INDEX "school_events_school_id_date_idx" ON "school_events"("school_id", "date");

-- AddForeignKey
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Nouvelle table exposée via l'API PostgREST de Supabase (schéma `public`) —
-- même principe que les migrations RLS précédentes : RLS activé + 0 policy
-- = accès refusé par défaut pour les rôles `anon`/`authenticated`, sans
-- impact sur le backend NestJS (rôle `postgres`, contourne RLS).
ALTER TABLE "school_events" ENABLE ROW LEVEL SECURITY;
