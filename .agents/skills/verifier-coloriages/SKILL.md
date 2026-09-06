---
name: verifier-coloriages
description: Recaler et vérifier les exercices de coloriage sur décor raster de La Pierre des Mots après changement d'image, de consigne, de masque ou de mise en page. Couvre la reconnaissance des objets et les touchers réels ; ne remplace pas le visa esthétique du parent.
---

# Coloriages : un objet visible, un nom juste, un vrai toucher

Lire `Docs/lot-coloriages-jouables-locaux-2026-09-05.md` pour le périmètre du précédent lot,
pas pour déduire une nouvelle autorisation de publication. Les nouvelles images et phrases
passent en brouillons puis suivent l'accord parent. Un essai local n'autorise pas GitHub/APK.

## Trois preuves différentes

- `npm run qa:coloriages` inventorie tous les exercices `colorie` et produit la scène grise et
  ses vrais contours. Il attend le décodage des images. Son succès signifie **rapport produit**,
  pas « objet reconnu ». Relire le nom et regarder la superposition : une pierre avait été
  nommée papillon, et des contours géométriquement valides peignaient le sol voisin.
- `tests/fixtures/coloriages-reperes.json` fige l'empreinte du PNG et des points intérieurs /
  extérieurs observés sur le raster **avant et indépendamment des masques**. Ne pas calculer ces
  points depuis les centroïdes. La régression unitaire inventorie tous les coloriages et leurs
  cibles : toute nouvelle fiche doit avoir ses repères revus. Une mise à jour n'est justifiée
  que par une nouvelle image/observation, pas par un test qui échoue.
- `tests/e2e/parcours-coloriages-reperes.spec.ts` touche chaque objet sur quatre vrais viewports
  CSS (barres système déjà retranchées), avec `touchscreen.tap` et contrôle d'interception.
  Il ne doit pas passer par `__test.repondre`, un clic forcé ou le centre des chemins. Les autres
  suites à oracle géométrique restent utiles pour la mécanique, pas pour la reconnaissance.

## Pièges rencontrés et vérifications

Inspecter aussi un état partiellement peint : un seul point intérieur/extérieur ne contraint
pas toute une silhouette. Le masque de porte passait ces points tout en peignant un visage,
et le banc passait tout en oubliant son assise. Ajouter des repères indépendants sur les parties
peintes et celles à exclure, constater le rouge puis retracer. Éviter les points sur un bord
antialiasé : choisir une vraie surface intérieure lisible sur le raster, jamais un centre issu
du masque. Ne pas annoncer « contours exacts » au seul vu de ces points.

Conserver le repère du raster : même ratio de viewBox, `preserveAspectRatio="xMidYMid meet"`,
ou conversion explicite des marges. Ajouter `data-fond-illustre` au fond : c'est le contrat du
moteur pour la grisaille et pour masquer les traits techniques. Recalculer surfaces / centres
avec `scripts/verifier-regions-fermees.mjs`. Son `pointRepresentatif` renvoie `{ point, marge }`.

Ne pas agrandir le masque pour rendre une petite cible tactile : cela peint le mauvais objet.
La loupe volontaire agrandit toute la scène sans connaître la cible. Vérifier pan natif sans
peinture, vrai tap en loupe, retour à la vue entière sans perdre l'étape. Une grille intermédiaire
doit avoir `minmax(0,1fr)` : sinon la fenêtre peut couper le SVG malgré un overflow global nul.

`mix-blend-mode: color` seul ne peint pas le noir sur une image grise. Garder la régression
des neutres ET le contrôle de luminosité des pixels rendus ; une assertion sur le style seule
ne prouve pas la couleur affichée.

Après promotion, mettre les voix des nouvelles consignes à jour par `npm run voix` (sans
`--tout` ni `--sans-qc`), inscrire les assets/provenances dans les verrous, déclarer les SVG
brouillons conservés comme archives avec leur successeur réel. Ne pas supprimer des brouillons
pour faire taire le garde des SVG orphelins. Conserver captures de début de jeu : une capture
après le dernier tap montre la récompense, pas le dessin que le parent doit examiner.

Relire aussi les anciens tests de noms/positions et de promotion des PNG : un décor remplacé
doit avoir ses nouvelles attentes documentées, sans changer les captures de référence de sa
propre initiative. Une mesure de contraste autour d'un centroïde n'est pas une preuve d'objet.
Archiver les anciens PNG avec leur successeur dans le verrou ; conserver le contrôle de leurs
empreintes originales. Les SVG de brouillon enregistrés dans `contenu/registre-svg.json` doivent
être inclus explicitement au futur commit même si le dossier est ignoré. Une archive audio du
même jour peut déjà exister : ne pas l'écraser, choisir un dossier de lot distinct, vérifier les
chemins absolus et l'inventaire avant tout déplacement.

Recette ciblée : `node scripts/playwright.mjs test tests/e2e/parcours-coloriages-reperes.spec.ts
--project=parcours --no-deps`. Une recette ciblée n'écrase pas le bilan d'une campagne complète.
Avant clôture générale, exécuter `npm run verifier` et lire `tests/rapports/RAPPORT.md`. Nommer
les rouges restants sans déplacer les références ni contourner les crochets git.
