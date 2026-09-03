# File de recette — 75 exercices + 1 activité libre — 2026-09-02

Cette file remplace l’organisation par grands lots. Une ligne appartient à un seul agent et ne passe à `VALIDÉ` que lorsque quatre preuves sont présentes : consigne/aide compréhensibles, geste réel joué, fin atteignable sans écran d’échec, rendu tablette accepté. Un JSON valide ou un composant simplement monté ne suffisent pas. L'audio est explicitement hors campagne tant que le profil correspondant reste désactivé.

Les agents ne génèrent aucune image pendant la recette fonctionnelle. Si le rendu est le seul défaut, la ligne devient `BLOQUÉ-ASSET` et rejoint la file d’images, produite une image à la fois après validation parent.

| # | Nœud | Exercice | Titre | Moteur | État |
|---:|---|---|---|---|---|
| 1 | `clairiere-01` | `clairiere-ecole-01` | La cour de l’école | `colorie` | BLOQUÉ-OUTIL navigateur · composant 26/26 |
| 2 | `clairiere-02` | `clairiere-luciole-couleurs-01` | Les lucioles de couleur | `eclair` | BLOQUÉ-ASSET · fonctionnel 15/15 |
| 3 | `clairiere-03` | `clairiere-paniers-couleurs-01` | Les paniers de couleurs | `tri` | CORRIGÉ FONCTIONNEL · BLOQUÉ-ASSET |
| 4 | `clairiere-04` | `clairiere-ecole-02-place` | Place 3 dessins dans la cour | `place` | LOGIQUE 34/34 · TABLETTE À CONFIRMER |
| 5 | `clairiere-05` | `clairiere-guirlande-phrase-01` | La guirlande de mots | `phrase` | TEXTE CORRIGÉ · BLOQUÉ-ASSET |
| 6 | `clairiere-06` | `clairiere-lucioles-attrape-01` | Les lucioles à attraper | `attrape` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 7 | `clairiere-07` | `clairiere-collier-syllabes-01` | Le collier de syllabes | `assemble` | LOGIQUE 22/22 · TABLETTE À CONFIRMER |
| 8 | `clairiere-08` | `clairiere-lianes-voyelles-01` | Les lianes des voyelles | `chemin` | TEXTE CORRIGÉ · BLOQUÉ-ASSET |
| 9 | `clairiere-09` | `clairiere-veillee-histoire-01` | La veillée dans la cabane | `histoire` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 10 | `clairiere-10` | `clairiere-ecole-03-mots-outils` | L’école des petits mots | `colorie` | LOGIQUE 26/26 · TABLETTE À CONFIRMER |
| 11 | `clairiere-11` | `clairiere-luciole-voyelles-01` | Les lucioles des voyelles | `eclair` | BLOQUÉ-ASSET · FONCTIONNEL 114/114 |
| 12 | `clairiere-12` | `clairiere-paniers-voyelles-01` | Les paniers du a et du i | `tri` | CORRIGÉ FONCTIONNEL · BLOQUÉ-ASSET |
| 13 | `foret-muette-01` | `foret-muette-feuilles-attrape-01` | Les feuilles à dernière lettre | `attrape` | LOGIQUE 11/11 · TABLETTE À CONFIRMER |
| 14 | `foret-muette-02` | `foret-muette-bestiaire-paires-01` | Un animal, plusieurs animaux | `paires` | BLOQUÉ-ASSET · 12 IMAGES ABSENTES |
| 15 | `foret-muette-03` | `foret-muette-souche-tri-01` | Les deux trous de l'arbre | `tri` | CORRIGÉ TAP + TEXTE · BLOQUÉ-ASSET |
| 16 | `foret-muette-04` | `foret-muette-message-phrase-01` | Le message gravé sur l'écorce | `phrase` | LOGIQUE 7/7 · TABLETTE À CONFIRMER |
| 17 | `foret-muette-05` | `foret-muette-pas-japonais-chemin-01` | Les pierres du ruisseau | `chemin` | BLOQUÉ-ASSET · FONCTIONNEL 106/106 |
| 18 | `foret-muette-06` | `foret-muette-buee-grave-01` | La lettre qui ne se dit pas | `grave` | BLOQUÉ-ASSET · TRACÉ TABLETTE À CONFIRMER |
| 19 | `foret-muette-07` | `foret-muette-veillee-automne-histoire-01` | La veillée sous les arbres roux | `histoire` | LOGIQUE 7/7 · TABLETTE À CONFIRMER |
| 20 | `foret-muette-08` | `foret-muette-tapis-colorie-01` | Le tapis de feuilles | `colorie` | BLOQUÉ-ASSET · FONCTIONNEL 125/125 |
| 21 | `foret-muette-09` | `foret-muette-feuilles-attrape-02` | Les feuilles qui ont un s | `attrape` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 22 | `foret-muette-10` | `foret-muette-bestiaire-paires-02` | Les mots qui se tiennent la main | `paires` | BLOQUÉ-ASSET · 6 FACES IMAGE ABSENTES |
| 23 | `foret-muette-11` | `foret-muette-souche-tri-02` | Un seul mot, ou plusieurs | `tri` | BLOQUÉ-ASSET · FONCTIONNEL 113/113 |
| 24 | `foret-muette-12` | `foret-muette-message-phrase-02` | Les mots qui gardent une lettre | `phrase` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 25 | `galeries-01` | `galeries-miroir-bd-01` | Le b et le d — le rond change de cote | `trace` | BLOQUÉ-ASSET · TRACÉ TABLETTE À CONFIRMER |
| 26 | `galeries-02` | `galeries-miroir-bp-01` | Le b et le p — le rond change de hauteur | `trace` | BLOQUÉ-ASSET · FONCTIONNEL 114/114 |
| 27 | `galeries-03` | `galeries-cristal-bd-01` | Les cristaux b et d | `eclair` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 28 | `galeries-04` | `galeries-grottes-bd-01` | Les grottes du b et du d | `tri` | BLOQUÉ-ASSET · FONCTIONNEL 14/14 |
| 29 | `galeries-05` | `galeries-pierre-bd-01` | Graver le b et le d | `grave` | BLOQUÉ-ASSET · FONCTIONNEL 106/106 |
| 30 | `galeries-06` | `galeries-pierre-bp-01` | Graver le b et le p | `grave` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 31 | `galeries-07` | `galeries-stalagmites-assemble-01` | Les stalagmites à empiler | `assemble` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 32 | `galeries-08` | `galeries-passage-chemin-01` | Le passage aux pierres plates | `chemin` | BLOQUÉ-ASSET · FONCTIONNEL 106/106 |
| 33 | `galeries-09` | `galeries-frise-chrono-01` | La frise gravée | `chrono` | BLOQUÉ-ASSET/VIGNETTES · TABLETTE À CONFIRMER |
| 34 | `galeries-10` | `galeries-echo-conte-histoire-01` | Le conte de l’écho | `histoire` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 35 | `galeries-11` | `galeries-echos-paires-01` | Les cristaux qui se répondent | `paires` | BLOQUÉ-ASSET · IMAGES ABSENTES |
| 36 | `galeries-12` | `galeries-paroi-libre-01` | Le chaudron qu’on peint comme on veut | `libre` | HORS PROGRESSION · COMPATIBILITÉ NON JOURNALISABLE |
| 37 | `galeries-13` | `galeries-grottes-fv-01` | Les grottes du f et du v | `tri` | BLOQUÉ-ASSET · FONCTIONNEL 14/14 |
| 38 | `galeries-14` | `galeries-cristal-fv-01` | Les cristaux qui se ressemblent | `eclair` | BLOQUÉ-ASSET · FONCTIONNEL 114/114 |
| 39 | `marais-jumeau-01` | `marais-jumeau-orage-eclair-01` | Les mots qui font le son de pont | `eclair` | BLOQUÉ-ASSET · FONCTIONNEL 10/10 |
| 40 | `marais-jumeau-02` | `marais-jumeau-poissons-attrape-01` | Les poissons du son de gant | `attrape` | BLOQUÉ-ASSET · 8 IMAGES ABSENTES |
| 41 | `marais-jumeau-03` | `marais-jumeau-grenouilles-tri-01` | Les deux feuilles des grenouilles | `tri` | BLOQUÉ-ASSET · FONCTIONNEL 14/14 |
| 42 | `marais-jumeau-04` | `marais-jumeau-nenuphars-chemin-01` | Les nénuphars du son de trou | `chemin` | BLOQUÉ-ASSET · FONCTIONNEL 106/106 |
| 43 | `marais-jumeau-05` | `marais-jumeau-coquillages-paires-01` | Les coquillages du son de main | `paires` | BLOQUÉ-ASSET · 6 FACES IMAGE ABSENTES |
| 44 | `marais-jumeau-06` | `marais-jumeau-ponton-assemble-01` | Les planches du ponton | `assemble` | BLOQUÉ-ASSET · FONCTIONNEL 106/106 |
| 45 | `marais-jumeau-07` | `marais-jumeau-roseaux-phrase-01` | Les roseaux qui portent les mots | `phrase` | BLOQUÉ-ASSET · LOGIQUE 7/7 |
| 46 | `marais-jumeau-08` | `marais-jumeau-brume-colorie-01` | La berge que la brume quitte | `colorie` | BLOQUÉ-ASSET · FONCTIONNEL 125/125 |
| 47 | `marais-jumeau-09` | `marais-jumeau-orage-eclair-02` | Les mots qui font le son de noir | `eclair` | BLOQUÉ-ASSET · FONCTIONNEL 10/10 |
| 48 | `marais-jumeau-10` | `marais-jumeau-poissons-attrape-02` | Les poissons du son de noir | `attrape` | BLOQUÉ-ASSET · 8 IMAGES ABSENTES |
| 49 | `marais-jumeau-11` | `marais-jumeau-grenouilles-tri-02` | Les feuilles du trou et du noir | `tri` | BLOQUÉ-ASSET · FONCTIONNEL 14/14 |
| 50 | `marais-jumeau-12` | `marais-jumeau-nenuphars-chemin-02` | Les nénuphars du son de main | `chemin` | BLOQUÉ-ASSET · FONCTIONNEL 106/106 |
| 51 | `volcan-01` | `volcan-etoiles-filantes-attrape-01` | Les étoiles qui portent bateau | `attrape` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 52 | `volcan-02` | `volcan-wagons-tri-01` | Les wagons du chat et du coq | `tri` | BLOQUÉ-ASSET · FONCTIONNEL 14/14 |
| 53 | `volcan-03` | `volcan-sable-grave-01` | Graver la fin de bateau | `grave` | BLOQUÉ-ASSET · FONCTIONNEL 106/106 |
| 54 | `volcan-04` | `volcan-geodes-paires-01` | Les géodes du son de fille | `paires` | BLOQUÉ-ASSET · FACES IMAGE ABSENTES |
| 55 | `volcan-05` | `volcan-coulee-chemin-01` | Les pierres de la coulée | `chemin` | CORRIGÉ COMPÉTENCE · BLOQUÉ-ASSET |
| 56 | `volcan-06` | `volcan-train-assemble-01` | Les wagons à assembler | `assemble` | BLOQUÉ-ASSET · FONCTIONNEL 106/106 |
| 57 | `volcan-07` | `volcan-fresque-chrono-01` | La fresque du cochon et de la fille | `chrono` | BLOQUÉ-ASSET/VIGNETTES · TABLETTE À CONFIRMER |
| 58 | `volcan-08` | `volcan-forge-colorie-01` | La forge et ses braises | `colorie` | BLOQUÉ-ASSET · LOGIQUE 26/26 |
| 59 | `volcan-09` | `volcan-etoiles-filantes-attrape-02` | Les étoiles du chat et du coq | `attrape` | BLOQUÉ-ASSET · 14 IMAGES ABSENTES |
| 60 | `volcan-10` | `volcan-wagons-tri-02` | Les wagons de la fille et de la ville | `tri` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 61 | `volcan-11` | `volcan-sable-grave-02` | Graver les trois lettres de fille | `grave` | BLOQUÉ-ASSET · LOGIQUE 7/7 |
| 62 | `volcan-12` | `volcan-geodes-paires-02` | Les géodes du chat et du coq | `paires` | BLOQUÉ-ASSET · 8 FACES IMAGE ABSENTES |
| 63 | `cite-des-histoires-01` | `cite-des-histoires-bibliotheque-histoire-01` | Le pain du four | `histoire` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 64 | `cite-des-histoires-02` | `cite-des-histoires-cartes-paires-01` | Le cartable oublié | `paires` | BLOQUÉ-ASSET · 8 images absentes · TABLETTE À CONFIRMER |
| 65 | `cite-des-histoires-03` | `cite-des-histoires-pellicule-chrono-01` | Le château de sable | `chrono` | BLOQUÉ-ASSET · 9 vignettes absentes · TABLETTE À CONFIRMER |
| 66 | `cite-des-histoires-04` | `cite-des-histoires-banniere-phrase-01` | Le feu rouge de la ville | `phrase` | FONCTIONNEL · BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 67 | `cite-des-histoires-05` | `cite-des-histoires-theatre-ombres-histoire-01` | Le ballon dans le trou | `histoire` | FONCTIONNEL · ILLUSTRATIONS À PRODUIRE · TABLETTE À CONFIRMER |
| 68 | `cite-des-histoires-06` | `cite-des-histoires-vitrail-chrono-01` | Le voyage de la pluie | `chrono` | BLOQUÉ-ASSET · 9 vignettes absentes · TABLETTE À CONFIRMER |
| 69 | `cite-des-histoires-07` | `cite-des-histoires-ponts-chemin-01` | Les ponts de livres | `chemin` | FONCTIONNEL · ASSET/TABLETTE À CONFIRMER |
| 70 | `cite-des-histoires-08` | `cite-des-histoires-rayonnages-tri-01` | Les mots du renard et du hibou | `tri` | FONCTIONNEL · TABLETTE À CONFIRMER |
| 71 | `cite-des-histoires-09` | `cite-des-histoires-enseigne-assemble-01` | L'enseigne à écrire | `assemble` | BLOQUÉ-ASSET · TABLETTE À CONFIRMER |
| 72 | `cite-des-histoires-10` | `cite-des-histoires-fresque-murale-colorie-01` | La fresque de la graine | `colorie` | BLOQUÉ-ASSET · RÉGIONS/TABLETTE À CONFIRMER |
| 73 | `cite-des-histoires-11` | `cite-des-histoires-bibliotheque-histoire-02` | Le mot posé sur la table | `histoire` | FONCTIONNEL · ILLUSTRATIONS/TABLETTE À CONFIRMER |
| 74 | `cite-des-histoires-12` | `cite-des-histoires-cartes-paires-02` | La salade de couleurs | `paires` | BLOQUÉ-ASSET · 16 faces absentes · TABLETTE À CONFIRMER |
| 75 | `cite-des-histoires-13` | `cite-des-histoires-pellicule-chrono-02` | Le cahier de Gobi | `chrono` | BLOQUÉ-ASSET · 9 vignettes absentes · TABLETTE À CONFIRMER |
| 76 | `cite-des-histoires-14` | `cite-des-histoires-banniere-phrase-02` | Le jeu des amis | `phrase` | FONCTIONNEL · ILLUSTRATION/TABLETTE À CONFIRMER |

## Cadence

Trois agents Luna `low` maximum travaillent en parallèle, chacun sur une seule ligne. L’orchestrateur relit la preuve, lance les tests ciblés et attribue immédiatement la ligne suivante. Terra `medium` est réservé aux corrections d’intégration qui demandent davantage de jugement. La campagne globale longue ne tourne qu’après un groupe de corrections stabilisé.
