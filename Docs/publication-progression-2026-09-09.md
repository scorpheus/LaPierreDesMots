# Publication de la progression — 9 septembre 2026

Après lecture du bilan, le propriétaire autorise explicitement la publication malgré les trois
différences visuelles historiques : « Dacc publie ». Les références restent intactes et le rapport
global rouge est conservé. Les crochets de push ont été contournés pour cette publication autorisée,
sans relancer la campagne complète déjà exécutée. Le commit source a passé ses crochets normaux
de lint, tests et contrôle des tests trompeurs.

- Source : `9e0da3f77e8bc9f838052b1c7cd9d139907000bf`, poussée sur `main`.
- Livraison : `60d6b767206dd266127121830ef03e6b9963d433`, poussée sur `gh-pages`.
- Version publique : `2efaf2a61cb04a9d` ; module `index-DDjHADrg.js`.
- [Action Pages 34379382972](https://github.com/scorpheus/LaPierreDesMots/actions/runs/34379382972)
  terminée avec succès ; état Pages `built`.
- [Site public](https://scorpheus.github.io/LaPierreDesMots/) : version, module, racine React,
  service worker, manifeste, icône et 297 visuels contrôlés en HTTPS. Chromium affiche l'écran
  des profils avec le nouveau module et sans erreur JavaScript.

La recette PWA locale passe : exercice tactile, deux tentatives persistantes, réouverture,
hors connexion avec illustration et audio, second onglet refusé, export/import et rejet atomique
d'un import invalide, route profonde, zéro requête API et zéro erreur de page. La seconde recette
conserve les deux tentatives existantes. Les profils utilisés sont exclusivement ceux de recette.
Ces contrôles ne constituent pas une recette sur la tablette physique de l'enfant.

Le premier essai de recette importait le nouveau module SQLite dans une page encore contrôlée
par l'ancien service worker, ouvrant une seconde connexion OPFS. Une copie de recette dans le
bac à sable lit d'abord l'adaptateur réellement chargé, laisse l'activation normale se produire,
puis vérifie le nouveau module. Ensuite la commande `npm run qa:pwa` d'origine passe à son tour.
Aucune base ni aucun cache n'a été effacé pour forcer la mise à jour.

Le contrôle HTTPS réutilise la garde déjà éprouvée sur l'élément réel `racine` ; le script de
publication historique cherche encore `root`. Aucun code applicatif n'a été changé pendant cette
publication. Les preuves sont dans `bac-a-sable/publication-progression-*.log` et le fichier
`bac-a-sable/publication-gh-pages-etat.json` conserve les commits et l'autorisation avec écarts.
