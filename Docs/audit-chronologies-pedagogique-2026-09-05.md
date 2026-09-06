# Relecture pédagogique des chronologies — 5 septembre 2026

## Méthode et résultat honnête

Le moteur `chrono` doit faire remettre **trois vignettes dans l'ordre d'un récit**
([specification v2, § moteurs](la-pierre-des-mots-specs-v2.md)). La décision parentale du
4 septembre précise la forme attendue : chaque triplet forme une cause, une action et un
résultat ([publication des chronologies](publication-chronologies-visuelles-2026-09-04.md)).

La présente revue agent porte donc sur les mots réellement lus dans le récit et sur les libellés
des trois cartes, en plus des id et du schéma. Le garde
`tests/unitaires/chronologies-pedagogiques.test.ts` contient les quinze chaînes ci-dessous ; il
vérifie les trois temps, l'ordre approuvé et les mots observables de chaque vignette. Un défaut
injecté dans un temps (cause, action ou résultat) est refusé.

**Bilan de la revue agent : 14 triplets sont cohérents ; un défaut publié reste bloquant.** Il s'agit de
`volcan/fresque-chrono-01.json#c1`, deuxième carte : récit, id et asset disent « abeille », mais
le libellé publié dit « mouche ». Le garde le signale explicitement ; il n'est pas masqué pour
obtenir un test vert.

## Les quinze triplets lus

| Fiche / consigne | Cause → action → résultat lu | Verdict |
| --- | --- | --- |
| `cite-des-histoires/pellicule-chrono-01.json` c1 | Gobi est sur la plage → il prend un seau → il remplit le seau de sable. | Cohérent. |
| même fiche c2 | Petit château → ajout de sable, le château grandit → Gobi montre le château fini. | Cohérent : la deuxième image montre le résultat immédiat de l'ajout de sable. |
| même fiche c3 | Plume arrive → elle pose un caillou → elle danse autour du château fini. | Cohérent. |
| `cite-des-histoires/pellicule-chrono-02.json` c1 | Gobi rentre avec son sac → il ouvre son cahier → Papa s'assoit pour aider. | Cohérent. |
| même fiche c2 | Deux cubes sont posés → Papa ajoute le troisième → Gobi aligne les trois. | Cohérent. |
| même fiche c3 | Gobi ferme son cahier → il le range dans son sac → il dort dans son lit. | Cohérent. |
| `cite-des-histoires/vitrail-chrono-01.json` c1 | Nuage gris → pluie → flaque et arc-en-ciel. | Cohérent. |
| même fiche c2 | Fleur sèche → Gobi l'arrose → fleur ouverte. | Cohérent. |
| même fiche c3 | Tonneau sous la gouttière → pluie dans le tonneau → tonneau plein. | Cohérent. |
| `galeries/frise-chrono-01.json` c1 | Panier et bol à côté → bol rangé → Gobi repart avec le panier. | Cohérent. |
| même fiche c2 | Balle tenue devant le chien → balle lancée → chien la rapporte. | Cohérent. |
| même fiche c3 | Pot rempli d'eau → pot sur le feu → eau bouillante et vapeur. | Cohérent. |
| `volcan/fresque-chrono-01.json` c1 | Cochon près de la ruche → abeille sur le nez → cochon s'enfuit. | **Bloqué :** la carte centrale est libellée « mouche ». |
| même fiche c2 | Quilles debout → balle lancée → quilles renversées. | Cohérent. |
| même fiche c3 | Gobi découvre la pierre → il la soulève → champignon dessous. | Cohérent. |

## Décision et limite

La seule correction de contenu proposée reste celle de l'audit initial : remplacer le libellé
de `vignette-abeille-nez` par « Une abeille se pose sur son nez. ». Elle n'est pas appliquée ici.

Le garde ne prétend pas reconnaître les pixels ou inférer seul une causalité française. Il protège
les triplets approuvés par le parent et relus par l'agent : si le texte d'un récit, une carte ou
son ordre est changé, le référentiel explicite échoue et impose une nouvelle revue pédagogique et
une validation parent.

## Vérification exécutée

    npx vitest run --project unitaires tests/unitaires/chronologies-pedagogiques.test.ts
    # Échec attendu tant que « mouche » reste publiée : le test exige zéro anomalie.
