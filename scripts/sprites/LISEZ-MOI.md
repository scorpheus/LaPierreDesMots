# Pipeline des petits sprites de décor

Ce dossier transforme une planche PNG générée en grille approximative `4 × 2` en une planche de
production régulière de huit images. Il n'effectue aucune génération : il rend déterministes la
découpe, la transparence, l'échelle commune, l'ancrage et la QA. Les frontières théoriques de la
grille ne servent pas à couper l'image : le script récupère les huit composantes principales sur
toute la planche, puis rattache les petits éléments proches (braises, antennes, lueurs) à leur pose.

Le script ne dépend d'aucun paquet npm ni outil global. Son lecteur/encodeur PNG local accepte les
PNG 8 bits non entrelacés en RGB, RGBA ou niveaux de gris. Les PNG indexés doivent d'abord être
convertis par l'outil qui les produit.

```powershell
node scripts/sprites/normaliser-planche.mjs `
  --entree bac-a-sable/sprites/feu-brut.png `
  --sortie bac-a-sable/sprites/feu-8.png `
  --contact bac-a-sable/sprites/feu-contact.png `
  --rapport bac-a-sable/sprites/feu-qa.json `
  --largeur-cellule 256 `
  --hauteur-cellule 256 `
  --ancre bas-centre
```

Options utiles :

- `--ancre centre` convient au papillon et aux lucioles ; `bas-centre` convient au feu ;
- `--fond #000000` force la couleur à retirer, sinon elle est estimée dans les quatre coins ;
- `--seuil-fond 32` règle la tolérance au fond uni ;
- `--plume 32` règle la transition alpha et la décontamination des bords ;
- `--marge 12` réserve une garde intérieure contre les débordements.

Le rapport JSON fait foi pour les contrôles mécaniques : huit cellules non vides, dimensions,
cadres source et finaux, débordements, échelle commune et stabilité de l'ancre. La planche de
contact reste nécessaire pour le jugement humain du style, de l'ordre des images et de la fluidité
du mouvement. Une bonne métrique ne peut pas détecter une mauvaise animation.
