# Suivi consolidé des retours parent — 3 septembre 2026

Cette note remplace le suivi implicite par conversation. Elle couvre tous les retours de jeu reçus
jusqu'au lot des lucioles. L'audio reste volontairement hors périmètre.

## Corrigé et couvert par une recette courte

| Retour observé | État actuel | Preuve ciblée |
|---|---|---|
| Code parent ancien inconnu et pavé bloqué après quatre chiffres | récupération des anciens foyers, mode de définition explicite et bouton « Effacer » utilisable | `recuperation-code-parent.test.ts`, `EcranCodeParent.test.tsx` |
| École : cinq choix pour trois consignes, mais seulement trois dépôts | les cinq choix restent volontairement présents comme trois réponses et deux intrus ; les trois zones du décor sont toutes atteignables | `MoteurPlace.test.tsx`, `place-validation.test.ts` |
| Maîtresse sans visage | l'illustration `ecole.png` publiée montre désormais un visage complet | empreinte d'asset et recette du décor Clairière |
| Aide de Gobi qui répète la consigne | l'aide donne une stratégie distincte et ne concatène plus la phrase | `aide-de-gobi.test.ts` |
| Tri des couleurs refusant rose, vert ou bleu | toutes les couleurs sémantiques sont acceptées ; les mots qui ne sont pas des couleurs vont dans l'autre panier | `MoteurTri.test.tsx`, recette tactile dédiée |
| Décor coupé selon la hauteur | cadrage `contain` et plateaux compacts sur les moteurs concernés | recettes 1920×1080 et 1280×720 |
| Lune décrite ronde alors que l'image montre un croissant | consigne et réponse alignées sur le croissant | garde de contenu |
| Éclair : bouton mal placé, décor qui rétrécit et bonne réponse toujours au milieu | bouton intégré au panneau stable, dimensions conservées et position non répétée | `MoteurEclair.test.tsx`, recette Galeries |
| Mot incomplet minuscule dans « Trace la lettre » | repère central d'au moins 48 px, séparé du clavier | `MoteurGrave.test.tsx`, recette Galeries |
| Particules qui restent après un exercice | nettoyage à la sortie du nœud, à l'entrée/sortie de la récompense et avant l'exercice suivant | `EcranNoeud.test.tsx`, `EcranRecompense.test.tsx` |
| Chaudron compté comme exercice | route libre dédiée, hors progression, sans récompense pédagogique | recette chaudron et validation du catalogue |
| `/noeud` sans exercice lisible | écran explicite avec retour vers la carte, sans chargement infini | `EcranNoeud.test.tsx` |
| « fini » affiché après 6 exercices sur 13 | le texte distingue maintenant la sortie terminée de la région qui continue | `EcranRecompense.test.tsx` |
| Cadeau ou nouvelle zone annoncés sans résultat visible | annonce seulement si un asset concret est remis ou si une région passe réellement de fermée à ouverte | `CascadeRecompense`, `EcranRecompense.test.tsx` |
| Coffre : petites vignettes, nom masqué, cercle parasite, fiche instable | cases de 80–88 px, fiche centrée, dessin de 144 px, aucun cercle décoratif, progression restante réelle | `EcranCoffre.test.tsx`, recette Chromium coffre |
| Lucioles avec une phrase entière dans chaque cible | chaque cible affiche seulement `bleu`, `vert`, `rouge`, etc. dans une luciole lumineuse lisible | `lucioles-affichage.test.ts`, recette Chromium lucioles |
| Consignes difficiles pour un enfant de sept ans | 76 fiches et 283 consignes relues ; formulations récurrentes simplifiées sans changer le geste | `formulations-ce1.test.ts`, `test:contenu` |
| Carte avec destinations ou routes fantômes | six destinations seulement et marqueurs recalés sur les régions nommées | `EcranCarte.test.tsx`, garde carte de la QA rapide |
| Carte entièrement grise au départ | la grisaille reste le langage de progression ; les zones se colorent depuis le journal, sans promettre une zone non ouverte | tests carte et rejeu ciblés |

## Encore à faire — dette visuelle réelle

- Le coffre est maintenant utilisable et lisible, mais ses formes, Éclats et objets sont encore des
  dessins techniques. Ils doivent être remplacés par les vrais assets raster au fur et à mesure de
  leur validation.
- Les coloriages autres que l'école utilisent encore des dessins SVG de blockout. Le chaudron a
  besoin d'un beau dessin raster et d'un masque de régions indexé ; le brouillon actuel contient
  trop de petites régions pour être publié.
- Plusieurs scènes ont reçu un beau fond raster, mais les éléments interactifs posés dessus restent
  parfois des pictogrammes ou des SVG. La mécanique est testée ; la finition artistique n'est pas
  terminée.
- Les 76 recettes prouvent la présence des gestes et du contenu, pas encore une validation esthétique
  humaine de chaque étape. Les nouvelles images doivent être revues en contexte, par petites séries
  de captures, avant de remplacer les références visuelles.
- Les animations avancées du campement demandent des calques détourés et des sprites partageant les
  ancres du fond V5. Le feu et le papillon actuels sont conservés, mais le reste du décor ne possède
  pas encore les micro-interactions illustrées prévues.

## Boucle de validation retenue

La boucle courte devient la boucle normale : garde de contenu, tests du moteur touché, deux recettes
Chromium à la résolution concernée, puis `qa:rapide`. La campagne complète ne tourne qu'à la fin
d'un lot transversal ou avant livraison. Cela évite de payer plusieurs minutes pour chaque retouche
CSS tout en gardant une preuve observable sur le défaut corrigé.
