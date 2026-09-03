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
| Éclair : « Montre-moi le mot » confondu avec les réponses, décor qui rétrécit et bonne réponse toujours au milieu | commande jaune dédiée au-dessus de l'illustration, mot séparé au centre, dimensions conservées et réponses brassées | `MoteurEclair.test.tsx`, recette Galeries |
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
| Phrase et mots à construire tassés à gauche | modèle, fentes et retours sont centrés dans leur espace de lecture | `MoteurPhrase.test.tsx` |
| Mur des noms sans réaction visible | instruction explicite, sélection visible et rappel du nom gravé ; le geste fonctionne sans audio | `MurDesNoms.test.tsx` |
| Fin de sortie partielle sans moyen de continuer | « Continuer [la région] » est l'action principale et ouvre directement le premier exercice inédit | `EcranRecompense.test.tsx`, `reprise.test.ts` |
| Retour dans une région qui repropose des exercices déjà finis | le serveur et le mode autonome transmettent le journal au sélecteur ; une sortie privilégie les inédits et garantit même le dernier restant | `selecteur.test.ts` |
| Déblocage suivant invisible sur la carte | la carte annonce que la prochaine région s'ouvre à la fin de la région courante et compte les exercices restants | `EcranCarte.test.tsx` |
| Coffre encore entièrement technique | une illustration raster du coffre accueille désormais l'enfant ; les six fiches d'Éclats gardent enfin leur silhouette régionale | `EcranCoffre.test.tsx`, `production/assets.lock.json` |

## Encore à faire — dette visuelle réelle

- Le coffre est maintenant utilisable, lisible et possède une illustration raster d'accueil. Ses
  25 formes de Gobi, ses 6 Éclats et ses 6 objets individuels restent toutefois des dessins
  techniques à remplacer au fur et à mesure de leur validation.
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

## Asset raster ajouté pendant cette passe

`contenu/assets/coffre/coffre-ouvert-v1.png` a été produit en une génération puis une retouche
ciblée par le générateur intégré, à partir du campement V6 comme référence de style. Le damier que
le générateur avait peint a été converti en véritable canal alpha avec ffmpeg. Le prompt, les deux
étapes, les dimensions et l'empreinte du fichier publié sont conservés dans
`production/assets.lock.json`.
