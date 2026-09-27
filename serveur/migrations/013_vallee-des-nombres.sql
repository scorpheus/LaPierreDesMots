-- Vallée des Nombres : deux générations indépendantes et deux journaux de résultats.
-- Toutes les données maths portent profil_id pour les portées de remise à zéro.
ALTER TABLE profils ADD COLUMN generation_maths INTEGER NOT NULL DEFAULT 0
  CHECK (generation_maths >= 0);

-- Une seule reprise lecture active par profil ; le contenu du moteur reste versionné.
CREATE TABLE reprises_lecture (
  profil_id              TEXT PRIMARY KEY REFERENCES profils(id) ON DELETE CASCADE,
  generation_progression INTEGER NOT NULL CHECK (generation_progression >= 0),
  revision               INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  version_contrat         INTEGER NOT NULL CHECK (version_contrat > 0),
  version_moteur          INTEGER NOT NULL CHECK (version_moteur > 0),
  instantane_json         TEXT NOT NULL CHECK (json_valid(instantane_json)),
  maj_le                 TEXT NOT NULL
) STRICT;

-- Le plan éditorial et le cadeau sont figés avant le premier défi d'un projet.
-- Cette table reste immuable ; une nouvelle traversée reçoit une nouvelle session.
CREATE TABLE sessions_projets_maths (
  id                 TEXT PRIMARY KEY,
  profil_id          TEXT NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  generation_maths   INTEGER NOT NULL CHECK (generation_maths >= 0),
  cle_creation       TEXT NOT NULL,
  empreinte_creation TEXT NOT NULL,
  projet_id          TEXT NOT NULL,
  version_projet     INTEGER NOT NULL CHECK (version_projet > 0),
  variables_json     TEXT NOT NULL CHECK (json_valid(variables_json)),
  plan_json          TEXT NOT NULL CHECK (json_valid(plan_json)),
  transformation_id TEXT NOT NULL,
  cadeau_id          TEXT,
  cadeau_type        TEXT CHECK (cadeau_type IN ('souvenir', 'objet', 'fete')),
  cree_le            TEXT NOT NULL,
  UNIQUE (id, profil_id),
  UNIQUE (profil_id, generation_maths, cle_creation),
  CHECK ((cadeau_id IS NULL) = (cadeau_type IS NULL))
) STRICT;
CREATE INDEX idx_sessions_projets_maths_profil
  ON sessions_projets_maths (profil_id, projet_id, cree_le);

-- L'énoncé et les règles résolues sont conservés, sans dépendre d'un générateur futur.
CREATE TABLE instances_maths (
  id                 TEXT PRIMARY KEY,
  profil_id          TEXT NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  generation_maths   INTEGER NOT NULL CHECK (generation_maths >= 0),
  cle_creation       TEXT NOT NULL,
  empreinte_creation TEXT NOT NULL,
  famille            TEXT NOT NULL,
  niveau             TEXT NOT NULL CHECK (niveau IN ('decouverte', 'exploration', 'defi')),
  modele_id          TEXT NOT NULL,
  version_modele     INTEGER NOT NULL CHECK (version_modele > 0),
  version_generateur INTEGER NOT NULL CHECK (version_generateur > 0),
  graine             INTEGER NOT NULL,
  signature          TEXT NOT NULL,
  session_projet_id  TEXT,
  projet_id          TEXT,
  projet_etape       INTEGER CHECK (projet_etape IS NULL OR projet_etape >= 0),
  instance_json      TEXT NOT NULL CHECK (json_valid(instance_json)),
  cree_le            TEXT NOT NULL,
  UNIQUE (id, profil_id),
  UNIQUE (profil_id, generation_maths, cle_creation),
  FOREIGN KEY (session_projet_id, profil_id) REFERENCES sessions_projets_maths(id, profil_id) ON DELETE CASCADE,
  CHECK ((projet_id IS NULL) = (projet_etape IS NULL)),
  CHECK ((projet_id IS NULL) = (session_projet_id IS NULL))
) STRICT;
CREATE INDEX idx_instances_maths_profil_famille
  ON instances_maths (profil_id, famille, cree_le DESC);

-- Un point de reprise mutable par instance. Une seule partie visible à la fois par profil.
CREATE TABLE reprises_maths (
  instance_id        TEXT PRIMARY KEY,
  profil_id          TEXT NOT NULL,
  generation_maths   INTEGER NOT NULL CHECK (generation_maths >= 0),
  revision           INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  version_etat       INTEGER NOT NULL CHECK (version_etat > 0),
  statut             TEXT NOT NULL CHECK (statut IN ('active', 'suspendue', 'en_attente', 'terminee')),
  reprise_json       TEXT NOT NULL CHECK (json_valid(reprise_json)),
  maj_le             TEXT NOT NULL,
  FOREIGN KEY (instance_id, profil_id) REFERENCES instances_maths(id, profil_id) ON DELETE CASCADE
) STRICT;
CREATE UNIQUE INDEX idx_reprises_maths_active
  ON reprises_maths (profil_id) WHERE statut = 'active';

-- Journal append-only des gestes et validations, avec révision et clé d'émission stable.
CREATE TABLE actions_maths (
  instance_id        TEXT NOT NULL,
  profil_id          TEXT NOT NULL,
  generation_maths   INTEGER NOT NULL CHECK (generation_maths >= 0),
  revision_avant     INTEGER NOT NULL CHECK (revision_avant >= 0),
  revision_apres     INTEGER NOT NULL CHECK (revision_apres = revision_avant + 1),
  cle_geste          TEXT NOT NULL,
  empreinte_requete  TEXT NOT NULL,
  version_action     INTEGER NOT NULL CHECK (version_action > 0),
  type_action        TEXT NOT NULL CHECK (type_action IN ('manipulation', 'validation', 'pause')),
  action_json        TEXT NOT NULL CHECK (json_valid(action_json)),
  effet_json         TEXT NOT NULL CHECK (json_valid(effet_json)),
  inscrit_le         TEXT NOT NULL,
  PRIMARY KEY (instance_id, revision_apres),
  UNIQUE (profil_id, generation_maths, cle_geste),
  FOREIGN KEY (instance_id, profil_id) REFERENCES instances_maths(id, profil_id) ON DELETE CASCADE
) STRICT;
CREATE INDEX idx_actions_maths_profil ON actions_maths (profil_id, inscrit_le);

-- Seule une réussite complète conclut une instance ; aucune UPDATE/DELETE dans ce journal.
CREATE TABLE tentatives_maths (
  id                 TEXT PRIMARY KEY,
  instance_id        TEXT NOT NULL UNIQUE,
  profil_id          TEXT NOT NULL,
  generation_maths   INTEGER NOT NULL CHECK (generation_maths >= 0),
  cle_geste          TEXT NOT NULL,
  empreinte_requete  TEXT NOT NULL,
  famille            TEXT NOT NULL,
  niveau             TEXT NOT NULL,
  session_projet_id  TEXT,
  projet_id          TEXT,
  projet_etape       INTEGER,
  nb_erreurs         INTEGER NOT NULL CHECK (nb_erreurs >= 0),
  aide_utilisee      TEXT NOT NULL CHECK (aide_utilisee IN ('aucune', 'indice', 'demonstration')),
  etoiles            INTEGER NOT NULL CHECK (etoiles BETWEEN 1 AND 3),
  solution_json      TEXT NOT NULL CHECK (json_valid(solution_json)),
  notions_json       TEXT NOT NULL CHECK (json_valid(notions_json)),
  contexte_json      TEXT NOT NULL CHECK (json_valid(contexte_json)),
  termine_le         TEXT NOT NULL,
  UNIQUE (profil_id, generation_maths, cle_geste),
  FOREIGN KEY (instance_id, profil_id) REFERENCES instances_maths(id, profil_id) ON DELETE CASCADE,
  FOREIGN KEY (session_projet_id, profil_id) REFERENCES sessions_projets_maths(id, profil_id) ON DELETE CASCADE
) STRICT;
CREATE INDEX idx_tentatives_maths_profil ON tentatives_maths (profil_id, termine_le, id);
CREATE INDEX idx_tentatives_maths_projet ON tentatives_maths (profil_id, session_projet_id, projet_etape);

-- Projections recalculables depuis les instances/sessions immuables et les tentatives.
CREATE TABLE progression_maths (
  profil_id       TEXT NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  famille         TEXT NOT NULL,
  niveau          TEXT NOT NULL,
  projet_id       TEXT NOT NULL DEFAULT '',
  etoiles         INTEGER NOT NULL CHECK (etoiles BETWEEN 1 AND 3),
  nb_tentatives   INTEGER NOT NULL CHECK (nb_tentatives > 0),
  dernier_le      TEXT NOT NULL,
  PRIMARY KEY (profil_id, famille, niveau, projet_id)
) STRICT;

CREATE TABLE progression_projets_maths (
  profil_id          TEXT NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  projet_id          TEXT NOT NULL,
  etapes_terminees   INTEGER NOT NULL CHECK (etapes_terminees >= 0),
  nombre_etapes      INTEGER NOT NULL CHECK (nombre_etapes > 0),
  transformation_id TEXT NOT NULL,
  termine_le         TEXT,
  PRIMARY KEY (profil_id, projet_id)
) STRICT;

CREATE TABLE recompenses_maths (
  profil_id       TEXT NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  projet_id       TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  cadeau_id       TEXT NOT NULL,
  categorie       TEXT NOT NULL CHECK (categorie IN ('souvenir', 'objet', 'fete')),
  attribue_le     TEXT NOT NULL,
  PRIMARY KEY (profil_id, projet_id),
  UNIQUE (profil_id, cadeau_id),
  FOREIGN KEY (session_id, profil_id) REFERENCES sessions_projets_maths(id, profil_id) ON DELETE CASCADE
) STRICT;
