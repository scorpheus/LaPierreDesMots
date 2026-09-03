# Bilan de reprise — recette des exercices — 2026-09-03

## Décision de périmètre

L'audio est mis de côté à la demande du parent. Il n'est ni un critère de verdict, ni un
blocage de cette campagne. La boucle rapide ne le contrôle que sur demande explicite avec
`npm run qa:rapide -- --avec-audio`.

## Inventaire vérifié

- 76 fiches reliées : 75 exercices pédagogiques et 1 activité libre de compatibilité.
- 76 fiches de recette individuelles dans `Docs/recettes/exercices/`.
- 0 ligne encore marquée `À RECETTER`.
- 63 lignes bloquées par un asset absent, un blockout ou un rendu visuel non validé.
- L'activité `galeries-12` est hors progression, non journalisable et non récompensée.

La file détaillée qui fait foi est
`Docs/recettes/file-recette-76-exercices-2026-09-02.md`.

## Défauts fonctionnels corrigés

- Le moteur de tri accepte désormais un vrai tap tactile, sans exiger un glisser-déposer.
- L'aide de Gobi ne concatène plus deux fois une consigne déjà complète.
- Les textes manifestement bancals des lianes, de la guirlande et de la souche ont été reformulés.
- La compétence du nœud `volcan-05` correspond maintenant au graphème `gn` réellement travaillé.
- Le chaudron ouvre une activité libre dédiée au lieu d'ajouter un exercice à la progression.
- Les particules génériques persistantes ont été retirées des réussites et nettoyées aux transitions.
- La carte compte exactement six destinations et ne conserve plus de routes vers des zones fantômes.

## Contrôles rapides exécutés

- `npm run qa:rapide` : 14/14 en 196 ms, y compris les routes HTTP et le contrôle négatif 404.
- `npm run test:contenu` : 620 contrôles, 0 problème ; 75 nœuds pédagogiques servis.
- Tests ciblés aide, tri, progression et galerie : 35/35.
- `npm run typescript` : réussi.
- `npm run construire` : réussi ; bundle initial 208,17 Ko gzip.
- Parcours de variété ciblé : 3/3 en 3,9 s.
- Navigation, progression et activité libre après correction du rapport global : 105/105 tests
  ciblés, puis 19/19 pour le contrôle négatif du modèle.
- Campement sans texte après reconstruction du bundle de test : 5/5.
- Vérification manuelle 1280×720 : consigne, cinq cartes dont deux intrus et aide Gobi correcte.

Capture : `bac-a-sable/captures/exercice-place-final-1280x720.png`.

## Ce qui n'est pas encore propre visuellement

La mécanique est largement présente, mais la bibliothèque d'illustrations ne l'est pas. Les
chronologies, paires et plusieurs scènes déclarent encore des images `null`; 54 des 55 scènes SVG
auditées restent des blockouts géométriques. Les produire une par une dans le style validé est le
chemin critique restant. La production détaillée est chiffrée dans
`Docs/plan-production-assets-exercices-2026-09-02.md`.

La recette tablette esthétique de chaque ligne `BLOQUÉ-ASSET` devra être rejouée après promotion
de son image. Aucun lot massif d'images n'est lancé : une image maîtresse, validation parent, puis
la suivante.

## Vérification globale et arbitrage visuel

La campagne globale du 2026-09-03 a duré 296,1 s et a rougi. Ses contrats fonctionnels périmés
(76 nœuds pédagogiques au lieu de 75, absence du chaudron dans le modèle) ont ensuite été corrigés
et rejoués en ciblé. Restent volontairement sans correction automatique :

- deux contrôles audio, hors campagne par décision parent ;
- six références visuelles qui ont changé avec la carte, le décor d'école et la récompense ;
- deux erreurs `ERR_NO_BUFFER_SPACE` apparues sous la campagne qualité parallèle, à distinguer
  d'un défaut produit par un rejeu ciblé.

Le nouveau décor d'école a été validé le 2026-09-03 et son empreinte est désormais verrouillée.
Les références visuelles restantes ne seront pas promues au nom du parent sans son accord explicite.
