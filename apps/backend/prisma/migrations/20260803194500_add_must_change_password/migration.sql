-- Force un changement de mot de passe pour les comptes ELEVE/PARENT
-- provisionnés avec un mot de passe généré (affiché une seule fois à
-- l'écran par la Direction, cf. StudentsService.provisionAccount /
-- provisionParentAccount).
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
