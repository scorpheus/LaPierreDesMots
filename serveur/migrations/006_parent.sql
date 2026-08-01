-- 006_parent : la zone parent — contrat des features v2 § 6, lot L2-H.
-- Ni `PRAGMA journal_mode`, ni `PRAGMA foreign_keys` ici : ils sont poses a l'ouverture de la
-- connexion (serveur/src/base/connexion.ts), contrat v1 § 6.1.

-- Un seul code pour le foyer, pas un par profil : c'est une zone parent, pas un compte.
CREATE TABLE code_parent (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  sel        BLOB NOT NULL,
  empreinte  BLOB NOT NULL,
  cree_le    TEXT NOT NULL,
  modifie_le TEXT NOT NULL
) STRICT;

CREATE TABLE verrou_parent (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  nb_echecs          INTEGER NOT NULL CHECK (nb_echecs >= 0),
  verrouille_jusqua  TEXT
) STRICT;

-- File de relecture : « obligatoirement relu et valide par le parent avant d'atteindre
-- l'enfant » (v2 § 13.4). Un brouillon non valide ne quitte JAMAIS `contenu/brouillons/`.
CREATE TABLE relecture_contenu (
  exercice_id TEXT PRIMARY KEY,
  chemin      TEXT NOT NULL,
  statut      TEXT NOT NULL CHECK (statut IN ('en-attente', 'valide', 'rejete')),
  deposee_le  TEXT NOT NULL,
  traitee_le  TEXT,
  motif       TEXT
) STRICT;
