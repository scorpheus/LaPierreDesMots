# État courant et file de travail

Dernière mise à jour : 6 septembre 2026.

Ce document est la mémoire de passage du projet. La conversation principale reste le poste de
pilotage : tout nouveau retour du parent s'ajoute à cette file tant qu'il n'est pas explicitement
annulé, remplacé ou reporté.

## Corrections sauvegardées — bilan du 6 septembre

**Commit d'intégration : `2970567` — `Jeu: finaliser les corrections tablette et renforcer la QA`.**
180 fichiers, avec les sources des archives et les documents des lots. Crochet Git normal
réussi : lint, 2675 T1/T2 et détecteur QA ; aucun contournement. Les deux documents de suivi
sont finalisés dans le commit de documentation suivant. Aucune publication GitHub ni APK.

La campagne complète a été exécutée en **823,5 s** : **2675/2675 T1/T2, 869/869 parcours,
320/320 qualité/responsive, 655/655 contrôles de contenu**. Aucun cas sauté ou instable dans
les rapports Playwright. Types, lint, builds, ressources, budget et rejeu verts ; cinq seuils
de couverture atteints. La commande globale reste **rouge sur le seul étage visuel** : trois
différences Colorie sur treize comparaisons. Les captures ne sont pas approuvées par ce bilan.
Planche locale : `bac-a-sable/cloture-git-2026-09-06/comparaison-visuelle.html` ; rapport complet
conservé dans `bac-a-sable/cloture-git-2026-09-06/RAPPORT-apres-corrections.md`.

Serveur relancé et vérifié : **http://192.168.1.19:8080/**, profils conservés. Huit fiches corrigées
comparées intégralement entre HTTP et disque, HTML/JS/CSS et portraits comparés par SHA-256.
Le JavaScript reste `index-Cbbgf2Fy.js` (changement de données/CSS), le nouveau style est
`style-D8Xe68Pb.css`, SHA-256 `d2e8892a1ff8041f1cb2cc4ebc9e697064b95f679aa7458650e563bcb4deccfd`.
Relancer l'onglet de la tablette pour sortir d'un exercice déjà chargé.

Demande parent : documenter et commiter les lots accumulés. Inventaire trié en coloriages,
infrastructure/QA, jeu et suivi ; détails : `cloture-git-2026-09-06.md`. Les photos privées sont
désormais ignorées. Quatre anciens décors archivés à l'identique, cinq SVG sources et leurs
trois PNG relatifs inclus explicitement dans la préparation, aucun atlas non approuvé promu.

Après le refus du premier commit, le parent a explicitement demandé de **corriger puis commiter**.
La demande de dérogation est abandonnée : les crochets restent actifs. L'abeille du Volcan est
remise en accord avec le récit et son image ; les consignes des Lucioles et des Marais ainsi
que les intitulés des Ponts sont corrigés. La revue a aussi retrouvé dix critères de paniers
oubliés du contrôle : garde élargi, témoins rouges puis verts, **76 fiches sans incohérence
mécanique signalée**. 24 écarts corrigés, 27 chaînes avec les mots-clés, réponses inchangées.

Le faux positif du détecteur (`cible` dans une chaîne d'attribut) est corrigé avec témoins ;
aucun plafond relevé. Cassecou vérifie les deux cas d'aide : automatique seule/deux étoiles,
volontaire/une étoile. Les 40 erreurs et les acquis préexistants restent contrôlés dans chacun.
Le bouton d'aide rétrécissait réellement à 61 px pendant l'appui : le relief reste, la réduction
commune est supprimée, 3/3 scénarios Cassecou verts. Détail : `lot-corrections-cloture-2026-09-06.md`.

25 clips régénérés et contrôlés, aucun refus ; 673 clips/368 consignes couvertes. Les 23 anciens
clips remplacés sont archivés avec manifeste récupérable, pas détruits. La nouvelle option
`--lot-archive` permet une seconde archive sans écraser la première ; 11/11 tests du prévol.

**Campagne précédente**, avant ces corrections, exécutée en 867,2 s : 2660/2661 unitaires, 853 E2E passés / un rouge
Cassecou / 14 bilans non exécutés, **320/320 qualité/responsive**, 655 contrôles structurels,
bundle et rejeu verts. Les 14 incohérences de ce passage sont corrigées ci-dessus ; trois
références visuelles restent gelées. La nouvelle campagne ci-dessus remplace ce verdict
historique pour l'état courant.
La réussite responsive de ce passage n'efface pas les incidents intermittents antérieurs.
Les preuves historiques ne sont pas remplacées par les contrôles ciblés.

Ajout à la file de prochaine livraison autonome : exclure des paquets les quatre anciens PNG
archivés sous `contenu/assets/` (11 718 757 octets), en conservant leur provenance dans Git.
Toutes les autres dettes et validations en attente ci-dessous sont maintenues.

## Correctif local — toutes les paires dans la page tablette (6 septembre)

Le dernier retour précise que le défilement ne suffit pas : les cartes étaient trop grandes.
La composition Paires est refaite pour les huit fiches, avec colonnes larges pour les textes,
étroites pour les images, cadre compact et une seule consigne. Aucune carte retirée ; réglages
de lecture du profil conservés (27 px/interligne 2 dans la recette), cibles >= 64 px.
**78/78 contrôles ciblés en 34,8 s**, dont 32 de cadrage complet sans scroll sur quatre formats
tablette, rotation, stabilité lors des sélections et appariements. Les balayages sur téléphone
et les glissers souris/tactiles restent testés. Contrat et preuves :
`lot-paires-plein-ecran-2026-09-06.md`. Commande courte : `npm run test:paires`.
Le glisser ne dilate plus la page à l'horizontale ; les cartes acquises ne sont plus des cibles
de dépôt. Deux rouges reproduits, puis 20/20 cas répétés et les 78 contrôles de famille verts.

Serveur reconstruit et relancé le 6 septembre : **http://192.168.1.19:8080/**.
Build final `index-Cbbgf2Fy.js`, SHA-256
`b77425c3ff00da9040629a26085479cb8723051cdaf65da2391a4481a3f717bd`.
HTML/JS/CSS servis comparés au build, profils conservés. Recharger l'onglet de la tablette.
Aucune publication GitHub ni APK. Vérification générale exécutée en 717,3 s, non entièrement
verte : 14 incohérences textuelles, une vignette Volcan non approuvée, trois références visuelles,
un scénario Cassecou qui attend une seule étoile après aide automatique (deux reçues sans
demande explicite) et un démarrage de navigateur intermittent. Ce dernier passe 3/3 isolément,
sans être déclaré résolu. Le glisser tactile rouge de cette campagne est suivi des correctifs
et répétitions décrits ci-dessus. Les 73 tests responsive/latence bloqués par dépendance sont
ensuite exécutés **73/73 verts** ; 17/17 unitaires ciblés, types/lint et budget 239,7 Ko verts.
Rapport historique et contre-vérifications restent distincts, aucun test ni seuil affaibli.
Les autres dettes ci-dessous ne sont ni effacées ni annoncées résolues.

## Correctif précédent — Paires défilables au doigt (5 septembre)

Photo parent `cite-des-histoires-02` : huit paires, grandes phrases, dernières cartes hors
écran. Rouge reproduit par de vrais balayages : les cartes empêchaient le pan vertical
(`touch-action:none`/PointerSensor), et le parent n'adoptait pas la hauteur de la grille.
Correction sur le moteur commun aux **huit fiches Paires**, sans changement de contenu :
document défilant, capteurs souris/tactile distincts, balayage immédiat pour défiler et
maintien de 250 ms pour glisser intentionnellement. Deux taps toujours disponibles.

**43/43 tests ciblés en 45 s** : huit fiches × cinq formats, témoin qui prouve le blocage
du pilote, glisser souris et tactile. Dernière carte et bouton d'aide réellement atteints,
pas de `scrollIntoView` ni d'injection de scroll pour contourner le défaut. Aucun choix ou
refus parasite après un balayage. Recette réutilisable ajoutée au skill QA et validée.
Contre-vérification finale : **43/43 en 44,3 s**. Le `verifier` complet (980 s) a passé
les **320 contrôles responsive**, build/budget et rejeu. Il conserve les 14 incohérences
textuelles, trois différences de référence, un échec de chargement et un faux rouge
syntaxique R17. Ses 14 bilans E2E dépendants n'ont pas été exécutés, pas comptés verts.
Détail et preuves historiques : `lot-paires-defilement-2026-09-05.md`.

Après clôture, R17 remplacé par de vrais scénarios sur les treize moteurs avec aide et
témoins négatifs. Ils ont trouvé et fait corriger le résumé Colorie qui comptait la lenteur
comme une aide demandée : **57/57** contrôles ciblés, rejeu inchangé. Suite complète relancée :
**2660/2661**, seul rouge mouche/abeille conservé. Vitest produit désormais sa couverture
même lorsqu'un test échoue ; cinq zones mesurées, tous leurs seuils atteints. Le chargement
de `galeries-13` passe 3/3 isolément ; l'instabilité en campagne reste signalée, pas effacée.

Serveur local reconstruit et relancé : **http://192.168.1.19:8080/** ; recharger la tablette.
JS `index-DRWzcVGh.js`, SHA-256
`327f6a1af1860bdd80297f38bec8e5296486fed64ef80671752a2aeff17e01c6`.
HTML/JS/CSS et portraits servis vérifiés ; profils conservés, aucune publication GitHub/APK.

Suite de l'audit, pas effacée : reproduire ce conflit de gestes sur les grands plateaux Tri
(`volcan-02`/`volcan-10`) ; Place seulement si la réserve déborde. Risques de code relevés
en lecture seule, pas encore bugs reproduits. Les petites vignettes dans les grands cartons
Paires restent une finition de composition distincte du blocage tactile corrigé.
Les validations textuelles, animations,
références visuelles et voix des sections suivantes restent en attente.

## Livraison précédente — mélange Attrape et refonte commune des chemins (5 septembre)

Deux nouveaux retours ajoutés : réponses dans l'ordre dans Attrape ; règles changeantes
peu visibles et réponses incohérentes dans Chemin, notamment `volcan-05`.
Contrat : `lot-attrape-chemins-2026-09-05.md`. Les sept Attrape sont mélangés, stables pendant
la lecture ; le plafond des rasters, les ailes qui interceptaient le doigt et le sous-scroll
sont corrigés. Les six chemins lettres/sons (20 étapes) ont un oracle lexical indépendant,
un plateau par étape, des coches locales, une règle courte avec repère souligné, une annonce
« Nouveau chemin » et une aide redemandable après chaque pas.

Le septième Chemin (Cité) est contrôlé au doigt et géométriquement, **pas certifié pour son
contenu**. Proposition des douze phrases dans `proposition-chemin-cite-2026-09-05.md`, en
attente du parent. On ne remplace pas silencieusement un contenu publié.

Mesures : campagne générale E2E 756/756 (avant la dernière finition de défilement), puis
88/88 parcours ciblés après ces derniers correctifs. Ces 88 incluent les sept Attrape dans
cinq formats, tous les chemins, les mots incomplets, Roc et l'audit des 75 nœuds pédagogiques.
Le dernier `verifier` complet reste rouge sur les contenus et trois références visuelles ;
son résultat historique et les contre-vérifications sont conservés dans
`recette-attrape-chemins-2026-09-05.md`.

Dernière finition après ces mesures : **71/71 contrôles responsive en 2,2 min**, **31/31
parcours natifs Chemin/Attrape en 31,3 s**, **43/43 tests ciblés de logique et de composant**.
Le nouveau test étroit a d'abord reproduit une alternance grille/plateau à 360×640 :
`innerHeight` variait avec le débordement mobile, réinitialisant le repli. `clientHeight`
stabilise le viewport de mise en page ; rotation et retour au petit écran sont contrôlés.
La sonde stricte conserve ses témoins négatifs (image cassée, cible masquée, cadre instable).
TypeScript et lint verts, 18 avertissements anciens ; aucune référence visuelle remplacée.

Serveur reconstruit/redémarré : **http://192.168.1.19:8080/**. Recharger la page. HTML/JS/CSS,
quatre portraits et six coloriages servis vérifiés par empreintes, profils conservés.
JS servi `index-CGVxgXVk.js`. Budget contrôlé : 239,5 Ko gzip / 250, aucun crochet de test livré.
Le raccord raster des grottes est également corrigé : la version du SVG ne versionne pas le PNG.

Reste à arbitrer/intégrer : 14 écarts de contenu (11 antérieurs + trois consignes Cité),
trois références visuelles, quatre atlas d'animation non approuvés, référentiel lexical CE1
incomplet. Les clips des fiches Grave gardent leur ancienne consigne de tracé : leur
alignement audio reste à faire lors de la reprise des textes. Pas de publication GitHub/APK,
pas de commit contournant les crochets rouges. Guide QA enrichi et skill validé.

## Livré en local — compagnon au résultat et mots incomplets (5 septembre)

Retours parent ajoutés : compagnon absent sur `/recompense` ; « bateau » en `bat_au` avec
choix `eau` et fausse consigne de tracé. Correction commune des cinq fiches `grave` (29 mots),
clavier centré, portrait du compagnon choisi au résultat. Le parcours réel a aussi détecté
un repli 409 qui perdait ce choix ; une session locale d'une étape le conserve désormais.
21 parcours natifs verts dans la dernière recette, dont le choix de Roc jusqu'au résultat.
Reconstruction et contrôle réseau terminés. Détail : `recette-compagnon-mots-incomplets-2026-09-05.md`.

## État précédent — coloriages intégrés pour essai local

Mandat parent du 5 septembre : finaliser les reprises pour tester **en local**, le reste plus tard.
Les six coloriages (43 cibles) sont intégrés : tapis v2 à vrais objets, école conservée avec
porte/ardoise/banc corrigés, Marais et forge réillustrés, fresque couleur réemployée et retracée.
Phrases, masques et voix sont raccordés. Loupe volontaire sans indice automatique et vrai noir.

Preuves : 50 tests de repères indépendants, 10 tests de composants, 26 parcours ciblés verts
dans quatre formats ; prévol vert avec 6 polices / 671 clips ; 25 clips rendus dans ce lot.
Dernière suite unitaire : 2540/2541, seul rouge « mouche/abeille » déjà soumis au parent.
La campagne qualité a passé 318/318 ; les **704 parcours repassent en 7,3 minutes**, sans cas
non exécuté, après raccord du test qui exigeait les anciens ornements du tapis. Le premier `verifier` complet
(830,5 s) est conservé avec ses rouges initiaux, pas maquillé en réussite.

Serveur de production reconstruit et redémarré : **http://192.168.1.19:8080/**.
Les six SVG/PNG servis ont les empreintes attendues, HTML identique au build ; profils conservés.
Recharger la page tablette. Recette détaillée :
[recette-coloriages-locaux-2026-09-05.md](recette-coloriages-locaux-2026-09-05.md).

Toujours à valider séparément : 11 reformulations dans quatre autres fiches, trois différences
de captures, quatre atlas animés des compagnons, référentiel lexical incomplet. Aucun de ces
points n'est effacé par ce lot. Pas de publication GitHub/APK, pas de contournement du crochet
git encore rouge. Les anciens décors et voix sont archivés avec preuves, non supprimés.

Dernière revue : le masque de porte peignait encore le visage et celui du banc manquait l'assise.
Trois nouvelles régressions rouges ont précédé leur reprise ; 82 contrôles ciblés puis les
26 parcours des coloriages repassent en 12,5 s. La capture partiellement coloriée a été relue.
Ce dernier changement porte seulement sur deux contours, après les campagnes globales ci-dessus.

## Historique — état avant intégration des coloriages (dépassé par la section ci-dessus)

**Nouveau retour parent, ajouté sans remplacer les lots en cours :** le coloriage
`foret-muette-08` / `tapis-colorie-01` reste incompréhensible malgré sa réussite tactile.
Les six « feuilles » sont de petits ornements floraux du tapis, difficiles à reconnaître même
pour un adulte ; les repères haut/gauche/milieu sont ambigus. Sa validation pédagogique est
**rouverte**. Préparer une seule scène de remplacement avec de grands objets distincts, en
brouillon pour validation ; refaire ensuite les consignes, masques exacts, voix et recette sans
halo d'aide initial. Ne pas confondre la réussite des 152 parcours avec cette reconnaissance.
La v1 est **refusée pour son style 3D/catalogue**. La v2 repart des décors approuvés, sans
réemployer la v1 : `contenu/brouillons/coloriage-tapis-2026-09-05/tapis-objets-v2.png`, comparée
en couleur et en gris dans `bac-a-sable/coloriage-tapis-2026-09-05/comparaison-gris-v2.png`.
Tapis, chat, bol, sac, pot, ballon et banc ; sept phrases au lexique local, aucun contenu publié
remplacé. Image à valider, puis masques et voix à fabriquer. Détails :
`Docs/refonte-coloriage-tapis-2026-09-05.md`.

**Contrôle étendu demandé par le parent : six coloriages, 43 cibles, cinq décors inspectés.**
Quatre exercices demandent une reprise du raccord image/consigne/masque : tapis, brume des
Marais (objets absents), forge (outils hors masques), fresque de la Cité (mots sans objets).
Les deux exercices de l'école ont leurs objets reconnaissables, mais de petites régions à
améliorer. Ces défauts sont visibles sur les images réellement servies, empreintes vérifiées.
La réussite des parcours ne prouve pas la reconnaissance de leurs cibles. Rapport exact :
`Docs/audit-visuel-coloriages-2026-09-05.md`. Nouvelle commande `npm run qa:coloriages` : planches
et mesures, pas visa automatique. Aucun de ces quatre exercices n'est déclaré corrigé.

Cette section remplace les anciens bilans ci-dessous pour la reprise. **La finition n'est pas
déclarée terminée** : les nouvelles entrées tactiles ont trouvé des défauts que les anciennes
campagnes d'injection logique ne pouvaient pas révéler. Base réelle : `1d5a637`.

- Nouvelle campagne : les 76 nœuds sont joués au doigt natif, sur téléphone et tablette, avec
  rotation pendant chaque exercice, profil de lecture réellement agrandi et contrôle de la
  progression persistée. Les réponses ne sont jamais injectées au réducteur.
- Correctifs intégrés : grilles `tri`, `paires`, `chemin`, `attrape` ; composition `histoire`,
  `phrase`, `grave` ; prises de placement dimensionnées en pixels CSS ; coloriage sur les vrais
  pixels SVG/Canvas ; protection contre le dernier tap qui activait le nouvel écran de récompense.
- La sonde de composition attend images décodées, polices et trois cadres stables. Elle possède
  des contrôles négatifs (image cassée, bouton couvert, rognage, géométrie instable) et positifs
  (défilement normal, texte réservé aux lecteurs d'écran, vrais chemins SVG).
- Le contrôle des ressources vérifie 6 polices et 673 clips manifestés. 216 anciens clips non
  référencés ont été **archivés, pas supprimés**, dans `bac-a-sable/archives-audio-2026-09-05/`.
- Les portraits canoniques sont publiés ; les **quatre nouveaux atlas animés sont des brouillons
  non approuvés et non intégrés**. Plume présente notamment un écart de contour des yeux à arbitrer.
- L'audit des 76 fiches identifie 11 corrections textuelles dans quatre fichiers, regroupées en
  trois propositions soumises au parent : ne plus révéler le mot éclair, clarifier « même son que
  dans gant », rétablir « abeille » dans une carte. Le contenu publié n'a pas été modifié.
  `qa:coherence` et le test de chronologies doivent rester rouges tant que cet écart subsiste.
- La campagne E2E complète repasse **679/679 en 7,6 minutes** : les 76 exercices sont terminés
  sur tablette et téléphone, avec rotation. Le dernier contrôle de composition/matrice parcourt
  aussi les 89 recettes dans quatre formats et les 14 familles de moteurs.
- Dernière suite unitaires/composants/API : **2475/2476**. Le seul rouge porte sur la carte
  « mouche » au lieu d'« abeille », en attente de validation. `qa:coherence` reste rouge sur les
  onze textes proposés. Les 645 contrôles de contenu ne constituent **pas** un visa lexical CE1 :
  ce volet historique n'a pas de seuil arbitré (198 occurrences hors de la liste locale incomplète).
- `npm run verifier` a été exécuté et lu dans ce lot : son dernier rapport complet, de 898 s,
  conserve les anciens rouges de contenu et d'import du harnais. L'import est corrigé et la
  campagne E2E distincte ci-dessus est verte. Ne pas présenter ce rapport historique comme vert.
- Le serveur local est reconstruit et actif sur `http://192.168.1.19:8080/` ; profils inchangés.
  La PWA locale `98306bf5aa6d0400` est reconstruite : exercice joué et rejoué hors ligne, audio,
  persistance, mise à jour, export/import, second onglet et route profonde vérifiés. Cinq anciennes
  tentatives conservées lors du dernier remplacement de build ; zéro `/api/` et erreur de page.
- L'APK debug est reconstruite et installée **seulement dans un émulateur isolé en lecture seule**.
  Placement puis tri joués avec Wi-Fi et données coupés, deux tentatives conservées après arrêt
  et relance. Deux défauts natifs trouvés et corrigés : images internes des SVG non réécrites,
  et registre de connexions SQLite oublié lors du rechargement JavaScript.
- Les commandes `qa:pwa` et `qa:apk` conservent ces recettes. Le contrôle de persistance attend
  une lecture par le port sérialisé : une lecture SQL brute pendant la transaction ne prouve pas
  encore un commit. La résistance à un arrêt forcé **avant** ce commit reste un volet distinct.
- **Clôture encore suspendue** : validation des trois familles de reformulations, des quatre
  atlas animés et arbitrage du référentiel lexical. Les corrections sont locales, non commitées :
  le crochet impose la suite unitaire complète, encore rouge sur le contenu. Aucun contournement
  du crochet, aucune publication GitHub. Après validation : intégrer les textes et atlas acceptés,
  actualiser les voix concernées, repasser les portes finales, commiter puis demander l'accord
  distinct pour la publication.

Plan cumulatif et preuves : [campagne-finition-qa-2026-09-05.md](campagne-finition-qa-2026-09-05.md).
Les résultats chiffrés suivants sont **historiques**, pas des mesures du nouvel état de code.

## Point de reprise historique, avant la nouvelle recette

- Branche : `main`.
- Base du présent lot : `5874524` — couverture responsive des quatorze moteurs sur tablette.
- Serveur de jeu : écoute sur `0.0.0.0:8080` ; adresse LAN mesurée le 4 septembre :
  `http://192.168.1.19:8080`.
- Version de production compilée et servie.
- Le chantier PWA/GitHub Pages est terminé et publié sur
  `https://scorpheus.github.io/LaPierreDesMots/`. Sa recette doit être rejouée après les présentes
  modifications avant la prochaine publication.

## Bilan historique, à ne pas confondre avec la nouvelle recette

- Les 76 exercices sont livrés et atteignables dans les six régions.
- Les fonds raster, les scènes adaptatives, les mécaniques communes et la reprise au premier nœud
  inédit sont raccordés.
- La carte, le campement, le coffre, les récompenses et la zone parent sont fonctionnels.
- Les objets du coffre utilisent leurs images raster ; les anciennes formes SVG ne sont plus le
  rendu nominal.
- Le choix de compagnon précède une sortie. Seuls Gobi et les compagnons ralliés sont proposés.
- Le compagnon choisi favorise réellement ses moteurs déclarés, côté serveur comme en mode Android
  autonome.
- Les anciens atlas de huit poses existaient avant le remplacement canonique. Ils ne valident
  pas l'identité des nouveaux personnages : voir les brouillons et le statut prioritaire ci-dessus.
- Les huit images manquantes du second jeu de paires de la Cité sont publiées et raccordées.
- La Pierre centrale est désormais la conclusion : la Clairière part du chemin au sud et le centre
  ne se révèle qu'après l'obtention des six Éclats.
- Derniers contrôles séparés : 2433/2433 tests unitaires, composants et API, 524/524 parcours E2E
  à quatre travailleurs et 294/294 contrôles qualité et responsive. Le contrat exhaustif rejoué
  seul couvre 15 écrans sur 15, 89 recettes et 76 nœuds, avec un écart nul. Lint, TypeScript,
  construction de production et budget du bundle réussissent également.
- Les sept divergences visuelles ont été montrées puis validées par le parent. Les références ont
  été mises à jour explicitement et la recette repasse 13/13 avec une tolérance de 0,2 %.

## Chantier en cours : responsive multi-écrans et composition professionnelle

- Matrice en pixels CSS réellement disponibles : tablette portrait `720 × 1017`, tablette paysage
  avec navigateur `1017 × 640`, téléphone portrait `360 × 640`, téléphone paysage `640 × 360`.
- Les 89 recettes d'écran sont parcourues dans chaque format. La garde refuse tout débordement
  horizontal de page, toute commande sans surface et toute commande rognée par un ancêtre.
- Le chargement est stabilisé avant la mesure : polices prêtes, images chargées ou en erreur, puis
  deux cycles de mise en page. Une capture partiellement chargée ne peut plus valider l'écran.
- Résultat du 4 septembre : 4/4 formats verts, soit 356 visites d'écran. Le téléphone portrait a
  en plus réussi trois répétitions concurrentes consécutives.
- Une seconde garde porte désormais sur la qualité de composition de la coque, pas seulement sur
  l'absence de rognage. Elle parcourt 12 cadres : téléphones de 320 à 915 px dans les deux sens,
  les deux côtés du seuil compact (899/901 px), une fenêtre PC réduite et le plein écran.
- Sur les écrans courts ou étroits, la surface tactile reste à 64 px mais l'habillage devient
  compact : texte d'interface borné en pixels CSS, bordure et relief allégés, vignettes réduites,
  détails secondaires retirés de la barre du campement. L'échelle de lecture du profil continue
  de s'appliquer au contenu pédagogique, sans faire grossir démesurément la navigation.
- La composition de la carte dépend également de l'orientation : flux vertical resserré en
  portrait ; carte et destinations côte à côte en paysage bas. L'ancienne piste de `72svh`, qui
  créait un grand vide sous l'introduction en portrait, n'est plus utilisée pour la carte.
- Les cibles tactiles restent à 64 px. Le choix initial de transformer le campement en plateau
  horizontalement défilable a été rejeté après essai parent : l'image entière doit rester visible
  et le campement reçoit une composition propre, sans sous-scroll horizontal.
- La hauteur disponible utilise `dvh`/`svh` et les seuils tiennent aussi compte d'une fenêtre
  courte, afin de couvrir les barres du navigateur et la barre des tâches.
- `npm run test:responsive` est la boucle courte du chantier web. `npm run test:qualite` séquence
  désormais l'audit général, la latence isolée, la matrice responsive puis le budget du bundle ;
  les lancer en concurrence faussait la mesure de latence par contention CPU.
- Les quatre balayages complets de 89 écrans sont séquencés dans leur fichier : après une longue
  campagne, les lancer en parallèle pouvait affamer un seul serveur de test jusqu'au délai maximal.
  Mesurés en série, ils terminent chacun en 30 à 37 secondes sans résultat dépendant de la charge.
- Validation finale du lot initial : 247/247 contrôles qualité généraux, 2/2 contrôles de latence,
  4/4 formats responsive et 6/6 contrôles de bundle. Passe de densité ajoutée ensuite : 16/16 cas
  verts en boucle courte ; dans la chaîne qualité complète, 265/265 cas et 6/6 contrôles de bundle
  sont verts (245,2 Kio gzip sur un budget de 250 Kio).
- L'audit esthétique complémentaire couvre 76 exercices et 13 écrans persistants dans 6 formats,
  plus la fiche coffre : **540 états-formats observés**. Il a révélé des défauts que les gardes de
  rognage ne pouvaient pas voir. Le détail et l'ordre de correction sont dans
  [audit-design-multiresolution-2026-09-04.md](audit-design-multiresolution-2026-09-04.md).
- La garde renforcée a révélé que les six moteurs `colorie`, et pas seulement les trois captures
  repérées, tombaient à 56 px de haut en paysage téléphone. Leur gabarit commun affiche désormais
  la scène et le nuancier côte à côte, avec une scène d'au moins 160 px et des godets de 64 px.
- Le campement tient désormais en entier dans le premier écran en paysage court ; le moteur
  `eclair` sépare l'étape de la commande « Voir/Revoir » ; la récompense place son action
  principale avant les détails ; les réglages ont un en-tête compact ; la fiche du coffre ne
  s'ouvre plus déjà défilée et tient entièrement à `640×360`.
- Vérification intermédiaire après ces corrections : 35/35 tests de composants ciblés, test de
  fiche 1/1, lint ciblé sans erreur, puis les **178 visites** des 89 écrans en téléphone portrait
  et paysage sans commande perdue ni garde de composition déclenchée.
- La passe suivante a recomposé `tri`, `assemble`, `chemin`, `histoire`, `trace` et `grave` : les
  règles variables sont séparées des consignes stables, les constructions sont centrées et les
  plateaux courts ne se recouvrent plus. Les captures ciblées téléphone ont révélé puis fermé les
  recouvrements de `chemin`, `histoire` et `grave` que les tests DOM ne pouvaient pas détecter.
- La zone parent tient désormais à 360 px sans sous-scroll interne ; le coffre laisse ses
  collections prendre leur hauteur en portrait et affiche bien 25 formes, 6 éclats et 6 objets
  raster, sans SVG nominal ni cercle parasite.
- Les décors illustrés déjà produits sont enfin raccordés automatiquement aux scènes régionales :
  47 correspondances PNG sont présentes. Le SVG demeure la géométrie interactive et le repli si
  le raster manque. Les quatre fonds (`fresque-murale`, `tapis`, `brume`, `forge`) validés par le
  parent sont publiés et verrouillés en production.
- La garde de composition vérifie aussi que l'écran racine ne crée pas son propre sous-scroll
  horizontal. Le cas croisé 568 × 320 du campement conserve maintenant le rapport exact du PNG.
- Le balayage des 89 écrans n'est plus un test monolithique de quatre minutes : chaque format est
  découpé en trois lots indépendants et `RESPONSIVE_LOT=1|2|3` permet de rejouer seulement le tiers
  concerné. Les six lots téléphone (portrait et paysage) passent en 1 min 24 s au total ; un lot
  isolé prend 12 à 15 s.
- Une campagne à six travailleurs a encore épuisé les sockets Windows après 318 cas : un
  `ERR_NO_BUFFER_SPACE`, puis trois pages incapables de finir leur chargement. Les quatre cas
  concernés repassent seuls, 8/8 en 58,1 s. Le plafond navigateur par défaut est donc abaissé à
  quatre travailleurs et gardé par un test de configuration. La campagne complète repasse ainsi
  521/521 en 6 min 30 s, sans saturation.
- Le seul débordement produit de ce contrôle concernait le chaudron à 1017 × 640 : `100vw`
  comptait la barre de défilement et ajoutait 15 à 32 px. Le chaudron se borne désormais à son
  conteneur ; son lot tablette paysage repasse en 19,7 s.
- Les sept divergences visuelles sont expliquées : six remplacent volontairement les blockouts SVG
  par la carte ou les décors raster ; la septième concerne la récompense et reste à montrer au
  parent avant toute mise à jour de référence.
- La passe de composition suivante supprime le vide de 84 à 119 px entre la carte et ses départs
  en portrait, ramène les départs paysage à 64–80 px et retire les sous-défilements du coffre à
  1017×640. La recette qualité finale repasse 274/274 en 4 min 54 s ; TypeScript et les 11
  contrôles de bundle restent verts (250,0 Kio gzip sur 250 Kio).
- La PWA intégrée a été reconstruite avec les nouveaux décors, cartes et atlas : livrable
  `3489471b43cd49c6`, 197,8 Mio au total et 15,9 Mio de précache atomique. Elle n'est pas
  republiée avant la validation locale et visuelle.
- Le test réel de la publication `02812949d95cbb7e` a révélé Gobi absent : les quinze WebP
  existaient dans le dépôt mais n'entraient pas dans le glob autonome. Le glob est corrigé et la
  garde est désormais générique : les 339 PNG/SVG/WebP de production doivent tous se résoudre
  localement ; les 293 fichiers que Vite n'incorpore pas au JavaScript seront sondés en HTTP après
  publication. Le campement et les quatre atlas de compagnons sont physiquement présents et
  répondent 200 sur la version publique actuelle ; leur rendu doit être revérifié après purge du
  cache par la prochaine version de service worker.
- La photo réelle de la Galaxy Tab du 4 septembre a invalidé le vert responsive du moteur
  `chrono`. La cause est mesurée : la matrice générale jouait au corps par défaut et ne vérifiait
  que l'atteignabilité ; le profil réel (`27 px`, interligne `2`) rendait trois cartes de 240 px,
  un cartouche superposé et des fentes hautes de près de 400 px. Le moteur utilise maintenant des
  cartes horizontales pleine largeur en portrait et une frise 4:3 compacte numérotée. Le garde
  rejoue exactement `720×1017` avec les réglages du profil et mesure largeur, hauteur et
  recouvrements. Il a rougi sur l'ancien rendu, puis la campagne complète a trouvé et fermé les
  variantes paysage et petit téléphone. Résultat ciblé : 1/1 ; matrice responsive : 26/26 en
  2 min 12 s ; détecteur de tests trompeurs : 0 bloquant, plafond historique 93 avertissements.
- Deux nouvelles photos à `800 × 1100` CSS ont révélé le même biais sur `tri` et `eclair` avec le
  profil réel. Dans `tri`, les douze mots recevaient tous la même ordonnée : six semblaient tenir,
  les autres se superposaient derrière eux. Une grille calculée de une à quatre colonnes remplace
  désormais ce repli sur les cadres jusqu'à 900 px et repousse les paniers après le dernier rang.
  Dans `eclair`, le statut héritait à tort du corps 27 et de l'interligne 2 du texte à déchiffrer ;
  les repères d'interface gardent maintenant une métrique compacte et leur détail secondaire est
  masqué sur tablette étroite. Les deux gardes ont rougi sur l'ancien rendu puis passent 2/2 ; la
  matrice étendue à tous les exercices concernés passe **28/28 en 3 min 36 s**.
- Le contrôle responsive possède maintenant un contrat de composition pour chacun des **14
  moteurs**. La table de sondes est comparée à l'union `CodeMoteur`, puis un nœud représentatif par
  moteur est joué à `800 × 1100` avec le profil réel (corps 27, interligne 2). Les deux écrans de
  l'école avec la maîtresse ont leurs cas nommés (`clairiere-01` colorie et `clairiere-04` place).
  Résultats mesurés : 15/15 pour l'inventaire et les moteurs en 4,8 s, puis **45/45** pour la
  matrice responsive complète en 2 min 18 s. Vitest est désormais plafonné à quatre ouvriers :
  les 2 422 cas passent en 90,81 s, là où le lancement sans plafond avait produit 28 délais RPC et
  SQLite sans défaut d'assertion.
- La campagne qui enchaîne les nœuds attend désormais l'identifiant exact de l'exercice, remet son
  témoin de préparation à zéro à chaque paquet et exige une géométrie stable sur trois images. Avant
  ce garde, elle pouvait mesurer le cadre de repli de `tri` puis capturer sa géométrie finale : un
  faux rouge et, inversement, un risque de juger un écran pas encore chargé. La campagne stabilisée
  passe les **150 écrans** (75 nœuds × 2 vues) en 51,9 s.
- Recette de clôture du 5 septembre : **VERT, 12/12 étapes** — 2 433 tests unitaires,
  645 validations de contenu, 524 parcours E2E, 13 références visuelles, 294 contrôles qualité et
  11 contrôles de bundle, zéro échec. La charge initiale mesure 233,4 Kio gzip sur 250 : Andika reste
  embarquée et se charge à la première zone de lecture au lieu d'être préchargée sur l'accueil.
- Une nouvelle photo réelle a fermé trois angles morts de cette recette. Dans `place`, le cartouche
  variable est désormais dans le flux sous l'école : il ne peut plus cacher le soleil, le banc ou
  le toit, quelle que soit sa hauteur typographique. Dans `chemin`, la règle variable emploie toute
  la largeur, le départ et les liaisons jaunes sont explicités et les cases parcourues ne répètent
  plus « Déjà fait » sur le décor. Enfin, le compagnon inscrit dans `PlanSortie` porte réellement
  l'aide : portrait, nom du bouton et locuteur suivent Filou, Roc, Plume ou Bulle ; Gobi n'est que
  le repli sans compagnon choisi.
- Les contrôles négatifs ont réintroduit séparément l'ancien cartouche superposé, l'ancienne bulle
  de chemin à 392 px et le forçage de Gobi : les deux recettes navigateur et les quatre cas de
  compagnons sont tous devenus rouges, puis verts après restauration. La même campagne a découvert
  une prise de carte réduite à 60 px CSS et une scène `place` de hauteur nulle à 360 px ; elles sont
  corrigées respectivement à au moins 64 px et à 400 px défilables. Le détecteur de tests trompeurs
  reste vert : 0 bloquant, plafond historique de 93 avertissements.
- La photo du coloriage `foret-muette-08` a invalidé la précédente validation de contenu : le PNG
  ne portait aucun « gland du centre » et cinq des six feuilles étaient visées hors de leur motif.
  La consigne nomme désormais le centre uni du tapis puis six feuilles réellement présentes sur sa
  bordure. Les sept prises ont été remesurées sur le cadrage raster, et un tap sur la forme complète
  est accepté en plus du cercle technique. Le garde unitaire ne se contente plus de rectangles
  déclarés par lui-même : il mesure le contraste local des six motifs dans le PNG. L'ancien contenu
  a fait rougir 3 contrôles sur 3 ; après correction, 12/12 contrôles unitaires, 30/30 composants,
  645/645 contrôles de contenu et la recette réelle des sept taps à `800 × 1100` sont verts.
- La campagne exhaustive a ensuite révélé une course de sauvegarde : la réponse réseau d'un ancien
  nœud pouvait revenir après l'ouverture du suivant et marquer sa tentative comme déjà envoyée.
  Le drapeau est désormais posé au départ de chaque envoi, jamais au retour d'une réponse devenue
  ancienne. Le contrôle différé de composant passe 22/22 et la campagne des 75 nœuds repasse en
  entier jusqu'à leurs récompenses, sans réussite perdue côté serveur.

## Dernier chantier terminé : audio

- Population recensée après la réduction de la frise des Galeries à trois récits : 666 objets
  audio, 673 clips avec les variantes.
- Couverture des consignes : 368/368, soit 100 %.
- Refus : 0. Dix clips ont été resynthétisés pour les nouvelles consignes et les mots `tapis` et
  `milieu` ; 663 clips existants ont été réutilisés.
- Instrument final : Whisper `large-v3` sur CPU/int8. Le mode CUDA a de nouveau présenté son
  comportement non borné : mémoire GPU occupée mais aucun résultat écrit après environ douze
  minutes. Il a été interrompu sans perdre les clips synthétisés.
- Les 35 tests ciblés de manifeste, couverture et recettes régionales passent.
- `contenu/audio/` est volontairement ignoré par Git et embarqué depuis le poste de production ; le
  verrou reproductible suivi par Git est `production/voix.lock.json`.

## File ouverte

1. Faire tester sur la tablette les nouveaux rendus `chrono`, `tri`, `eclair`, `chemin`, les
   **huit grilles Paires compactes** et les deux écrans de l'école avec la maîtresse. Vérifier le
   compagnon choisi dans l'aide et dans la récompense. Le tapis de la Forêt Muette a désormais
   **sept objets distincts** (tapis, chat, bol, sac, pot, ballon, banc) : les six ornements
   ambigus ne sont plus les cibles. Consignes, masques et voix sont liés au nouveau dessin.
2. Tester sur l’appareil réel les cinq exercices de chronologie reconstruits. Les quinze triplets
   ont été validés par le parent puis publiés sous forme de 45 cartes 4:3 ; le verrou de pixels et
   les gardes de correspondance texte/image sont décrits dans
   [publication-chronologies-visuelles-2026-09-04.md](publication-chronologies-visuelles-2026-09-04.md).
3. Faire une passe de finition artistique sur les écrans que le test tablette jugera encore trop
   légers, en commençant par les éléments réellement visibles dans le parcours enfant. Les quatre
   fonds régionaux validés sont désormais publiés ; ne pas en générer davantage avant ce test réel.
4. La PWA du lot Chronologie est publiée : source `328079d`, livrable `02812949d95cbb7e`, Action
   Pages `33895370041` réussie, mais le test réel a découvert les WebP de Gobi absents. La
   préparation locale précédente est invalidée par le correctif responsive : refaire
   `publier-site.bat --preparer`, demander l'autorisation explicite, publier puis vérifier Gobi,
   le campement, l'histoire et les compagnons après activation du nouveau service worker.
   Exclure aussi les quatre anciens décors archivés des paquets autonomes (11,7 Mo). Cette
   clôture sauvegarde le travail **local**, elle ne publie pas une nouvelle version du site.
5. Faire valider les quatre atlas de compagnons (`animations-canoniques-2026-09-05.md`) avant
   intégration ; les portraits canoniques sont distincts de ces nouvelles poses. Faire arbitrer
   les douze nouveaux textes de `proposition-chemin-cite-2026-09-05.md` avant de refaire ce récit.
6. Valider les trois nouvelles captures de référence Colorie ; aucune référence changée dans
   cette clôture. Le lexique local CE1 reste incomplet : revoir la couverture et son seuil avec
   le parent sans transformer le zéro incohérence mécanique en certification pédagogique.

## Retours parent à surveiller pendant le test

- Lisibilité des consignes qui changent au milieu d'un exercice : la règle stable et la cible
  courante doivent rester visuellement distinctes.
- Centrage des assemblages, phrases, cartes d'histoire et commandes sous les scènes.
- Taille des scènes sur différents rapports largeur/hauteur, notamment 1920 × 1080 et tablette
  paysage.
- Logique des tris, paires et chemins : toutes les bonnes réponses doivent être acceptées dans
  n'importe quel ordre quand l'ordre n'est pas une règle pédagogique.
- Coloriages : la zone demandée doit être identifiable sans révéler la réponse et la couleur doit
  apparaître sur la partie nommée.
- Fin de sortie et fin de région : la victoire, le cadeau, la région suivante et l'action pour
  continuer doivent être immédiatement compréhensibles.
- Clarification parentale du 4 septembre : les six récits du moteur `histoire` sont conservés. Le
  défaut signalé concernait les cartes du moteur `chrono` à remettre dans l'ordre. Le texte seul
  peut sembler logique alors que les images restent des scènes isolées ; la validation porte donc
  sur la continuité visuelle de chacune des quinze séquences.
- L'audit des 249 champs `asset: null` a séparé 241 cartes volontairement textuelles de huit
  images réellement manquantes dans `cite-des-histoires-cartes-paires-02`. Une unique planche a
  produit tomate, carotte, salade, citron, olive, raisin, pomme dans un panier et prune dans un bol.
  Les huit découpes carrées ont été validées, publiées et raccordées à l'exercice.

Ces points ont reçu des corrections globales et des tests, mais restent dans la file tant que le
parent ne les a pas validés sur l'appareil réel.

## Règle de délégation

Une tâche ou un sous-agent reçoit toujours :

1. le commit de départ ;
2. les documents à lire ;
3. un périmètre de fichiers disjoint ;
4. les critères de validation ;
5. les fichiers et décisions à ne pas modifier ;
6. le livrable et le format de commit attendus.

La tâche principale conserve l'intégration, la cohérence pédagogique et artistique, la compilation
globale et la validation finale. Une nouvelle tâche indépendante est réservée aux chantiers
réellement isolables ; les retours de test et les idées restent dans cette conversation principale.
