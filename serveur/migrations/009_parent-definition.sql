-- 009_parent_definition : la premiere definition du code parent — lot N5, contrat de
-- finition v3 § 7.3. Ni `PRAGMA journal_mode`, ni `PRAGMA foreign_keys` ici : ils sont poses
-- a l'ouverture de la connexion (serveur/src/base/connexion.ts), contrat v1 § 6.1.
--
-- Solde le defaut mesure au contrat v3 § 1.8 : `POST /api/parent/ouvrir` posait le code du
-- foyer au premier appel, en silence. Un enfant curieux qui tapait 1234 devenait proprietaire
-- du code parent, sans qu'aucun ecran ne l'ait jamais demande.
--
-- La colonne dit COMMENT le code a ete pose. `ouverture-implicite` est la valeur des bases
-- existantes : elle est conservee plutot que devinee, et le dashboard peut proposer au parent
-- de le redefinir. On ne detruit jamais un code existant — le parent serait enferme dehors.
ALTER TABLE code_parent
  ADD COLUMN defini_par TEXT NOT NULL DEFAULT 'ouverture-implicite'
  CHECK (defini_par IN ('ouverture-implicite', 'ecran-definition', 'redefinition'));
