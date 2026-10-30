# Audit du niveau des exercices de lecture au regard des programmes CE1-CE2

Audit en lecture seule, réalisé le 2026-10-09 à la demande du parent (point T07 de `Docs/tableau-retours.md` : viser le CE1-CE2). Aucun exercice ni contenu n'a été modifié. Les niveaux ci-dessous sont **des estimations** : chacune cite la ligne du référentiel qui la justifie, et les cas limites sont marqués « à juger par le parent ».

## 0. Sources, méthode et limites

- **Programmes** : `Docs/reference-programmes-ce1-ce2.md` (« le référentiel » ci-dessous). Les lignes sont citées par section : §2.1 décodage, §2.2 fluence, §2.3 compréhension, §2.4 vocabulaire, §2.5 grammaire et orthographe grammaticale, §2.6 écriture, §3 repères CP, §4 lacunes. Ce que le référentiel marque NON TROUVÉ reste NON TROUVÉ ici.
- **Exercices** : les 76 nœuds de `contenu/noeuds/*.json`, résolus vers leur exercice dans `contenu/exercices/` (champs `competences`, `jeu.moteur`, `jeu.contenu` lus dans les JSON). Compétences au sens de `contenu/referentiel/competences.json` (29 codes). Numérotation E01-E76 reprise de `Docs/tableau-retours.md`. Les scripts d'extraction sont dans `bac-a-sable/audit-lecture/`.
- **Règle de classement** (posée avant le classement) : un exercice est **CP** si la tâche de lecture reste dans ce que §3 et §2.1 décrivent pour la fin de CP (déchiffrer des mots, phrases simples, texte d'une dizaine de lignes). Il est **CE1** si la compétence travaillée ou la tâche appelle une ligne qui n'apparaît qu'au CE1 : lettres muettes (§2.1), chaîne anaphorique, inférence, chronologie (§2.3), accords (§2.5), CGP complexes (§2.1). Il est **CE2** s'il appelle une ligne qui n'apparaît qu'au CE2.
- **Limite principale** : le référentiel ne dit pas quelles CGP (correspondances graphème-phonème) s'apprennent au CP et lesquelles sont « les plus complexes » du CE1 (liste NON TROUVÉ, §4 du référentiel). Le classement des exercices sur on/an/in/ou/oi/eau (CP) et sur ill/gn/ph/ch/qu (CE1) repose donc sur une pratique scolaire usuelle, **pas sur une ligne du référentiel** : tous les exercices concernés sont marqués « à juger par le parent » quand la frontière est floue.
- **Limite secondaire** : les exercices de lecture sont jugés sur ce que l'enfant fait réellement (le JSON), pas sur la compétence annoncée. Exemples : E34 annonce `gph.finale.muette` mais demande seulement de colorier ; E24 n'exige presque pas de lecture.
- **Ce qui n'est pas jugé** : le rythme, l'habillage, les images, la qualité de la voix. Seuls la tâche, les mots, les phrases et le volume de texte comptent.

## 1. Table des 76 exercices

Colonnes : numéro, nœud, moteur, compétence(s) selon le JSON, ce qui est demandé à l'enfant, niveau estimé, drapeau « à juger par le parent » (frontière floue), ligne du référentiel justificative.

| N° | Nœud | Moteur | Compétences (JSON) | Ce qui est demandé | Niveau estimé | À juger par le parent | Ligne du référentiel |
|---|---|---|---|---|---|---|---|
| E01 | clairiere-01 | colorie | comp.consigne.simple, comp.consigne.multiple, lex.couleur | Lire des consignes de coloriage à une cible (couleur écrite) et colorier la bonne zone. | CP |  | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E02 | clairiere-02 | eclair | flu.mot.court, lex.couleur | Lire un mot de couleur flashé, puis le retrouver parmi 8 mots de couleur. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E03 | clairiere-03 | tri | lex.couleur, comp.consigne.multiple | Trier des mots (couleurs / autres) dans deux paniers. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E04 | clairiere-04 | place | comp.consigne.simple | Lire une consigne (soleil dans le ciel, ballon à côté du banc) et poser un dessin au bon endroit. | CP |  | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E05 | clairiere-05 | phrase | mot.outil.frequent, lex.couleur | Remettre dans l'ordre les 4 mots de « Le chat est noir. » et « Les fleurs sont roses. » (leurre : une). | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » ; l'accord le/les, est/sont frôle §2.5 CE1 « relation sujet-verbe » |
| E06 | clairiere-06 | attrape | lex.couleur, comp.consigne.simple | Attraper au vol les mots de couleur désignés (bleu, vert, rouge, jaune). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E07 | clairiere-07 | assemble | syl.cv, flu.mot.court | Assembler des syllabes CV pour former midi, moto, vélo, télé. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E08 | clairiere-08 | chemin | gph.voyelle.orale, syl.cv, comp.consigne.multiple | Suivre un chemin de mots contenant la voyelle a, i, o ou u. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E09 | clairiere-09 | histoire | mot.outil.frequent, comp.consigne.simple | Lire un récit de 8 phrases courtes (41 mots) et répondre à 5 questions littérales (où, qui, ou/ou). | CP |  | §3 « Lecture/écriture » et §2.3 CP (texte de dix lignes environ ; le récit livré fait 6 à 8 phrases courtes) |
| E10 | clairiere-10 | colorie | mot.outil.frequent, comp.consigne.multiple | Lire des phrases de description et de consigne (le toit est rouge, colorie la porte en bleu) et colorier. | CP |  | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E11 | clairiere-11 | eclair | gph.voyelle.orale, syl.cv | Lire un mot flashé (papa, riz, bébé, mère) et toucher le son voyelle qu'il contient. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E12 | clairiere-12 | tri | gph.voyelle.orale, flu.mot.court, comp.consigne.multiple | Trier des mots selon qu'on y lit a ou i. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E13 | galeries-01 | trace | gph.miroir.gauche-droite | Graver le b puis le d en observant le côté du rond (geste et discrimination visuelle). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » (la confusion miroir b/d n'a pas de ligne propre dans le référentiel) |
| E14 | galeries-02 | trace | gph.miroir.haut-bas | Graver le b puis le p en observant la hauteur de la barre. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » (idem) |
| E15 | galeries-03 | eclair | gph.miroir.gauche-droite | Lire un mot flashé (bol, dos, dame, balle...) et le retrouver parmi des mots en b/d. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E16 | galeries-04 | tri | gph.miroir.gauche-droite, comp.consigne.multiple | Ranger des mots (bateau, domino, radis...) selon qu'ils contiennent un b ou un d. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E17 | galeries-05 | grave | gph.miroir.gauche-droite | Tracer la lettre b ou d manquante pour écrire un mot (bol, dos, cabane, radis). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E18 | galeries-06 | grave | gph.miroir.haut-bas | Tracer la lettre b ou p manquante (bol, pic, jupe, robe). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E19 | galeries-07 | assemble | syl.cvc | Ranger des syllabes CVC pour écrire jardin, barbe, tortue, lundi, marche. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E20 | galeries-08 | chemin | gph.miroir.gauche-droite, syl.cvc | Marcher sur les mots où l'on lit b ou d (bol, dos, barbe, radis...). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E21 | galeries-09 | chrono | gph.confusion.sourde-sonore, comp.consigne.simple | Ranger 3 images selon un récit de 3 phrases très courtes (bol et panier, balle et dame, pot et feu). | CP | oui | §2.3 CE1 (restituer l'enchaînement chronologique) ; récits de 3 phrases très simples, donc tenu au niveau CP |
| E22 | galeries-10 | histoire | gph.confusion.sourde-sonore, comp.consigne.simple, lex.couleur | Lire un conte de 8 phrases (51 mots) et répondre à 8 questions littérales (couleur, lieu, objet). | CP |  | §3 « Lecture/écriture » et §2.3 CP (texte de dix lignes environ ; le récit livré fait 6 à 8 phrases courtes) |
| E23 | galeries-11 | paires | gph.miroir.haut-bas | Toucher des paires minimales lues (bain/pain, bas/pas, boule/poule, bol/pot). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E24 | galeries-12 | libre | lex.couleur | Colorier librement les zones d'une scène avec un nuancier de 11 noms de couleur ; lecture quasi nulle (peu « lecture »). | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E25 | galeries-13 | tri | gph.confusion.sourde-sonore, comp.consigne.multiple | Ranger des mots en f ou en v (four, fleur, vent, vélo...). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E26 | galeries-14 | eclair | gph.confusion.sourde-sonore, syl.cvc | Lire un mot flashé (fer/ver, sac/zoo, four/jour) et le retrouver parmi des mots proches. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E27 | foret-muette-01 | attrape | gph.finale.muette | Attraper les mots dont la dernière lettre est t, d, s ou x (chat, grand, tapis, noix, doux). | CE1 |  | §2.1 CE1 (lettres muettes lues sans les vocaliser) ; §2.4 CE1 (lettre muette finale) |
| E28 | foret-muette-02 | paires | enc.pluriel.s | Apparier un nom singulier et son pluriel écrit (renard/renards, hibou/hiboux, oiseau/oiseaux). | CE1 | oui | §2.5 CE1 « accords » (pluriel en -s, groupe nominal) ; les pluriels en -x (hiboux, oiseaux) relèvent de §2.5 CE2 « accords » (pluriels irréguliers en -x) |
| E29 | foret-muette-03 | tri | gph.finale.muette, comp.consigne.multiple | Dire les mots et les trier selon que la dernière lettre se prononce ou non (sac/chat, mur/tapis). | CE1 |  | §2.1 CE1 (lettres muettes lues sans les vocaliser) ; §2.4 CE1 (lettre muette finale) |
| E30 | foret-muette-04 | phrase | flu.liaison, comp.consigne.simple | Remettre dans l'ordre 4 mots de « Un ours est grand. » et « Les oiseaux sont noirs. » (avec liaisons). | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » ; la liaison n'a pas de ligne dans le référentiel (NON TROUVÉ) ; l'accord sujet-verbe frôle §2.5 CE1 |
| E31 | foret-muette-05 | chemin | enc.pluriel.s | Marcher sur les mots qui portent un s (chats, fleurs) plutôt que sur le singulier. | CE1 |  | §2.5 CE1 « accords » (pluriel en -s, groupe nominal) |
| E32 | foret-muette-06 | grave | gph.finale.muette | Tracer la lettre finale muette pour écrire chat, grand, tapis, noix, toit, pied. | CE1 |  | §2.1 CE1 (lettres muettes lues sans les vocaliser) ; §2.4 CE1 (lettre muette finale) |
| E33 | foret-muette-07 | histoire | flu.liaison, comp.consigne.simple | Lire un récit de 6 phrases (34 mots) et répondre à 3 questions littérales. | CP |  | §3 « Lecture/écriture » et §2.3 CP (texte de dix lignes environ ; le récit livré fait 6 à 8 phrases courtes) |
| E34 | foret-muette-08 | colorie | gph.finale.muette, lex.couleur, comp.consigne.simple | Colorier 7 objets désignés par une consigne courte (le chat en noir, le tapis en brun) ; la compétence annoncée (lettre muette) ne se lit pas dans la tâche. | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E35 | foret-muette-09 | attrape | enc.pluriel.s | Attraper les mots qui ont un s (chats, fleurs, amis) parmi des singuliers. | CE1 |  | §2.5 CE1 « accords » (pluriel en -s, groupe nominal) |
| E36 | foret-muette-10 | paires | flu.liaison | Apparier un groupe nominal court (un ours) à son expansion (l'ours brun, les enfants de l'école) ; groupes de 2 à 5 mots. | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » ; frôle §2.5 CE1 (groupe nominal : déterminant, nom, adjectif) |
| E37 | foret-muette-11 | tri | enc.pluriel.s, comp.consigne.multiple | Trier des mots selon qu'ils ont un s (pluriel) ou non (singulier). | CE1 |  | §2.5 CE1 « accords » (pluriel en -s, groupe nominal) |
| E38 | foret-muette-12 | phrase | gph.finale.muette, comp.consigne.simple | Remettre dans l'ordre « Mon chat est petit. » et « Ton rat a un nid. » (mots à lettre finale muette). | CE1 | oui | §2.1 CE1 (lettres muettes lues sans les vocaliser) ; §2.4 CE1 (lettre muette finale) ; la tâche elle-même (4 à 5 mots) est de niveau CP |
| E39 | marais-jumeau-01 | eclair | gph.nasale.on | Lire un mot flashé (ballon, citron, pont...) et le retrouver ; son on. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » (liste des CGP par niveau : NON TROUVÉ) |
| E40 | marais-jumeau-02 | attrape | gph.nasale.an | Attraper les mots au son « an » (dent, vent, grand, enfant, orange, viande). | CP | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) ; graphies an/en/ant : frontière fin de CP / début de CE1 |
| E41 | marais-jumeau-03 | tri | gph.nasale.on, gph.nasale.an, comp.consigne.multiple | Trier des mots au son on ou an (ballon, cochon / dent, vent, orange). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E42 | marais-jumeau-04 | chemin | gph.digramme.ou, gph.digramme.oi | Marcher sur les mots au son ou ou oi (loup, jour / roi, soir, toit). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E43 | marais-jumeau-05 | paires | gph.nasale.in | Apparier un mot écrit et sa version avec article (lapin / le lapin) pour le son in/ain (matin, main, pain). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E44 | marais-jumeau-06 | assemble | gph.nasale.on, gph.nasale.in | Ranger des syllabes pour écrire lapin, matin, jardin, citron. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E45 | marais-jumeau-07 | phrase | gph.nasale.an, comp.consigne.simple | Remettre dans l'ordre « Le grand enfant danse. » et « Maman range les gants. ». | CP |  | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E46 | marais-jumeau-08 | colorie | gph.digramme.ou, lex.couleur, comp.consigne.simple | Colorier 7 éléments désignés par une consigne courte (caillou, saule, escargot...). | CP |  | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E47 | marais-jumeau-09 | eclair | gph.digramme.oi | Lire un mot flashé (roi, noir, soir, toit, poire) et le retrouver ; son oi. | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E48 | marais-jumeau-10 | attrape | gph.digramme.oi | Attraper les mots au son « oi » (roi, soir, poire, toit). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E49 | marais-jumeau-11 | tri | gph.digramme.ou, gph.digramme.oi, comp.consigne.multiple | Trier des mots au son ou ou oi (loup, boule / roi, soir, noix, poire). | CP |  | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » |
| E50 | marais-jumeau-12 | chemin | gph.nasale.in, gph.nasale.on | Marcher sur les mots au son in/ain ou on (lapin, raisin, copain, dinde / ballon, bonbon). | CP | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) ; graphies in/ain/dinde/copain : frontière fin de CP / début de CE1 |
| E51 | volcan-01 | attrape | gph.rare.eau | Attraper les mots en -eau (bateau, gâteau, chapeau, drapeau) parmi des mots en -o (moto, vélo). | CP | oui | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » ; la CGP -eau est à classer (liste NON TROUVÉE), tenue CP |
| E52 | volcan-02 | tri | gph.rare.ch-qu, gph.rare.ph, comp.consigne.multiple | Trier des mots selon les sons ch, qu/c, ph (cheval, quille, phare, dauphin, éléphant). | CE1 | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) |
| E53 | volcan-03 | grave | gph.rare.eau | Graver la fin -eau de bateau, gâteau, chapeau, cadeau, rideau, drapeau. | CP | oui | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » ; -eau : voir E51 |
| E54 | volcan-04 | paires | gph.rare.ill | Apparier un mot écrit et sa version avec article pour le son -ille (bille, famille, feuille, grenouille). | CE1 | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) |
| E55 | volcan-05 | chemin | gph.rare.ill, gph.rare.gn | Marcher sur les mots au son -ill- ou gn (fille, quille / montagne, ligne, agneau) et écarter balle, salle, colle. | CE1 | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) |
| E56 | volcan-06 | assemble | gph.rare.eau | Ranger des syllabes pour écrire bateau, cadeau, chapeau. | CP | oui | §3 « Décodage » (fin de CP : déchiffrer tous les mots) ; §2.1 « Fin de CP » ; -eau : voir E51 |
| E57 | volcan-07 | chrono | gph.rare.ch-qu, gph.rare.gn, comp.consigne.simple | Ranger 3 images selon un récit de 3 phrases (cochon et ruche, quilles, champignon) ; vocabulaire plus riche. | CE1 | oui | §2.3 CE1 (restituer l'enchaînement chronologique) ; §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) |
| E58 | volcan-08 | colorie | gph.rare.eau, lex.couleur, comp.consigne.simple | Colorier 8 éléments désignés (seau, marteau, enclume, cristal de gauche...). | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E59 | volcan-09 | attrape | gph.rare.ch-qu, gph.rare.ph | Attraper les mots aux sons ch, qu/c, ph parmi des distracteurs. | CE1 | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) |
| E60 | volcan-10 | tri | gph.rare.ill, gph.rare.gn, comp.consigne.multiple | Trier des mots selon les sons -ille (ville exclue) et gn (montagne / champignon). | CE1 | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) |
| E61 | volcan-11 | grave | gph.rare.ill | Graver les lettres ill de bille, fille, quille, famille ; ville sert d'intrus. | CE1 | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) |
| E62 | volcan-12 | paires | gph.rare.ch-qu, gph.rare.ph | Apparier un mot écrit et sa version avec article (cheval, quille, musique, queue, phare, dauphin). | CE1 | oui | §2.1 CE1 (décoder toutes les CGP, y compris les plus complexes) ; liste des CGP par niveau : NON TROUVÉ (§4) |
| E63 | cite-des-histoires-01 | histoire | comp.litteral | Lire un récit de 6 phrases (36 mots) et répondre à 6 questions littérales. | CP |  | §3 « Lecture/écriture » et §2.3 CP (texte de dix lignes environ ; le récit livré fait 6 à 8 phrases courtes) |
| E64 | cite-des-histoires-02 | paires | comp.image, comp.litteral | Apparier des phrases de 4 à 6 mots (Il entre dans l'école.) à leur image. | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E65 | cite-des-histoires-03 | chrono | comp.chronologie | Ranger 3 images selon un récit de 3 phrases courtes (Gobi, seau, sable, château). | CP | oui | §2.3 CE1 (restituer l'enchaînement chronologique) ; 3 phrases de 4 à 7 mots : tenu CP |
| E66 | cite-des-histoires-04 | phrase | comp.phrase.completee, comp.litteral | Remettre dans l'ordre « Le feu est rouge. » et « Les voitures sont sur la route. ». | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » |
| E67 | cite-des-histoires-05 | histoire | comp.litteral, comp.image | Lire un récit de 7 phrases (37 mots) et répondre à 5 questions littérales. | CP |  | §3 « Lecture/écriture » et §2.3 CP (texte de dix lignes environ ; le récit livré fait 6 à 8 phrases courtes) |
| E68 | cite-des-histoires-06 | chrono | comp.chronologie | Ranger 3 images selon un récit de 3 phrases plus longues (8 à 11 mots : nuage, flaque, arc-en-ciel, gouttière). | CE1 | oui | §2.3 CE1 (restituer l'enchaînement chronologique) |
| E69 | cite-des-histoires-07 | chemin | comp.chronologie | Marcher sur 4 phrases-ponts dans l'ordre chronologique du récit (Puis..., Le matin..., Le soir...). | CE1 | oui | §2.3 CE1 (restituer l'enchaînement chronologique) |
| E70 | cite-des-histoires-08 | tri | comp.inference, comp.consigne.multiple | Ranger des phrases (Il a un bec. Il joue dans la cour.) sous le renard ou le hibou ; il faut déduire de qui parle le « Il ». | CE1 | oui | §2.3 CE1 (inférences dans des cas simples ; chaîne anaphorique) |
| E71 | cite-des-histoires-09 | assemble | comp.phrase.completee, comp.inference | Deviner un mot à partir d'une définition (« du vent et de la farine » = moulin) puis ranger ses syllabes. | CE1 | oui | §2.3 CE1 (inférences dans des cas simples ; chaîne anaphorique) |
| E72 | cite-des-histoires-10 | colorie | comp.image, lex.couleur, comp.consigne.simple | Colorier selon des consignes à repères spatiaux (le grand arbre à droite de la tente en rose). | CE1 | oui | §2.3 CE1 (exécuter une recette ou une règle de jeu : consigne à plusieurs repères) |
| E73 | cite-des-histoires-11 | histoire | comp.inference, comp.chronologie | Lire un récit de 6 phrases (38 mots) avec reprises (le mot, le dessin, Filou) et répondre à des questions dont une se déduit (« Qui est l'ami de Gobi ? »). | CE1 |  | §2.3 CE1 (inférences dans des cas simples ; chaîne anaphorique) |
| E74 | cite-des-histoires-12 | paires | comp.phrase.completee | Compléter « La carotte est » par l'adjectif accordé (orange, verte, noire, violet) : accord en genre. | CE1 |  | §2.5 CE1 « accords » (féminin en -e, groupe nominal) |
| E75 | cite-des-histoires-13 | chrono | comp.chronologie | Ranger 3 images selon un récit de 3 phrases de 8 à 11 mots (Gobi, cahier, cubes, lit). | CE1 | oui | §2.3 CE1 (restituer l'enchaînement chronologique) |
| E76 | cite-des-histoires-14 | phrase | comp.phrase.completee | Remettre dans l'ordre « Mon ami a un ballon. » et « La cour est grande. » (accord de grande). | CP | oui | §3 « Lecture/écriture » (fin de CP : phrase simple, texte ~10 lignes) ; §2.1 « Fin de CP » ; accord au féminin : frôle §2.5 CE1 « accords » |

## 2. Répartition par région

| Région | CP | CE1 | CE2 | Total | dont « à juger par le parent » |
|---|---|---|---|---|---|
| clairiere | 12 | 0 | 0 | 12 | 1 |
| galeries | 14 | 0 | 0 | 14 | 2 |
| foret-muette | 4 | 8 | 0 | 12 | 5 |
| marais-jumeau | 12 | 0 | 0 | 12 | 2 |
| volcan | 4 | 8 | 0 | 12 | 12 |
| cite-des-histoires | 6 | 8 | 0 | 14 | 10 |
| **Total** | **52** | **24** | **0** | **76** | **32** |

Lecture : **aucun exercice n'est estimé CE2**. Le seul point d'appui CE2 est partiel (E28, pluriels en -x : hiboux, oiseaux), et l'exercice est classé CE1. Les régions Clairière, Galeries et Marais jumeau sont entièrement CP (les 38 exercices) : une correspondance graphème-phonème, un mot flashé ou une phrase de 4 mots. Les exercices classés CE1 se regroupent dans la Forêt muette (lettres muettes, pluriel en -s), le Volcan (CGP ill, gn, ph, ch/qu) et la Cité des histoires (chronologie, inférence, accord).

Volume de texte maximal observé (mesuré dans les JSON) : les 6 récits des moteurs `histoire` font de 34 à 51 mots et de 6 à 8 phrases (E09 : 8 phrases, 41 mots ; E22 : 8 phrases, 51 mots ; E33 : 6 phrases, 34 mots ; E63 : 6 phrases, 36 mots ; E67 : 7 phrases, 37 mots ; E73 : 6 phrases, 38 mots). C'est en dessous de la dizaine de lignes du CP (§3, §2.3 CP) et très en dessous des 15 lignes du CE1 et des 20 lignes du CE2 (§2.3).

## 3. Attendus CE1-CE2 du référentiel non couverts par aucun exercice

Couverture : « aucune » = aucun exercice des 76 ; « partielle » = un ou deux exercices touchent l'attendu sans l'atteindre complètement.

### 3.1 Décodage (§2.1)

| Attendu | Couverture | Détail |
|---|---|---|
| CE1 : décoder toutes les CGP, y compris les plus complexes | partielle | ill, gn, ph, ch/qu, eau couverts (E51-E62). Aucune CGP au-delà (par exemple `oin`, `ien`, `gu`, `ge/gi`, `c/ç`, `s` entre voyelles) : liste des CGP NON TROUVÉ, donc non chiffrable. |
| CE1 : lire des syllabes et des **pseudo-mots** (doir, stag, choust, valin, cagnou) | **aucune** | Tous les mots lus sont des mots réels et fréquents. |
| CE1 : lettres muettes sans les vocaliser | couverte | E27, E29, E32, E38 (Forêt muette). |
| CE2 : toutes les CGP automatisées ; mots fréquents et **irréguliers** reconnus directement | **aucune** | Seuls 3 exercices travaillent les mots outils (E05, E09, E10) ; aucun mot irrégulier (femme, monsieur, oignon) n'est visé. |

### 3.2 Fluence (§2.2)

| Attendu | Couverture | Détail |
|---|---|---|
| CE1 : 70 mots par minute ; CE2 : 90 mots par minute | **aucune** | Aucun exercice ne chronomètre ni ne propose la lecture à voix haute d'un texte. La reconnaissance vocale a été retirée du jeu (CLAUDE.md, « l'ASR n'est plus dans le jeu ») ; la fluence ne pourrait donc se mesurer qu'avec le parent, ou par un temps de lecture passif consigné au journal. |

### 3.3 Compréhension (§2.3)

| Attendu | Couverture | Détail |
|---|---|---|
| CE1 : texte d'environ 15 lignes ; CE2 : environ 20 lignes | **aucune** | Maximum observé : 8 phrases, 51 mots (E22). |
| Chaîne anaphorique (nom et ses reprises) | partielle | E73 seulement (le mot, le dessin, Filou) ; E70 repose sur le pronom « Il » mais sans le dire. CE2 : ambiguïtés d'anaphore : aucune. |
| Inférence dans des cas simples (CE1) ; sur indices explicites et connaissances (CE2) | partielle | E70, E71, E73. Toutes les autres questions des 6 récits sont littérales (la réponse est écrite). |
| Justifier par un retour au texte | **aucune** | Aucun moteur ne demande de montrer la phrase qui justifie la réponse. |
| Donner un titre, résumer, expliciter les émotions des personnages | **aucune** | Les `histoire` ont un titre imposé et aucune question sur les émotions. |
| Différencier type narratif / informatif / prescriptif (CE2), texte documentaire, poétique, théâtral | **aucune** | Tous les textes sont des mini-récits. Les consignes de coloriage sont les seuls textes prescriptifs (E72 : consigne à repères multiples). |
| Dictionnaire, stratégies en cas d'incompréhension (relecture, dictionnaire) | **aucune** | |
| Enchaînement chronologique (CE1) | couverte | E21, E57, E65, E68, E69, E75 ; mais récits de 3 phrases. |
| 5 à 10 œuvres complètes, carnet de lecture | hors sujet | Ne se mesure pas dans un exercice. |

### 3.4 Vocabulaire (§2.4)

| Attendu | Couverture | Détail |
|---|---|---|
| Morphologie : affixes (para-, multi-, anti-, -eur/-euse, -er) | **aucune** | |
| Catégories génériques / spécifiques (aliment > laitage > fromage) | **aucune** | E03 trie « couleur » contre « autre » (un seul niveau). |
| Niveaux de langue, sens propre / sens figuré | **aucune** | |
| Contraires en in-/dé- ; gradation synonymique (CE2) ; dérivation (CE2) ; fluence verbale (CE2) | **aucune** | |
| Orthographe lexicale : mots invariables, accents, lettre muette finale par famille de mots, graphèmes à prononciation variable (s, c, g) | partielle | Lettre muette finale (E27, E29, E32) mais sans famille de mots (grand/grande) ; mots invariables : seulement E05, E09, E10 en mots outils ; s, c, g à prononciation variable : aucun exercice dédié. |

### 3.5 Grammaire et orthographe grammaticale (§2.5)

| Attendu | Couverture | Détail |
|---|---|---|
| CE1 : groupe sujet, verbe, compléments | **aucune** | Les moteurs `phrase` remettent des mots dans l'ordre sans nommer de fonction. |
| CE1 : trois types de phrases (déclarative, interrogative, impérative), formes négative et exclamative | **aucune** | Les questions des `histoire` sont interrogatives et les consignes impératives, mais aucun exercice ne demande de les distinguer ; aucune phrase négative ni exclamative n'est travaillée. |
| CE1 : classes de mots (déterminant, nom commun, nom propre, adjectif, verbe, pronom personnel sujet) | **aucune** | |
| CE1 : pluriel en -s | couverte | E28, E31, E35, E37. |
| CE1 : féminin en -e | partielle | E74 (adjectif de couleur). |
| CE1 : relation sujet-verbe ; radical et terminaison ; infinitif d'un verbe du 1er groupe | **aucune** | E30 et E38 touchent la forme du verbe (est/sont) sans que l'accord soit la consigne. |
| CE1 : conjugaison présent, imparfait, futur, passé composé (être, avoir, 1er groupe) | **aucune** | |
| CE2 : adverbes, discours rapporté (guillemets), produire types et formes de phrases | **aucune** | |
| CE2 : pluriels en -x et -al/-aux, féminins audibles (lecteur/lectrice) | partielle | E28 (hiboux, oiseaux) ; le titre « animaux » ne correspond à aucune carte (il n'y a pas de -al/-aux). |
| CE2 : conjugaison avec faire, aller, dire, venir, pouvoir, voir, vouloir, prendre | **aucune** | |

### 3.6 Écriture (§2.6)

**Hors jeu tablette**, pour l'essentiel : la copie de 5 à 10 lignes, la dictée, la production d'un texte de 1 à 7 phrases (CE1) ou de 10 lignes (CE2) demandent une production écrite libre et un correcteur, ce que le jeu ne fait pas (aucun moteur ne reçoit du texte saisi). L'écriture cursive n'est que partiellement approchée : les moteurs `trace` et `grave` font tracer des lettres (E13, E14, E17, E18, E32, E53, E61) selon le fichier `contenu/referentiel/ductus-minuscules.json`, mais il s'agit du sens du tracé de lettres minuscules, non d'un apprentissage de la cursive liée (le fichier laisse d'ailleurs 21 lettres « non tranchées »). Le tracé d'un doigt sur tablette n'est pas non plus le tracé normé du cahier : à juger par le parent.

## 4. Propositions pour monter le niveau (sans rien écrire dans `contenu/`)

Chaque piste réutilise l'un des 14 moteurs existants (`client/src/moteurs/` : assemble, attrape, chemin, chrono, colorie, eclair, grave, histoire, libre, paires, phrase, place, trace, tri). Tout nouveau contenu passerait par `contenu/brouillons/` puis par la relecture parent (règle du projet). Chaque piste est une idée à faire arbitrer, jamais une décision.

1. **Allonger les textes des moteurs `histoire`** jusqu'à 10-15 lignes, avec des questions sur la phrase qui justifie la réponse. *Concerne* E09, E22, E33, E63, E67, E73. *Vise* §2.3 CE1 (texte d'environ 15 lignes ; justifier par un retour au texte) puis CE2 (environ 20 lignes). Contrainte du projet : fond parchemin, police Andika, aucune animation dans le champ de lecture.
2. **Faire de l'inférence et de l'anaphore le cœur de nouvelles `histoire`** : questions du type « Qui est “il” ? », « Pourquoi Gobi est-il content ? » (émotions), sur le modèle de E73. Aujourd'hui E63, E67, E09, E22 et E33 sont à réponse littérale. *Vise* §2.3 CE1 (chaîne anaphorique, inférences simples, émotions des personnages) et CE2 (ambiguïtés).
3. **Remplacer les phrases de 4 mots du moteur `phrase` par des phrases de 8 à 12 mots avec ponctuation variée** (point, point d'interrogation, point d'exclamation) et demander de ranger les phrases par type dans un moteur `tri` (déclarative / interrogative / impérative). *Concerne* E05, E30, E38, E45, E66, E76 (phrases de 4 à 6 mots, tenues CP). *Vise* §2.5 CE1 (trois types de phrases, formes négative et exclamative) et CE2 (produire types et formes).
4. **Un moteur `tri` ou `attrape` par classe de mots** : « attrape les verbes », « range les noms propres et les noms communs » en réutilisant le vocabulaire déjà lu dans E03, E25, E27. *Vise* §2.5 CE1 (déterminant, nom commun, nom propre, adjectif, verbe, pronom sujet).
5. **Accords en genre et en nombre avec le moteur `phrase` ou `paires`** : choisir entre « grand / grande », « chante / chantent », « les oiseaux / les oiseau » ; étendre E28, E31, E35, E37 et E74 aux pluriels en -x et -al/-aux (CE2) et aux féminins audibles. *Vise* §2.5 CE1 (pluriel en -s, féminin en -e, sujet-verbe) et CE2 (pluriels irréguliers, féminins audibles).
6. **Décodage de pseudo-mots avec le moteur `eclair`** (mot flashé, puis retrouvé parmi des proches) : doir, stag, choust, valin, cagnou, en reprenant le patron de E02, E11, E15, E26, E39, E47. *Vise* §2.1 CE1 (exemples de réussite donnés par le référentiel). Attention : un pseudo-mot ne s'illustre pas et n'a pas de sens ; à arbitrer par le parent.
7. **Assembler radical et terminaison avec le moteur `assemble`** (chant + e / ent / ons) à la place des syllabes CV de E07, E19, E44, E56. *Vise* §2.5 CE1 (radical et terminaison d'un verbe du 1er groupe ; retrouver l'infinitif) et la conjugaison (présent, imparfait, futur).
8. **Vocabulaire par catégories et par famille de mots avec `tri` et `paires`** : aliment > laitage > fromage ; contraires en in-/dé- (possible, impossible ; faire, défaire) ; mots de la même famille (grand/grande/grandir pour la lettre muette). Reprend les patrons de E03, E28, E43. *Vise* §2.4 CE1 (catégories génériques, contraires in-/dé-, lettre muette par famille) et CE2 (dérivation).
9. **Consignes prescriptives plus longues avec `colorie` ou `place`** : recette ou règle de jeu en 3 à 4 étapes plutôt que « Colorie le chat en noir » (E01, E10, E34, E46, E58 sont des consignes à une cible). E72 est déjà plus riche (repères spatiaux). *Vise* §2.3 CE1 (exécuter une recette ou une règle de jeu).
10. **Chronologie sur des récits de 5 à 7 phrases avec connecteurs** (d'abord, puis, ensuite, enfin), en prolongeant E21, E65, E68, E69, E75 qui n'ont que 3 phrases. *Vise* §2.3 CE1 (enchaînement chronologique) et la production d'écrits §2.6 CE1 (connecteurs), lue plutôt qu'écrite.

Non proposé : la fluence (§2.2) ne se mesure pas sans lecture à voix haute écoutée ; elle serait au mieux un temps de lecture passif consigné au journal, hors de l'écran de l'enfant (règle : aucun échec ni chrono visible). À arbitrer par le parent.


## Contrôle

Comptes obtenus par commande (sorties recopiées telles quelles).

```
$ ls contenu/noeuds/*.json | wc -l
76
$ grep -cE "^\| E[0-9]{2} \|" Docs/audit-niveau-lecture-ce1-ce2.md   (lignes de la table §1)
76
$ écart = fichiers - lignes
0
$ nœuds de la table absents de contenu/noeuds (diff, vide = aucun écart)
(aucune différence)
$ numéros E distincts dans la table
76
$ lignes par niveau estimé (colonne 7 de la table §1)
CE1 24
CP 52
$ lignes marquées « à juger par le parent » (colonne 8)
32
```

Écart fichiers / lignes : 0, donc aucun nœud manquant. Niveaux : CP 52, CE1 24, CE2 0 (aucune ligne CE2, donc absente de la sortie awk).
