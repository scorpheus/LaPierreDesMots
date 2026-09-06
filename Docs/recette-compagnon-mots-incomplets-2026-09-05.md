# Recette locale : compagnon et mots incomplets

## Demande et causes

Deux photos parent : Roc absent du résultat ; « bateau » présenté comme `bat_au` avec des
touches `o / au / eau / ot` sous une consigne de tracé. La nouvelle recette n'annule pas
les autres travaux suivis dans `etat-courant-et-file.md`.

- Le résultat ignorait `sortie.compagnon` : portrait canonique désormais résolu depuis le
  même catalogue que dans l'exercice. Gobi reste utilisé sans compagnon ; ses évolutions
  et les nouveaux compagnons ralliés restent des récompenses distinctes.
- Le rendu de `grave` remplaçait un seul caractère même pour les groupes de trois lettres.
  Après une bonne réponse, il fabriquait notamment `bateauau` et `billlle`. Le réducteur
  acceptait correctement le geste : une assertion sur « exercice réussi » ne pouvait pas
  repérer ce défaut de reconstruction.
- Un parcours tactile a aussi trouvé la perte du compagnon après un refus 409 du composeur.
  Le repli reste jouable et conserve maintenant le choix dans une session locale d'une étape,
  sans prétendre avoir composé/archivé un plan pédagogique sur le serveur.

## Présentation

Les cinq fiches `grave`, soit 29 mots, emploient le même rendu corrigé : tout le groupe est
masqué, par exemple `bat___` et `b___e`. Le clavier est centré et aligné sous le mot dans
tous les formats. Le mot complet est explicitement nommé « Modèle », et la règle demande
de toucher les lettres. Il s'agit d'une reconstruction orthographique guidée, pas de tracé,
ni d'une devinette sonore. Aucun nouveau décor n'est nécessaire pour cette correction.

Le vocabulaire des 29 mots, les compétences et le barème n'ont pas changé. Le contrôle
lexical local a été exécuté sur les nouveaux textes : « compléter » et « modèle » sont
absents de la petite liste interne. Ces deux mots usuels d'école sont conservés et nommés
ici ; la liste n'a pas été augmentée pour obtenir artificiellement 100 %. Ce contrôle
ne constitue pas une certification officielle de niveau CE1. Les clips de consignes des
fiches restent ceux du contenu existant ; ils n'ont pas été régénérés dans ce correctif UI.

## Preuves avant correction

- Résultat : 7 nouvelles régressions rouges / 22 anciennes vertes.
- Reconstruction : 14 rouges / 19 verts sur les 33 nouveaux contrôles. Le premier jet du
  test comptait aussi la copie réservée au lecteur d'écran ; ce faux positif a été corrigé
  avant de modifier l'application. L'oracle lit désormais les glyphes visibles.
- Repli de sortie : 2 régressions rouges / 17 anciennes vertes avant sa correction.

Les tests de composants reconstruisent exactement chacun des 29 mots depuis les fiches du
disque, et couvrent aussi deux trous contenant plusieurs lettres. Aucun mot attendu n'est
calculé par le helper de rendu qu'il est censé vérifier.

## Recette navigateur

`tests/e2e/parcours-mots-incomplets.spec.ts` parcourt les cinq fiches au doigt en 720×1017,
1080×670, 390×700 et 844×340, avec les réglages réels Andika 27 px / interligne 2.
Il vérifie les lettres masquées à chaque étape, le modèle, le centrage du clavier, l'absence
de recouvrement et de débordement horizontal. Polices et images décodées avant capture.
Un autre parcours choisit réellement Roc sur la carte puis joue jusqu'au résultat sans
injection de réponse. Il couvre aussi le repli 409 observé avec ce profil de contrôle.

Les premières calibrations du parcours ont exposé deux erreurs du harnais, non de l'enfant :
sélecteur de consigne comprenant des éléments cachés, et préparation incluant une activité
libre non journalisable. Ces erreurs ont été retirées avant de compter les résultats.

## Mesures finales et livraison

21/21 parcours tactiles passent, dont Roc réellement choisi puis affiché à la récompense.
Ce lot repasse dans la campagne générale 756/756, puis dans les 88 parcours ciblés après
la dernière correction CSS Attrape/Chemin. Composants : récompense 29/29, carte 19/19,
groupes de lettres 33/33, ancien Grave 10/10, écran de nœud 15/15.
Serveur reconstruit et redémarré le 5 septembre : http://192.168.1.19:8080/.
Les quatre portraits et le bundle servi sont identiques aux fichiers du dépôt/build,
empreintes dans `bac-a-sable/attrape-chemins-2026-09-05/serveur-verifie.json`.
Le rapport global conserve ses rouges de contenu et de références visuelles ; détails et
contre-vérifications dans `recette-attrape-chemins-2026-09-05.md`.
Captures : `bac-a-sable/compagnon-mots-incomplets-2026-09-05/`.

## Reste hors de ce lot

Les 11 reformulations déjà en attente, les différences de captures de référence, les quatre
atlas animés non approuvés et le référentiel lexical incomplet restent suivis. Le 409 du
profil de contrôle vient de prérequis non maîtrisés (seuil 0,60) malgré des nœuds notés finis :
ne pas confondre fin de région et maîtrise de toutes les compétences. Le présent correctif
préserve le compagnon dans le repli, il ne change pas cette politique pédagogique.
Pas de publication GitHub/APK, pas de remise à zéro d'un profil familial.
