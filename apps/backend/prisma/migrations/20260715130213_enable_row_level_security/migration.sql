-- Active Row Level Security sur toutes les tables métier.
--
-- Contexte : Supabase expose automatiquement chaque table du schéma `public`
-- via son API REST (PostgREST), accessible avec la clé `anon` ou un JWT
-- Supabase Auth (rôle `authenticated`). Cette app n'utilise ni l'auth
-- Supabase ni son API REST — le backend NestJS accède à Postgres directement
-- via son propre rôle (`postgres`, superuser, qui contourne RLS de toute
-- façon). Sans RLS, la clé `anon` seule suffit à lire/écrire toutes les
-- données de toutes les écoles depuis n'importe où.
--
-- Aucune policy n'est ajoutée : RLS activé + 0 policy = accès refusé par
-- défaut pour les rôles `anon` et `authenticated`, tout en laissant le
-- backend (rôle `postgres`, propriétaire des tables) totalement inchangé.
ALTER TABLE "schools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school_classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parent_guardians" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "absences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_signing_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
