-- 003_pedagogie : le journal des etapes et les projections pedagogiques. Lot L2-D.
-- Contrat des features v2 § 6. Ni `PRAGMA journal_mode`, ni `PRAGMA foreign_keys` ici : ils
-- sont poses a l'ouverture de la connexion (serveur/src/base/connexion.ts), contrat v1 § 6.1.

-- Journal APPEND-ONLY, une ligne par etape. C'est lui qui porte la latence de reconnaissance
-- (D18, l'indicateur principal) et les confusions avec leur AXE (D23). Aucun UPDATE, aucun
-- DELETE n'est jamais ecrit contre cette table : tout indicateur s'en recalcule.
CREATE TABLE etapes_tentative (
  id             TEXT PRIMARY KEY,
  tentative_id   TEXT    NOT NULL REFERENCES tentatives(id),
  profil_id      TEXT    NOT NULL REFERENCES profils(id),
  rang           INTEGER NOT NULL CHECK (rang >= 0),
  identifiant    TEXT    NOT NULL,
  competence     TEXT    NOT NULL,
  mode_reponse   TEXT    NOT NULL,
  reussi         INTEGER NOT NULL CHECK (reussi IN (0, 1)),
  nb_erreurs     INTEGER NOT NULL CHECK (nb_erreurs >= 0),
  aide_utilisee  TEXT    NOT NULL CHECK (aide_utilisee IN ('aucune','indice','demonstration')),
  duree_ms       INTEGER NOT NULL CHECK (duree_ms >= 0),
  latence_ms     INTEGER          CHECK (latence_ms IS NULL OR latence_ms >= 0),
  -- AJOUT SIGNALE AU CONTRAT GELE § 6. Les modes `ordre` et `appariement` calculent
  -- p_devinette en 1/n! depuis le nombre d'elements (D13). Sans cette colonne, le RECALCUL du
  -- BKT depuis ce journal ne peut pas reproduire l'incremental sur ces deux modes : les deux
  -- chemins divergeraient, et `tests/api/pedagogie.test.ts` verifie justement leur egalite.
  -- Colonne nullable : elle ne contraint aucun ecrivain existant.
  nb_elements    INTEGER          CHECK (nb_elements IS NULL OR nb_elements >= 2),
  -- Les trois colonnes de confusion vont ensemble : soit les trois sont nulles, soit
  -- `attendu` et `rendu` sont posees. `axe` reste nullable — une confusion non miroir
  -- existe, et le dashboard l'ECARTE du top 10 plutot que de lui inventer un axe.
  conf_attendu   TEXT,
  conf_rendu     TEXT,
  conf_axe       TEXT             CHECK (conf_axe IS NULL OR conf_axe IN ('gauche-droite','haut-bas')),
  journalise_le  TEXT    NOT NULL,
  CHECK ((conf_attendu IS NULL) = (conf_rendu IS NULL))
) STRICT;

CREATE INDEX idx_etapes_profil_comp ON etapes_tentative (profil_id, competence, journalise_le);
CREATE INDEX idx_etapes_confusion   ON etapes_tentative (profil_id, conf_axe, conf_attendu, conf_rendu);

-- Projection recalculable depuis `etapes_tentative`. JAMAIS une source de verite.
CREATE TABLE maitrise_competence (
  profil_id            TEXT    NOT NULL REFERENCES profils(id),
  competence           TEXT    NOT NULL,
  p                    REAL    NOT NULL CHECK (p BETWEEN 0 AND 1),
  nb_tentatives        INTEGER NOT NULL CHECK (nb_tentatives >= 0),
  jours_distincts_json TEXT    NOT NULL,
  nb_faible_devinette  INTEGER NOT NULL CHECK (nb_faible_devinette >= 0),
  -- Ne repasse JAMAIS a NULL : un acquis n'est jamais repris (R14). Le depot applique
  -- COALESCE(ancien, nouveau), exactement comme `progression_noeud.etoiles` applique MAX.
  acquise_le           TEXT,
  PRIMARY KEY (profil_id, competence)
) STRICT;

CREATE TABLE items_leitner (
  profil_id        TEXT    NOT NULL REFERENCES profils(id),
  item             TEXT    NOT NULL,
  boite            INTEGER NOT NULL CHECK (boite BETWEEN 1 AND 5),
  derniere_revue_le TEXT   NOT NULL,
  echeance_le      TEXT    NOT NULL,
  nb_revues        INTEGER NOT NULL CHECK (nb_revues >= 0),
  PRIMARY KEY (profil_id, item)
) STRICT;

CREATE INDEX idx_leitner_echeance ON items_leitner (profil_id, echeance_le);

CREATE TABLE sorties (
  id          TEXT PRIMARY KEY,
  profil_id   TEXT NOT NULL REFERENCES profils(id),
  region      TEXT NOT NULL,
  compagnon   TEXT,
  plan_json   TEXT NOT NULL,
  composee_le TEXT NOT NULL,
  close_le    TEXT
) STRICT;
