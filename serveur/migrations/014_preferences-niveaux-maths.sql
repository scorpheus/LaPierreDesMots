-- Choix volontaire de l'enfant, indépendant du journal des tentatives et des projets figés.
CREATE TABLE preferences_niveaux_maths (
  profil_id          TEXT NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  generation_maths   INTEGER NOT NULL CHECK (generation_maths >= 0),
  famille            TEXT NOT NULL CHECK (famille GLOB 'MAT-*-0[123]'),
  niveau             TEXT NOT NULL CHECK (niveau IN ('decouverte', 'exploration', 'defi')),
  revision           INTEGER NOT NULL CHECK (revision > 0),
  cle_geste          TEXT NOT NULL,
  modifie_le         TEXT NOT NULL,
  PRIMARY KEY (profil_id, generation_maths, famille)
) STRICT;
