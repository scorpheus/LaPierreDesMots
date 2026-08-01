-- 005_monde : la carte, les compagnons, Gobi, le campement — lot L2-F.
-- Recopie a la lettre du contrat des features v2 § 6. Ni `PRAGMA journal_mode`, ni
-- `PRAGMA foreign_keys` ici : ils sont poses a l'ouverture de la connexion (contrat v1 § 6.1).
--
-- DEUX REGLES DE DEPOT qui ne sont pas dans ce SQL et qui comptent autant que lui :
--   * `progression_region.pourcentage_colorie` s'ecrit en MAX(ancien, nouveau), jamais en
--     affectation directe ;
--   * `stade_gobi` s'ecrit en MAX(rang_ancien, rang_nouveau).
-- C'est la traduction en SQL de « un acquis n'est jamais repris » (R14), exactement comme
-- `progression_noeud.etoiles`. `tests/api/monde.test.ts` TENTE la regression et verifie qu'elle
-- n'a pas eu lieu.

CREATE TABLE progression_region (
  profil_id            TEXT    NOT NULL REFERENCES profils(id),
  region_code          TEXT    NOT NULL,
  ouverte              INTEGER NOT NULL CHECK (ouverte IN (0, 1)),
  -- Ne decroit jamais : MAX(ancien, nouveau), comme `progression_noeud.etoiles` (R14).
  pourcentage_colorie  REAL    NOT NULL CHECK (pourcentage_colorie BETWEEN 0 AND 1),
  eclat_obtenu_le      TEXT,
  PRIMARY KEY (profil_id, region_code)
) STRICT;

CREATE TABLE compagnons (
  profil_id TEXT NOT NULL REFERENCES profils(id),
  code      TEXT NOT NULL CHECK (code IN ('filou', 'bulle', 'roc', 'plume')),
  rallie_le TEXT NOT NULL,
  PRIMARY KEY (profil_id, code)
) STRICT;

CREATE TABLE formes_gobi (
  profil_id     TEXT NOT NULL REFERENCES profils(id),
  grapheme_code TEXT NOT NULL,
  obtenue_le    TEXT NOT NULL,
  PRIMARY KEY (profil_id, grapheme_code)
) STRICT;

-- Un SEUL enregistrement de stade par profil, et il ne recule jamais (D28).
-- Le depot ecrit MAX(rang_ancien, rang_nouveau) ; la contrainte de rang le rend verifiable.
CREATE TABLE stade_gobi (
  profil_id  TEXT PRIMARY KEY REFERENCES profils(id),
  stade_code TEXT    NOT NULL,
  rang       INTEGER NOT NULL CHECK (rang >= 1),
  atteint_le TEXT    NOT NULL
) STRICT;

CREATE TABLE campement (
  profil_id  TEXT NOT NULL REFERENCES profils(id),
  objet_code TEXT NOT NULL,
  place_le   TEXT NOT NULL,
  PRIMARY KEY (profil_id, objet_code)
) STRICT;

-- R11 : ce que l'enfant a deja touche. Sert a varier les reactions, jamais a noter quoi que ce soit.
CREATE TABLE points_visites (
  profil_id   TEXT    NOT NULL REFERENCES profils(id),
  point_code  TEXT    NOT NULL,
  nb_visites  INTEGER NOT NULL CHECK (nb_visites >= 0),
  derniere_le TEXT    NOT NULL,
  PRIMARY KEY (profil_id, point_code)
) STRICT;
