-- 004_cascade : la projection de la cascade de recompenses (D25) -- lot L2-A.
--
-- Projection RECALCULABLE depuis `tentatives`. Elle existe pour l'affichage, pas pour la
-- verite : « le journal fait foi » (CLAUDE.md). `recalculerCascade` la reconstruit
-- integralement, et `serveur/src/depots/cascade.ts` porte les deux chemins -- incremental et
-- integral -- qui doivent rendre exactement le meme etat.
--
-- Ni `PRAGMA journal_mode`, ni `PRAGMA foreign_keys` ici : ils sont poses a l'ouverture de la
-- connexion (serveur/src/base/connexion.ts), contrat technique v1 § 6.1.

CREATE TABLE progression_cascade (
  profil_id                   TEXT PRIMARY KEY REFERENCES profils(id),
  etoiles_total               INTEGER NOT NULL CHECK (etoiles_total >= 0),
  etoiles_depuis_inter        INTEGER NOT NULL CHECK (etoiles_depuis_inter >= 0),
  intermediaires_total        INTEGER NOT NULL CHECK (intermediaires_total >= 0),
  intermediaires_depuis_rare  INTEGER NOT NULL CHECK (intermediaires_depuis_rare >= 0),
  rares_total                 INTEGER NOT NULL CHECK (rares_total >= 0),
  dernier_palier_le           TEXT
) STRICT;
