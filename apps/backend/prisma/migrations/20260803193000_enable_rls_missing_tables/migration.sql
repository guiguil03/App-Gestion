-- Complète la migration 20260715130213_enable_row_level_security : 4 tables
-- exposées via l'API PostgREST de Supabase (schéma `public`) avaient été
-- oubliées, deux d'entre elles ajoutées après coup (`audit_logs`), les deux
-- autres étant des tables de jointure implicites créées par Prisma pour les
-- relations many-to-many (`User.assignedClasses` / `SchoolClass.assignedTeachers`
-- et `User.children` / `Student.parentUsers`) — elles n'apparaissent pas comme
-- `model` dans schema.prisma, donc facile à manquer lors d'un audit.
--
-- `_parent_of` est la plus sensible des quatre : elle relie directement un
-- compte parent à l'identité de son ou ses enfants (donnée à caractère
-- personnel concernant des mineurs).
--
-- Même principe que la migration d'origine : RLS activé + 0 policy = accès
-- refusé par défaut pour les rôles `anon`/`authenticated` de Supabase, sans
-- impact sur le backend NestJS (rôle `postgres`, propriétaire des tables,
-- contourne RLS par construction).
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_class_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_parent_of" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
