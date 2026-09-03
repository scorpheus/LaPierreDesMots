# Suivi de production des images — Clairière

Date de démarrage : 2026-09-03

Ce document conserve la recette et l'état de validation des décors raster produits pour les
exercices de la Clairière. Une seule image est générée à la fois. Aucun brouillon n'est promu dans
les assets servis à l'enfant avant validation explicite du parent.

## File de production

1. `collier` — V1 produite, validation parent en attente
2. `guirlande` — en attente
3. `lianes` — en attente
4. `luciole` — en attente
5. `lucioles` — en attente
6. `paniers` — en attente
7. `veillee` — en attente

## Décor `clairiere/collier`

### État

- Brouillon : `contenu/brouillons/decors/clairiere-collier-v1.png`
- Dimensions : 1536 × 1024 px
- Taille : 2 472 791 octets
- SHA-256 : `6593389D422FA16E851119C6AE78F5137E3CC8BFFB71269C7E1A8C6C3986FBCE`
- Générateur : générateur d'images intégré à Codex
- Références de style : `contenu/assets/campement/campement-v6.png` et
  `contenu/assets/decors/ecole.png`
- Relecture visuelle contradictoire : promouvable, sans dominante sépia ni patch de couleur
  gênant ; composition et objets lisibles pour un enfant de 7 ans
- Validation parent : en attente
- Intégration applicative : non commencée

Une première proposition de contrôle qui demandait un dessin au trait sur fond blanc a été
écartée : elle contredisait la direction raster illustrée validée par le parent.

### Contrat d'intégration après validation

- Exercice consommateur : `contenu/exercices/clairiere/collier-syllabes-01.json`
- Habillage : `contenu/habillages/clairiere/collier.habillage.json`
- Repli SVG actuel : vue `0 0 960 600`, à conserver jusqu'à validation de l'intégration raster
- Régions attendues : `ciel-du-matin`, `mousse`, `herbe-du-bord`, `coffret`, `fil`, `perle-un`,
  `perle-deux`, `perle-trois`, `feuille-posee`, `caillou`

### Prompt de génération V1

```text
Use case: illustration-story
Asset type: décor maître de mini-jeu éducatif pour tablette, paysage 3:2, 1536 × 1024
Input images: Image 1 est la référence principale de style graphique validé ; Image 2 est une référence secondaire pour la netteté éditoriale et la lumière naturelle. Ne pas reprendre leur composition ni leurs objets.
Primary request: créer de zéro le décor « Le collier de syllabes » pour un enfant de 7 ans.
Scene/backdrop: clairière fraîche au matin, ciel bleu doux en arrière-plan, mousse et herbe en bord inférieur.
Subject: au centre-bas, un coffret en bois ouvert, large et nettement détaché ; un fil épais et continu tendu en courbe souple ; exactement trois grosses perles séparées sur le fil, dans l’ordre visuel petite, grande, moyenne ; une feuille posée et un petit caillou au premier plan droit.
Style/medium: illustration jeunesse éditoriale française, dessin organique précis, formes propres, aplats mats subtilement texturés, contours bleu nuit doux, détails nets et contrôlés. Conserver le style naturel et chaleureux de l’Image 1, mais avec des surfaces plus propres et moins picturales.
Composition/framing: panorama 3:2 en trois plans, caméra légèrement surélevée ; coffret et fil immédiatement lisibles ; grand espace calme dans la moitié supérieure et autour du fil pour les boutons d’interface ; chaque objet possède une silhouette fermée et facilement masquable.
Lighting/mood: lumière naturelle fraîche du matin, ambiance joyeuse et calme.
Color palette: verts frais, bleus doux, bois brun naturel, petites touches rose framboise et bleu ; blancs neutres. Éviter toute dominante jaune, sépia ou orange.
Constraints: exactement un coffret, un fil et trois perles ; le fil reste visible et non recouvert ; coffret et perles ne fusionnent pas ; aucune texture dense derrière les perles ; aucune syllabe ni élément mobile peint dans le décor ; aucun personnage, animal ou main ; aucun texte, lettre, chiffre, symbole, étiquette, quadrillage, cadre, logo ou filigrane.
Avoid: aspect cartoon générique, objets kawaii ou anthropomorphes, yeux ou visages sur les objets, peinture à l’huile, aquarelle floue, coups de pinceau visibles, patchs de couleur irréguliers, halos, rendu 3D/plastique, ombres lourdes, lumière dorée jaunâtre, collier porté ou déjà fermé comme un bijou fini.
```
