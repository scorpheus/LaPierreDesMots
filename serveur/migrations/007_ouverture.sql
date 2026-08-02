-- 007_ouverture : la sequence d'ouverture — contrat de finition v3 § 7.1, lot N4 (D35).
-- Ni `PRAGMA journal_mode`, ni `PRAGMA foreign_keys` ici : ils sont poses a l'ouverture de la
-- connexion (serveur/src/base/connexion.ts), contrat v1 § 6.1.

-- La sequence d'ouverture est vue UNE FOIS, puis rejouable a volonte depuis le campement
-- (D35, point 3). On enregistre le fait qu'elle a ete vue, jamais un score : ce n'est pas
-- un exercice, rien n'y est evalue.
--
-- POURQUOI CETTE TABLE EXISTE ALORS QUE LA SEQUENCE N'EST JAMAIS IMPOSEE (arbitrage N4) :
-- justement parce qu'elle ne l'est pas. D46 point 3 interdit tout ecran intermediaire
-- obligatoire, donc le recit est OFFERT — et la seule facon de savoir si un enfant l'a
-- reellement vu est de l'enregistrer. `vue = 0` apres deux semaines de jeu est le signal qui
-- dit au PARENT « montre-lui l'histoire une fois ». Sans cette table, l'arbitrage serait
-- invisible et invalidable : on ne pourrait ni le confirmer, ni le corriger sur une mesure.
CREATE TABLE ouverture_vue (
  profil_id  TEXT PRIMARY KEY REFERENCES profils(id),
  vue_le     TEXT NOT NULL,
  -- Vrai si l'enfant l'a passee au tap. Sert au parent, jamais a l'enfant.
  passee     INTEGER NOT NULL CHECK (passee IN (0, 1)),
  nb_rejeux  INTEGER NOT NULL DEFAULT 0 CHECK (nb_rejeux >= 0)
) STRICT;
