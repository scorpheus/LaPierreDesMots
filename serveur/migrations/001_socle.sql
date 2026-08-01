-- 001_socle : les trois tables de la v1 (contrat technique § 6.2).
-- Ni `PRAGMA journal_mode`, ni `PRAGMA foreign_keys` ici : ils sont poses a l'ouverture de la
-- connexion (serveur/src/base/connexion.ts), contrat § 6.1.

CREATE TABLE profils (
  id                TEXT PRIMARY KEY,
  prenom            TEXT NOT NULL,
  avatar_json       TEXT NOT NULL,
  palette_variante  TEXT NOT NULL,
  cree_le           TEXT NOT NULL,
  dernier_acces_le  TEXT NOT NULL
) STRICT;

-- Journal append-only. Aucun UPDATE, aucun DELETE n'est jamais ecrit contre cette table.
-- Tout indicateur se recalcule depuis elle (CLAUDE.md, « le journal fait foi »).
CREATE TABLE tentatives (
  id               TEXT PRIMARY KEY,
  cle_idempotence  TEXT NOT NULL UNIQUE,
  profil_id        TEXT NOT NULL REFERENCES profils(id),
  noeud_id         TEXT NOT NULL,
  exercice_id      TEXT NOT NULL,
  moteur           TEXT NOT NULL,
  habillage        TEXT NOT NULL,
  graine           INTEGER NOT NULL,
  demarre_le       TEXT NOT NULL,
  termine_le       TEXT NOT NULL,
  duree_ms         INTEGER NOT NULL CHECK (duree_ms >= 0),
  reussi           INTEGER NOT NULL CHECK (reussi IN (0, 1)),
  nb_erreurs       INTEGER NOT NULL CHECK (nb_erreurs >= 0),
  aide_utilisee    TEXT    NOT NULL CHECK (aide_utilisee IN ('aucune', 'indice', 'demonstration')),
  etoiles          INTEGER NOT NULL CHECK (etoiles BETWEEN 0 AND 3),
  detail_json      TEXT    NOT NULL
) STRICT;

CREATE INDEX idx_tentatives_profil_noeud ON tentatives (profil_id, noeud_id, termine_le);

-- Projection recalculable. Jamais une source de verite.
CREATE TABLE progression_noeud (
  profil_id      TEXT    NOT NULL REFERENCES profils(id),
  noeud_id       TEXT    NOT NULL,
  etoiles        INTEGER NOT NULL CHECK (etoiles BETWEEN 0 AND 3),
  nb_tentatives  INTEGER NOT NULL CHECK (nb_tentatives >= 0),
  dernier_le     TEXT    NOT NULL,
  PRIMARY KEY (profil_id, noeud_id)
) STRICT;
