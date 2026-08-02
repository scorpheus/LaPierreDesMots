-- Le RANG d'une forme sur l'etagere. Il est fige a l'obtention et ne bouge plus : une case
-- qui se deplace fait perdre le reperage visuel qui est tout l'interet de l'album (D44).
--
-- POURQUOI UNE TABLE ET PAS UN CALCUL : le rang derive de l'ordre d'obtention, et
-- `formes_gobi` (005_monde.sql) porte deja `obtenue_le`. Mais deux formes gagnees dans la
-- meme milliseconde donneraient un ordre instable au rechargement — et l'etagere changerait
-- sous les yeux de l'enfant. Le rang est donc pose une fois, explicitement.
CREATE TABLE etagere_rang (
  profil_id     TEXT    NOT NULL REFERENCES profils(id),
  grapheme_code TEXT    NOT NULL,
  rang          INTEGER NOT NULL CHECK (rang >= 1),
  PRIMARY KEY (profil_id, grapheme_code)
) STRICT;

CREATE UNIQUE INDEX etagere_rang_unique ON etagere_rang (profil_id, rang);
