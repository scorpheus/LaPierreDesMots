-- 011_recuperer-code-parent-implicite : rendre la porte aux foyers hérités de l'ancien défaut.
--
-- Avant la migration 009, le premier code essayé sur la porte parent était enregistré sans
-- que l'écran annonce qu'il créait le code du foyer. Ces lignes sont reconnaissables sans
-- ambiguïté par `defini_par = 'ouverture-implicite'`. Conserver leur empreinte enferme le
-- parent derrière un secret qu'il n'a jamais choisi consciemment.
--
-- On retire UNIQUEMENT ce code hérité. Au prochain affichage, la porte présente l'écran
-- explicite « Choisis le code du foyer ». Un code créé ou changé par cet écran reste intact.
-- Le verrou associé au code disparu est remis à zéro ; aucune donnée enfant n'est touchée.
DELETE FROM code_parent WHERE defini_par = 'ouverture-implicite';

UPDATE verrou_parent
SET nb_echecs = 0,
    verrouille_jusqua = NULL
WHERE NOT EXISTS (SELECT 1 FROM code_parent);
