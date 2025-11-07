/*
  ✅ Correction :
  - On supprime l'ajout de la colonne `expiresAt` (elle existe déjà)
  - On garde seulement `jti` et les index associés
  - On protège les ajouts avec des vérifications "IF NOT EXISTS" pour éviter tout crash
*/

DO $$
BEGIN
  -- Ajout de la colonne jti uniquement si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'jti'
  ) THEN
    ALTER TABLE "refresh_tokens" ADD COLUMN "jti" TEXT NOT NULL;
  END IF;
END $$;

-- Création de l'index unique sur jti si non existant
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- Création de l'index sur expiresAt si non existant
CREATE INDEX IF NOT EXISTS "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");
