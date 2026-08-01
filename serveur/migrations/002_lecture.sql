-- 002_lecture : les reglages de lecture par profil et le protocole A/B de D19 — lot L2-B.
-- Ni `PRAGMA journal_mode`, ni `PRAGMA foreign_keys` ici : ils sont poses a l'ouverture de la
-- connexion (serveur/src/base/connexion.ts), contrat technique v1 § 6.1.
--
-- `reglages_lecture` est l'une des rares tables du projet qui accepte un UPDATE, comme
-- `profils`. Ce n'est pas une projection : c'est un CHOIX de l'enfant, et rien ne le recalcule.
-- Les bornes en `CHECK` doublent celles de `partage/src/lecture/defauts.ts` a dessein — le
-- code RAMENE dans les bornes et n'echoue jamais, la base REFUSE ce qui n'y serait pas.
-- Deux gardes de nature differente : l'une protege l'enfant, l'autre protege la donnee.

CREATE TABLE reglages_lecture (
  profil_id             TEXT PRIMARY KEY REFERENCES profils(id),
  police                TEXT    NOT NULL,
  corps_px              INTEGER NOT NULL CHECK (corps_px BETWEEN 16 AND 40),
  interlettrage_em      REAL    NOT NULL CHECK (interlettrage_em >= 0),
  espacement_mots_em    REAL    NOT NULL CHECK (espacement_mots_em >= 0),
  interligne            REAL    NOT NULL CHECK (interligne > 0),
  coloration_syllabique INTEGER NOT NULL CHECK (coloration_syllabique IN (0, 1)),
  surlignage_ligne      INTEGER NOT NULL CHECK (surlignage_ligne IN (0, 1)),
  regle_de_lecture      INTEGER NOT NULL CHECK (regle_de_lecture IN (0, 1)),
  fond                  TEXT    NOT NULL CHECK (fond IN ('parchemin', 'sombre')),
  modifie_le            TEXT    NOT NULL
) STRICT;

-- Le protocole A/B de D19. `bras_json` porte les DEUX configurations comparees :
-- une comparaison a trois bras n'est pas lisible, la contrainte est donc dans le schema JSON.
CREATE TABLE essais_typographie (
  id           TEXT PRIMARY KEY,
  profil_id    TEXT NOT NULL REFERENCES profils(id),
  competence   TEXT NOT NULL,
  bras_json    TEXT NOT NULL,
  ouvert_le    TEXT NOT NULL,
  cloture_le   TEXT
) STRICT;

CREATE INDEX idx_essais_profil ON essais_typographie (profil_id, competence);
