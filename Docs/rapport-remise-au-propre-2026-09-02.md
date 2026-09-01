# Rapport de remise au propre — 2 septembre 2026

## Verdict

Le site local, son serveur et le port Android sont bien présents. Le socle applicatif est sain :
compilation, types, contenu, tests métier, accessibilité, mise en page tablette, robustesse et
budget du bundle sont contrôlés. La reprise a supprimé les régressions techniques observées le
1er septembre et a relié la vraie progression par sorties au parcours de l'enfant.

Deux validations parent empêchent encore de qualifier la version de finale :

1. un profil neuf ne possède que trois exercices admissibles dans sa première sortie de la
   Clairière, alors que le contrat exige quatre à six étapes ;
2. les nouveaux rendus de la carte, du coloriage, de la récompense et des polices diffèrent des
   références visuelles historiques. Elles n'ont pas été remplacées sans validation.

Le site est donc prêt pour une revue parent, mais pas pour une recette enfant déclarée finale.

## Corrections livrées

### Progression réelle

- la carte et la pastille du campement demandent désormais un vrai plan au composeur de sorties ;
- le plan courant est conservé par le magasin et chaque récompense ouvre l'étape suivante ;
- la fin d'une sortie ramène au campement et clôt le plan ;
- l'écran du nœud indique le rang et le total de la sortie ;
- le cache de progression est rafraîchi après les mutations ;
- les crochets de test exposent un état cohérent et idempotent ;
- l'ordre déclaré des nœuds de la Clairière a été remis en cohérence avec l'ordre servi ;
- les scénarios E2E partent maintenant de la carte réellement visible par l'enfant et vérifient
  l'identité des nœuds, pas seulement la présence d'un écran.

### Interface et tablette

- la carte utilise une grande zone illustrée et un panneau de destination lisible ;
- le choix de profil tient sans défilement dans la tablette de référence ;
- les fonds et panneaux ont été harmonisés sans animer le champ de lecture ;
- l'étagère du coffre utilise une vraie structure `li > button`, valide pour l'accessibilité ;
- le pavé parent désactive les chiffres une fois les quatre positions remplies ;
- les moteurs `libre`, `place` et `colorie` séparent désormais la forme visible de la prise
  tactile ; toutes les prises mesurées restent au moins à 64 × 64 px, même avec le corps maximal ;
- le tracé utilise correctement la transformation inverse de la scène ;
- le chaudron attend le chargement de sa destination avant d'accepter le tap ;
- le bundle ne précharge que la graisse Andika utile au premier rendu.

### Testeur et garde-fous

- Q5 ignore correctement les contrôles cachés derrière une modale et conserve un contrôle positif
  capable de détecter un vrai bouton mort ;
- la population des écrans est comparée à l'inventaire déclaré : 14 sur 14 ;
- les campagnes de sortie vérifient le plan réellement composé ;
- les fixtures temporelles sont déterministes ;
- la qualité attend la scène asynchrone au lieu d'effectuer une mesure instantanée instable ;
- le banc de mutation agrège ses fragments sans écraser le rapport complet et son tableau de bord
  devient rouge si la mesure est incomplète, périmée ou privée d'un ancrage ;
- le dossier partagé `commun` n'est plus compté comme un quinzième moteur métier ;
- la durée réelle du banc de mutation, environ 30 à 35 minutes, est documentée.

## Mesures finales

| Contrôle | Résultat du 2 septembre 2026 |
|---|---:|
| TypeScript | vert |
| ESLint | vert, 21 avertissements historiques après retrait de l'avertissement introduit pendant la reprise |
| Unitaires, composants et API | 2 164 / 2 164 verts |
| Contenu | 608 / 608 verts |
| E2E | 464 verts, 1 rouge pédagogique, 12 bilans non exécutés |
| Qualité | 247 / 247 verts |
| Bundle initial | 232,2 Ko gzip / 250 Ko |
| Visuel | 4 / 15 verts ; 9 références différentes et 2 absentes |
| Tableau de bord QA | rouge honnête : ancien rapport de mutation non opposable |
| Tests trompeurs | 0 bloquant, 96 avertissements, cliquet actuel 98 |

La campagne E2E n'a plus qu'une cause rouge : la première sortie de la Clairière contient trois
étapes au lieu de quatre à six. Les huit autres causes présentes avant la dernière correction
(prises de coloriage et course du chaudron) ont été rejouées puis éliminées.

## Arbitrage pédagogique demandé

Sur un profil neuf, le sélecteur respecte le seuil de maîtrise des prérequis. Seuls trois contenus
de la Clairière sont admissibles simultanément. Deux corrections sont possibles :

- recommandée : livrer ou reclasser un quatrième exercice réellement élémentaire, sans prérequis
  de maîtrise, puis garder le contrat de quatre à six étapes ;
- alternative : autoriser exceptionnellement une première sortie de trois étapes, ce qui modifie
  le contrat de durée et doit être une décision explicite.

Le code et le test n'ont pas été assouplis en silence.

## Validation visuelle demandée

Les différences visuelles correspondent à la nouvelle composition de la carte et des profils, aux
prises tactiles corrigées, aux assets vivants de carte et d'école, et à l'écran de récompense plus
riche. Après revue parent, une validation autorisera soit la régénération des références, soit une
nouvelle passe de design. Les références actuelles n'ont pas été écrasées.

Deux polices proposées, Luciole et Belle Allure, n'ont toujours pas leur fichier WOFF2 embarqué.
Elles retombent donc sur une police locale de secours. Il faut obtenir une source et une licence
vérifiables, ou les masquer de l'interface avant la recette enfant.

Les cinq illustrations d'ouverture restent des dessins vectoriels de travail marqués
`PLACEHOLDER`. Le générateur d'images n'est pas nécessaire aux corrections techniques ; il sera
utile si le parent décide de remplacer ces cinq tableaux. Les quatre compagnons disposent déjà de
PNG de production et doivent être montrés au parent avant toute nouvelle génération.

## Android

L'APK autonome a été reconstruite pendant l'audit du 1er septembre : environ 20 Mo, contenu et
voix embarqués, `minSdk=24`, `targetSdk=36`. Elle n'a pas été réinstallée sur une tablette physique
pendant cette reprise. Une nouvelle APK devra être reconstruite après l'arbitrage pédagogique et
la validation visuelle afin d'embarquer exactement le site approuvé.

## État du banc de mutation

Le dernier rapport complet a duré 1 898 981 ms et est antérieur aux réparations de ses ancrages.
Le tableau de bord le refuse désormais explicitement au lieu d'afficher un taux rassurant mais
invalide. La campagne complète devra être relancée après stabilisation du prochain lot ; elle n'a
pas été présentée comme une preuve fraîche dans ce rapport.
