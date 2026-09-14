-- Une tentative différée appartient à la progression dans laquelle elle a été jouée.
ALTER TABLE profils ADD COLUMN generation_progression INTEGER NOT NULL DEFAULT 0
  CHECK (generation_progression >= 0);
