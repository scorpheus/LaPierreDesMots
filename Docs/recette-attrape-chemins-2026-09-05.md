# Recette : Attrape mélangé et chemins par étape

## Retour et diagnostic

Les photos parent montrent `volcan-09` (cheval/cochon en tête d'Attrape), et `volcan-05`
(règle négative sur le son de fille). L'audit couvre les sept fiches de chaque famille.
Il est consigné dans `audit-chemins-2026-09-05.md`, pas remplacé par un simple verdict vert.

Le graphe Chemin offrait des mots corrects d'un autre segment, puis les refusait parce que
le réducteur n'attendait que son successeur encodé. Exemple : robe dans les mots en b,
ou signe dans les mots sans le son de fille. Les coches étaient globales, donc des mots
validés pour une ancienne règle semblaient aussi validés pour la suivante.

## Correction intégrée

- Attrape : permutation par Alea injecté, stable pendant la lecture et l'aide, renouvelée
  à chaque montage de session. Le DOM et les positions de la grille utilisent le même tirage.
- Chemin : chaque étape montre son segment et de vrais contre-exemples. Un mot conforme
  réservé à un autre segment n'est plus proposé puis sanctionné. L'ordre du trajet reste
  celui des liens visibles ; on n'ajoute ni détour sans issue ni réponse arbitraire.
- Les visites/coches sont locales à l'étape. Les acquis restent permanents pour le décor.
  Ainsi un ancien mot en b peut devenir un contre-exemple au nouvel exercice en d.
- Règle courte, groupe étudié souligné dans le mot-repère, numéro de chemin et annonce
  « Nouveau chemin ». Le rappel dit « Tu es sur » après le départ, sans appeler chaque
  nouvelle position « Départ ». Le retour d'aide garde un emplacement réservé.
- Quand la grille doit grandir, sa hauteur remonte jusqu'à la page. Les pierres ne
  recouvrent plus le bouton du compagnon ; pas de défilement imbriqué dans ce repli.
- Le mode de réponse est dérivé du graphe visible par étape, sans changer les constantes
  pédagogiques. La recette de rejeu reste obligatoire avant livraison.

La classification des sons est volontairement limitée aux mots relus de ce corpus.
Un mot inconnu, une phrase inconnue ou une cible contraire force un repli explicitement
non certifié, au lieu de deviner la phonétique. Le helper n'est pas un dictionnaire général.

## Tests discriminants

Avant correctif : 3 régressions Attrape rouges, 5 régressions de présentation/visite Chemin
rouges, 29 assertions sémantiques rouges sur 33. Deux autres tests ont trouvé une inversion
de la négation pour « ville » et l'absence de contrôle d'une cible contraire ; corrigés.
Le départ générique n'est pas une réponse : l'oracle lexical le distingue explicitement.

La table indépendante couvre les 20 étapes de lettres/sons des six fiches et marque
les trois étapes narratives de la Cité comme non certifiées. Elle vérifie les libellés
conformes, tous les leurres visibles et le maintien d'au moins deux choix à chaque pas.
Les 36 cas du helper passent, ainsi que les 173 tests ciblés couvrant aussi le compagnon,
les mots incomplets, Attrape et les anciennes régressions de ces composants.

Les 29 parcours tactiles ciblés passent dans quatre formats CSS : 720×1017, 1080×670,
390×700, 844×340. Images et polices décodées, réglages Andika 27 px / interligne 2,
touchers natifs uniquement. Le premier passage a réellement trouvé 16 recouvrements du
bouton d'aide par la grille : correction du conteneur, puis 29/29 verts en 22 s.
Les quatre échecs intermédiaires suivants étaient une attente de texte périmée après
reformulation du résumé, pas un assouplissement de la géométrie ou du geste.

Captures : `bac-a-sable/attrape-chemins-2026-09-05/`.
Le premier cliché Attrape illustre `volcan-01` (bateau/gâteau), pas la photo cheval/cochon
de `volcan-09` ; les sept fiches sont néanmoins couvertes par le test de permutation.

## Limites et suite

Le septième Chemin, `cite-des-histoires-07`, est jouable et contrôlé géométriquement,
mais son contenu n'est pas validé : des phrases promises comme images et une chronologie
discutable. Le contrôle `qa:coherence` le signale désormais (14 écarts, contre 11 auparavant).
Proposition de remplacement à relire : `proposition-chemin-cite-2026-09-05.md`.
Aucun de ces textes proposés n'est intégré sans visa parent.

Contrôle lexical local effectué sur les libellés UI. Hors petite liste : sans, nouveau,
départ, es, case, indice, possible, brille ; plusieurs étaient déjà affichés auparavant.
La liste n'est pas étendue artificiellement. Elle ne certifie pas à elle seule le CE1.

## Campagne globale et serveur

`npm run verifier` exécuté et lu : 709,6 s, six étapes rouges. Détail conservé dans
`tests/rapports/RAPPORT.md`, non transformé artificiellement en bilan vert :

- cohérence : 14 écarts (11 antérieurs et les trois consignes « images » de la Cité) ;
- unitaires/composants/API : 2632/2633, seul rouge mouche/abeille en attente du parent ;
- visuels : trois références devenues différentes avec les nouveaux coloriages, non remplacées ;
- E2E et qualité : même débordement réel de `volcan-09` sur grand écran ;
- bundle : non exécuté dans cette première campagne, car la qualité le précédant était rouge.

Après plafonnement des dessins à leur taille déclarée (sans les agrandir avec la largeur
d'écran), **756/756 E2E passent en 8 minutes**, avec bilan et rejeu verts. Ces chiffres précèdent
les derniers correctifs de défilement ci-dessous, ils ne sont pas une mesure de ceux-ci.

La relecture des captures trouve encore le sous-scroll d'Attrape en 720×1017. Le nouveau
contrôle rougit avant correction. La hauteur de grille remonte maintenant par flex jusqu'à
la page, sans `max-block-size:100dvh` hérité ni `overflow:auto!important` du moteur. Le même
plafond hérité est retiré du repli Chemin. Attrape utilise le flux CSS, sans verrou ResizeObserver.

Le balayage des quatre côtés intérieurs de chaque bouton trouve cinq régressions réelles :
les ailes de la luciole voisine capturent le doigt. `pointer-events:none` sur ces seuls
pseudo-éléments retire l'interception sans retirer le dessin. La preuve ne se limite plus
au centre d'un bouton. Les six premiers rouges du balayage comprenaient ces cinq cas et
le `main` encore défilant de volcan-09 ; aucune assertion n'est assouplie.

Dernier lot ciblé après ces corrections : **88/88 parcours en 1,3 minute** :
35 accessibilités Attrape (sept fiches × cinq formats), 31 chemins/mélange, 21 mots incomplets
et compagnon, plus l'audit des 75 nœuds pédagogiques aux deux grandes résolutions.
Les captures attendent désormais trois cadres stables via la sonde existante.
`parcours-finition.json` et `parcours-finition.log` sont dans le dossier des captures.

Autre régression ajoutée : l'indice périmé restait après un bon pas, puis demander une nouvelle
aide ne faisait rien. Test rouge, puis correction et **68/68 tests unitaires/composants ciblés**
verts ; palier d'aide inchangé, zéro erreur ajoutée. Le rejeu ne diverge pas. TypeScript et lint
passent (18 avertissements préexistants). L'oracle sémantique exige maintenant exactement
un voisin conforme égal au prochain pas, pour chacun des 20 chemins reconnus.

La campagne qualité suivante passe 247 contrôles qualité/latence et 66 contrôles responsive,
mais un débordement est relevé à 360 px sur un Chemin, puis ce même cas passe seul. Quatre
cas dépendants n'ont alors pas tourné. La sonde ne garantissait que deux frames de rendu ;
elle utilise maintenant les trois cadres identiques de `attendreGeometrieStable` et ne
masque plus les erreurs de décodage.

Cette sonde durcie expose un vrai 404 : `SceneDecor` cherchait `galeries-grottes-v2.png`
au lieu du PNG approuvé `galeries-grottes.png`. Alias corrigé après test unitaire rouge,
puis 5/5 verts. Aucun asset nouveau ou remplacement artistique.
Elle expose aussi une course dans son propre prévol : React peut ajouter les images du
chaudron entre la vérification `complete` et la lecture des dimensions. Le contrôle est
déplacé après `decode()`, pas supprimé. Témoin réseau déterministe rouge avant correction,
puis vert ; le témoin de vraie image cassée continue de rejeter. La première variante du
témoin en data URI était trop rapide et passait déjà avant correction : remplacée par une
réponse réseau interceptée, sans attente arbitraire.

Le balayage suivant révélait encore une vraie instabilité dans `foret-muette-05` à 360×640.
Un test dédié relève 30 cadres consécutifs, puis exige dix cadres finaux identiques et trois
cadres stables de la sonde commune, après rotation, agrandissement et retour au petit écran.
Rouge avant correction : la largeur du moteur reste 344 px, le viewport CSS 360 px, mais
`innerWidth` alterne 360/437 et le repli oui/non revient toutes les quatre images.
La hauteur du moteur alterne 0/860/480 px. L'hypothèse initiale de scrollbar changeant sa
largeur est donc écartée : le débordement mobile agrandit aussi `innerHeight`, employé dans
la clé qui réinitialisait le repli. `document.documentElement.clientHeight` reste stable.
Son utilisation supprime la boucle sans modifier la règle du jeu ni masquer le débordement.
Le test et le lot de 30 écrans fautif passent ensuite (2/2 en 10,9 s).

**Dernière matrice responsive : 71/71 verts, 2,2 minutes**, sans cas ignoré ni relance
automatique. Elle couvre les deux fichiers de composition, les contrôles négatifs, les
14 moteurs, les recettes dans les quatre formats et la nouvelle régression de rotation.
Preuves : `responsive-viewport-final.json` et `.log` dans le dossier de recette. Ce n'est
pas une nouvelle exécution des 247 contrôles qualité/latence précédents.
Le fichier JSON a été copié du rapport brut immédiatement après la campagne : la première
commande employait l'ancienne variable `PLAYWRIGHT_JSON_OUTPUT_NAME`, inopérante. Les campagnes
suivantes utilisent bien `PIERRE_RAPPORT_JSON` ; aucun rapport antérieur n'est présenté comme
une mesure nouvelle.

Après le correctif de viewport : **31/31 parcours natifs en 31,3 s** (sept chemins × quatre
formats et les trois vérifications de mélange), **43/43 tests unitaires/composants**,
TypeScript et lint verts (18 avertissements anciens). Preuves `chemins-viewport-final.json`
et `.log`. Budget final : 11/11, 239,5 Ko gzip sur 250 Ko ; aucun crochet de test dans les
dix fichiers de production inspectés. Les deux vignettes de contrôle à 512 px sont relues :
la règle négative et son plateau restent disjoints ; les 14 choix Attrape sont présents sur
une page naturellement défilable, sans les ailes capturant les touchers voisins.

Le serveur est reconstruit et relancé sur **http://192.168.1.19:8080/** (lanceur final PID 46588).
HTML, JS, CSS et quatre portraits servis comparés par SHA-256 aux fichiers du build/dépôt :
identiques. JS `/assets/index-CGVxgXVk.js`, SHA-256
`8fc6a9ff117a7d6383adeb267637e41801ca18e4a6a88fd63052846845cd8379`.
Les six coloriages conservent aussi leurs empreintes SVG/PNG. Preuves `serveur-verifie.json`
dans les deux dossiers de recette. Recharger la page du navigateur de la tablette.

La procédure QA est enrichie dans le skill `banc-de-mutation` (validateur du skill vert) :
oracle indépendant, vraie propriété de défilement, ailes décoratives et indices entre deux pas.
Le cas de viewport mobile auto-agrandi et le contrôle après rotation y sont également consignés.
Pas de publication GitHub/APK, pas de remise à zéro des profils.
Les autres écarts de contenu, les références visuelles et les atlas animés non approuvés
restent dans la file générale. Ne pas confondre ce lot testé et « tout le projet terminé ».
