# La Pierre des Mots — Spécifications v2

**Remplace** « L'Atelier des Mots » v1.0
**Changements majeurs** Reconnaissance vocale retirée · univers et game design refondus · document de référence unique

---

## 1. Ce qui change par rapport à la v1

| v1 | v2 | Pourquoi |
|---|---|---|
| Reconnaissance vocale (whisper.cpp), notation de lecture orale | **Supprimée** | Complexité et frustration disproportionnées ; la fluence sera estimée autrement (§ 12.3) |
| Thème « atelier », machine à syllabes | **Univers d'aventure** : un monde à réveiller | Un établi est un décor ; une quête est un moteur |
| Exercices présentés comme exercices | **Mini-jeux** avec habillage, personnages et enjeu narratif | C'est tout l'écart entre une fiche et Adibou |
| Progression = mur de plaques | **Carte du monde à débloquer + couleur qui revient** | Le progrès doit être visible d'un seul coup d'œil, à distance, sans lire |
| Récompenses = accessoires d'avatar | **Compagnons, pouvoirs, éclats, décor du campement** | Plusieurs monnaies de progression valent mieux qu'une |

Le socle technique de la v1 (Node 24, Fastify, SQLite, React 19, HTTPS local, `.bat`, pipeline agent) est **conservé tel quel**, allégé de la chaîne ASR. Il est rappelé en § 13.

---

## 2. Ce que le genre nous apprend

Quatre références, une leçon exploitable chacune. Aucun personnage, nom ou visuel de ces œuvres n'est repris : ce sont des principes de conception, les créations sont originales.

### Adibou (Coktel Vision, 1992 — remake Wiloki/Ubisoft, 2022)

La leçon n'est pas « des mini-jeux éducatifs ». C'est la **densité d'interactions gratuites** : dans Adibou, cliquer n'importe où sur le décor déclenche une animation, une réplique ou une surprise, sans lien avec l'apprentissage. C'est ce qui transforme un logiciel en lieu qu'on a envie d'habiter. Deuxième leçon : le personnage guide joue le **grand frère bienveillant**, jamais le maître.

> **Exigence chiffrée :** au moins 25 points d'interaction gratuits dans le campement, dont 10 avec animation unique et 6 avec réplique vocale. Un décor où le clic ne fait rien est un décor raté.

### Les Légendaires (Patrick Sobral, Delcourt)

Le postulat de la série : une pierre se brise et transforme les habitants du monde en enfants. **Les héros sont des enfants, et c'est une condition, pas un handicap.** À reprendre : une bande de compagnons complémentaires — chacun une valeur, un pouvoir, un rôle —, un artefact brisé à reconstituer, une quête à long terme lisible sur une carte. Le registre est l'aventure héroïque, pas la mignardise : à 7 ans, on veut être un héros, pas un élève mignon.

### Kirby (Masahiro Sakurai, HAL)

Le « Kirbyism » : un jeu doit être **terminable par tout le monde**, et la difficulté est un choix du joueur, pas une contrainte du concepteur. Chez Kirby : pas de vies, faute peu punie, capacité de vol qui permet d'éviter tout danger si on le souhaite, et le système de copie qui laisse choisir son style de jeu.

Transposition directe et non négociable :

- **Aucun écran d'échec. Jamais.** Pas de « perdu », pas de vies, pas de retour en arrière.
- Un acquis n'est jamais repris.
- L'enfant choisit son niveau d'aide, et l'aide n'est pas une honte : c'est un pouvoir.

### Super Mario (Nintendo)

Deux outils. D'abord la **carte du monde** : des mondes thématiques, des nœuds, des chemins qui se dessinent, des embranchements — le progrès se lit en un regard, sans texte. Ensuite la **structure de niveau en quatre temps** : présenter la mécanique dans un contexte sûr, la développer, la retourner, conclure par un défi qui la maîtrise. Chaque chaîne de mini-jeux suit cette courbe (§ 5.3).

### Teach Your Monster to Read (Usborne Foundation)

Référence directe du même créneau, à la fois modèle et contre-exemple. Modèle : créer son monstre avant de jouer, débloquer des accessoires portés immédiatement, un moteur adaptatif qui ajoute de l'entraînement là où ça coince. Contre-exemple : la critique la plus constante porte sur le **manque de variété** — les mêmes mini-jeux reviennent trop.

> **Exigence chiffrée :** chaque compétence doit être travaillable par **au moins 3 mini-jeux visuellement et mécaniquement distincts**. Le sélecteur ne rejoue jamais le même habillage deux fois dans une session.

---

## 3. L'univers

### 3.1 Le pitch, tel qu'on le raconterait à l'enfant

> Autrefois, la **Pierre des Mots** tenait le monde éveillé. Chaque chose avait son nom, et chaque nom lui donnait sa couleur. La Pierre s'est brisée. Ses éclats se sont dispersés, et **la Grisaille** est montée : elle efface les noms, et ce qui n'a plus de nom perd ses couleurs.
>
> Toi, tu sais encore lire les noms. Alors les habitants t'attendent.

**La Grisaille n'est pas un méchant.** C'est un brouillard, une absence. Il n'y a pas de vilain à combattre, pas de menace, pas de peur — juste un monde éteint qu'on rallume. C'est une décision de conception : à 7 ans et le soir, un antagoniste incarné coûte plus qu'il ne rapporte.

### 3.2 Le mécanisme signature : la couleur qui revient

Toute zone non conquise est affichée **en gris désaturé, immobile, silencieuse**. Chaque mini-jeu réussi recolorie une portion du décor : les feuilles reprennent leur vert, l'eau se remet à couler, un animal se met à bouger, un instrument rejoint la musique.

C'est simultanément :

- la barre de progression (visible de l'autre bout de la pièce, sans savoir lire) ;
- la récompense (immédiate, spectaculaire, gratuite) ;
- la justification narrative du coloriage, qui cesse d'être une activité annexe ;
- un moteur de retour : un monde à moitié colorié appelle qu'on le termine.

Techniquement : chaque décor est un SVG en calques, servi avec un filtre `saturate(0)` global et des calques dé-grisés un par un, avec une transition de 900 ms qui balaie depuis le point touché.

### 3.3 Les six régions

| Région | Domaine travaillé | Ambiance |
|---|---|---|
| **La Clairière** | Voyelles, syllabes simples (CV), premiers mots outils | Prairie, lucioles, arbre-maison |
| **Les Galeries** | Syllabes CVC, confusions `b/d/p/q`, sons proches | Grottes de cristal, échos |
| **Le Marais Jumeau** | Nasales `on/an/in/ou`, digrammes | Marais brumeux, nénuphars, grenouilles |
| **La Forêt Muette** | Lettres finales muettes, pluriels, liaisons | Forêt d'automne, feuilles qui tombent sur les lettres |
| **Le Volcan** | Graphèmes rares : `eau`, `ill`, `gn`, `ph`, `ch/qu` | Roche, laves, forges |
| **La Cité des Histoires** | Compréhension : textes, inférences, chronologie | Ville-bibliothèque, ponts de livres |

Chaque région contient 10 à 14 nœuds, un **Éclat de Pierre** au bout, et un compagnon à rallier. Les régions s'ouvrent dans l'ordre, mais **deux régions restent ouvertes en parallèle** dès la troisième : l'enfant choisit où aller.

### 3.4 Le campement

Hub central, à la Adibou. On y revient entre les sorties. Éléments cliquables : la tente (avatar et garde-robe), le feu (compagnons, dialogues), la carte (départ en mission), le coffre (collections), le mur des noms (mots maîtrisés, chacun rejouable en un tap), le chaudron (coloriage libre), la lunette (statistiques enfant, en images), et une trentaine d'objets de décor sans autre fonction que de réagir quand on les touche.

Le campement se meuble au fil de la progression : chaque région terminée y ajoute un objet rapporté, animé.

---

## 4. Le héros et sa bande

### 4.1 L'avatar

Système SVG en calques paramétriques (identique à la v1 § 12.1). **Défaut du premier profil** : peau claire, cheveux châtains `#7A5230`, yeux bleus `#4A90D9`, coiffure courte ébouriffée, morphologie 7 ans — ajustable par l'enfant dès la création, moment d'appropriation à ne pas escamoter.

L'avatar n'est pas décoratif : il apparaît **dans** les mini-jeux (il porte, il saute, il pointe), il réagit, il porte ses équipements gagnés. Un enfant qui se voit agir s'implique davantage qu'un enfant qui voit une icône.

Équipements débloqués par région : cape, lanterne, besace, bâton, chapeaux, et une **peinture de visage** différente par Éclat obtenu.

### 4.2 Gobi, le compagnon de départ

Petite créature ronde, deux grands yeux, pas de bras, se déplace par bonds. Il **gobe les syllabes** — c'est son unique talent et le cœur du système d'aide.

**Le système de copie.** Chaque graphème maîtrisé devient une **forme** de Gobi : Gobi-OU (bouche en rond, souffle des bulles), Gobi-CH (crinière de chat), Gobi-EAU (translucide, ondule). En mini-jeu, l'enfant peut appeler Gobi : il prononce le son, surligne le graphème dans le mot, ou lit la syllabe difficile.

Point important : **appeler Gobi ne coûte rien et n'est jamais présenté comme un échec.** Cela change seulement le nombre d'étoiles obtenues (§ 6.2). C'est le choix de son propre niveau de difficulté, exactement l'idée de Sakurai — et c'est aussi ce qui fait de la collection de formes de Gobi une récompense désirable, puisque chaque graphème appris rend Gobi plus utile et plus rigolo.

### 4.3 Les quatre compagnons à rallier

Chacun est rencontré au bout d'une région, apporte une valeur, un domaine et une mécanique propre.

| Compagnon | Valeur | Domaine | Ce qu'il apporte au jeu |
|---|---|---|---|
| **Filou**, renard bricoleur | La malice | Mots outils, vitesse de reconnaissance | Les mini-jeux chronométrés, ses paris et ses défis éclair |
| **Bulle**, ondine conteuse | La curiosité | Compréhension, récits | Raconte les textes, pose les questions, anime la Cité |
| **Roc**, petit golem | La patience | Encodage, orthographe | Grave les mots ; les mini-jeux d'écriture et de lettres manquantes |
| **Plume**, oiseau messager | Le courage | Phrases, fluence | Porte les messages à lire, les courses de lecture |

Avant une mission, l'enfant **choisit qui l'accompagne**. Le compagnon modifie l'habillage, les répliques et le type d'aide disponible. Même contenu pédagogique, expérience différente : c'est le levier le plus économique pour lutter contre la répétition.

---

## 5. Boucle de jeu

### 5.1 Les trois boucles

**Boucle courte (30 à 90 s) — un mini-jeu.**
Consigne animée et audible → action → retour immédiat → fragment de décor recolorié.

**Boucle moyenne (10 à 15 min) — une sortie.**
Campement → choix de région et de compagnon → 4 à 6 nœuds enchaînés → nœud final un peu plus corsé → butin → retour au campement, qui s'enrichit.

**Boucle longue (2 à 8 semaines) — une région.**
Ouverture d'une région grise → conquête nœud par nœud → rencontre du compagnon → **Éclat de Pierre** → cinématique courte (10-15 s, SVG animé) où la région entière reprend ses couleurs et sa musique → ouverture de la région suivante sur la carte.

### 5.2 Trajet d'une sortie

```
CAMPEMENT ──▶ CARTE ──▶ nœud 1  échauffement, réussite quasi certaine
                        nœud 2  compétence en cours
                        nœud 3  révision espacée (SRS)
                        nœud 4  nouveauté, encadrée par le compagnon
                        nœud 5  défi de synthèse
                        ──▶ BUTIN ──▶ CAMPEMENT (un objet en plus)
```

Le nombre de nœuds s'ajuste : si l'attention chute (temps de réponse qui s'allonge, erreurs qui s'enchaînent), la sortie se raccourcit d'elle-même et se termine sur une réussite. **Une session se termine toujours par une victoire.**

### 5.3 Structure interne d'un nœud (les quatre temps)

Appliquée à chaque chaîne de mini-jeux, méthode Nintendo :

1. **Présentation** — la mécanique est montrée dans un contexte sans risque, avec le compagnon en démonstration.
2. **Développement** — même mécanique, un cran plus difficile.
3. **Retournement** — une variante inattendue (le mot arrive à l'envers, deux réponses correctes, le décor bouge).
4. **Maîtrise** — un défi court qui exige ce qui vient d'être appris, et qui déclenche la recoloration principale.

### 5.4 Règles de non-échec

- Pas d'écran de défaite, pas de vies, pas de compte à rebours global, pas de score négatif.
- Après deux tentatives infructueuses, Gobi propose son aide sans être appelé.
- Après trois, la bonne réponse s'anime doucement et l'enfant la valide lui-même : il fait le geste juste et repart avec une réussite.
- Un mot déjà maîtrisé n'est jamais retiré du mur des noms.
- La sortie de secours est toujours à un tap : le chaudron de coloriage libre, sans culpabilité.

---

## 6. Progression et récompenses

### 6.1 Quatre monnaies

| Monnaie | Gagnée par | Sert à |
|---|---|---|
| **Éclats de Pierre** | Fin de région (6 au total) | Progression narrative, ouverture de la carte |
| **Formes de Gobi** | Maîtrise d'un graphème | Aide en jeu + collection à voir dans le coffre |
| **Objets de campement** | Fin de sortie | Meubler et animer le hub |
| **Étoiles** | Qualité d'un nœud | Rejouer pour mieux faire, sans obligation |

Aucune de ces monnaies n'est du temps passé. On ne récompense jamais la durée : uniquement ce qui a été appris. C'est le garde-fou contre l'usage compulsif.

### 6.2 Les étoiles

- ★ le nœud est terminé — toujours acquis, quoi qu'il arrive
- ★★ terminé sans que Gobi n'intervienne
- ★★★ terminé sans erreur

Les étoiles manquantes sont affichées en creux, jamais en rouge, et le nœud reste rejouable à volonté. Rejouer un nœud déjà à trois étoiles reste possible : c'est du plaisir, pas du remplissage.

### 6.3 Ce qui se passe hors ligne

À chaque retour, si plus de 24 h se sont écoulées : un compagnon a laissé un message court à lire (2-3 mots au début, une phrase plus tard). C'est le seul rappel, il est diégétique, et il fait lire. Aucune notification push, aucune mécanique de série quotidienne culpabilisante : une série interrompue n'est jamais signalée à l'enfant, seulement au parent.

---

## 7. Les mini-jeux

Un mini-jeu = un **moteur d'exercice** (la mécanique, dans le code) + un **habillage** (le décor, les personnages, l'animation) + un **contenu** (le JSON produit par l'agent). Trois habillages minimum par moteur, un par région le cas échéant.

| Moteur | Mécanique | Habillages d'exemple |
|---|---|---|
| `attrape` | Toucher les bonnes cibles mobiles parmi des intrus | Lucioles à attraper · poissons · étoiles filantes |
| `tri` | Ranger des éléments dans 2-3 réceptacles | Paniers de fruits · wagons · grottes |
| `assemble` | Faire glisser des blocs-syllabes pour former un mot | Ponton de pierres · train · perles d'un collier |
| `chemin` | Tracer une route en enchaînant les bonnes cases | Sauts de nénuphars · pas japonais · lianes |
| `eclair` | Un mot apparaît brièvement, le retrouver | Flash d'orage · lueur d'une luciole · éclat de cristal |
| `paires` | Appariement mot ↔ image, memory | Coquillages · cartes du bestiaire |
| `phrase` | Ordonner des étiquettes-mots | Message porté par Plume · bannière · guirlande |
| `histoire` | Lire un texte court puis répondre | Veillée au feu avec Bulle · théâtre d'ombres |
| `chrono` | Remettre des vignettes dans l'ordre du récit | Fresque murale · pellicule · vitrail |
| `grave` | Compléter un mot lettre par lettre | Roc grave la pierre · sable · buée sur une vitre |
| `colorie` | Coloriage à consigne de lecture | Recoloration d'une zone de la région |
| `libre` | Coloriage sans consigne | Le chaudron du campement |

Chaque moteur définit sa validation automatique (modes de la v1 § 8.3, ASR retirée), son barème d'étoiles, ses paliers d'aide, et sa règle d'échec doux.

**Contrainte de fabrication :** un habillage est un ensemble de fichiers déclaratifs — SVG en calques, palette, timings, sons — chargé par le moteur. Ajouter un habillage ne doit demander **aucune ligne de code**, sinon la variété promise ne tiendra pas dans le temps.

---

## 8. Game feel

C'est la partie qui fait la différence entre « ça marche » et « c'est bon ». Valeurs de référence, à ajuster à la main sur l'appareil réel.

**Anticipation → impact → récupération**, sur chaque interaction :

- Appui sur un élément : `scale 0.94` en 60 ms, ombre qui se rapproche.
- Relâchement : `scale 1.06` puis `1.0`, ressort `stiffness 400 / damping 18`.
- Dépôt correct : aimantation sur les 24 derniers pixels, `overshoot` de 8 %, vibration 20 ms, son court avec hauteur montante selon la série en cours (2e bonne réponse = un demi-ton plus haut, comme les pièces de Mario). C'est le détail le plus rentable de toute la liste.
- Erreur : oscillation horizontale de 6 px sur 180 ms, l'élément retourne à sa place, **pas de son négatif**, pas de rouge, pas de secousse d'écran.
- Recoloration : balayage radial depuis le point touché, 900 ms, `cubic-bezier(.16,1,.3,1)`, 14 particules maximum.
- Fin de nœud : arrêt de la musique sur un accord, les étoiles arrivent une par une avec 180 ms d'écart et un son de plus en plus aigu.

**Règles :**

- Une réponse visible en moins de 100 ms sur tout appui, même si le traitement prend plus longtemps.
- Aucune animation bloquante de plus de 1,2 s ; tout est interruptible par un tap.
- Cibles tactiles ≥ 64 px (relevé depuis la v1 : c'est une tablette tenue à bout de bras, souvent en mouvement).
- Aucune coordination fine exigée : pas de glisser précis, pas de timing serré, tolérance de 24 px sur toutes les cibles de dépôt.
- `prefers-reduced-motion` et le réglage « animations calmes » suppriment le décoratif et gardent le fonctionnel.

---

## 9. Direction artistique

### 9.1 Le parti pris

**Bande dessinée jeunesse franco-belge, contours épais, couleur franche.** Pas de pastel doux, pas de 3D, pas de dégradés vaporeux : des aplats saturés cernés d'un trait sombre. Trois raisons — c'est le registre visuel des BD qu'il lit déjà ; c'est parfaitement lisible sur une tablette en plein jour ; et c'est le seul style qu'un agent peut produire en SVG de façon fiable et cohérente.

Le contraste gris/couleur porte tout le jeu : il faut donc que la couleur, quand elle revient, **claque**.

### 9.2 Palette

| Jeton | Hex | Rôle |
|---|---|---|
| `--trait` | `#1B2440` | Contour de tout élément dessiné, 3 à 5 px selon l'échelle. Non négociable, c'est ce qui tient le style |
| `--parchemin` | `#FFF6E3` | Fond de toute zone de lecture |
| `--soleil` | `#FFC93C` | Éclats, étoiles, récompenses, appel à l'action |
| `--framboise` | `#FF5D8F` | Gobi, accents pop, éléments interactifs secondaires |
| `--menthe` | `#3DDC97` | Réussite, validation, végétation réveillée |
| `--lagon` | `#2FA8E0` | Ciel, interface, eau |
| `--grisaille` | `#8E97A8` | Tout ce qui n'est pas encore conquis |

L'erreur n'a pas de couleur dédiée. Elle est un mouvement, pas une teinte.

Chaque région applique une variante saturée de la palette (dominante froide au Marais, chaude au Volcan) sans jamais changer `--trait` ni `--parchemin` : l'unité tient par le trait et par le support de lecture.

### 9.3 Typographie

| Rôle | Police |
|---|---|
| Titres, noms de région, chiffres de récompense | **Fredoka** (variable, ronde, joyeuse) — traitée en lettrage BD : léger contour `--trait`, ombre portée dure, arc sur les titres de région |
| Interface, boutons, dashboard | **Atkinson Hyperlegible** |
| **Toute zone de lecture** | **Andika** par défaut — conçue pour l'alphabétisation, `a` et `g` à une boucle comme dans les manuels |

Alternatives embarquées localement pour le texte de lecture, sélectionnables par profil : **OpenDyslexic**, **Luciole**, **Belle Allure** (cursive scolaire), **Verdana**. Aucun appel à Google Fonts : tout est servi en WOFF2 depuis le PC.

Réglages par profil, avec aperçu en direct : corps 16-40 px, interlettrage, espacement des mots, interligne, **coloration syllabique alternée**, surlignage de la ligne courante, règle de lecture, fond parchemin ou sombre.

> Le style BD s'arrête à la porte du texte à lire. Dès qu'il y a du déchiffrage, on passe sur `--parchemin`, en Andika, au calme, sans animation dans le champ de lecture. **Le décor s'agite, le texte jamais.**

### 9.4 Élément signature

**La carte du monde**, dessinée comme une carte au trésor sur parchemin, avec les régions conquises en couleur, les régions grises encore voilées d'un brouillard mouvant, et le chemin qui se dessine à l'encre au fur et à mesure. C'est l'écran qu'on ouvre en premier, celui qu'on montre à ses parents, et la seule chose à mettre sur une capture d'écran si un jour il faut expliquer le projet en une image.

---

## 10. Son et musique

### 10.1 Voix

**Piper** en local (voix `fr_FR-siwis-medium`, `fr_FR-tom-medium` en second personnage), **pré-rendu à la validation du contenu** : toutes les consignes, tous les mots, toutes les répliques sont synthétisés à l'avance, encodés en Opus, servis depuis le cache. Latence nulle, fonctionnement hors-ligne total.

Trois voix distinctes minimum : le narrateur, Gobi (rendu accéléré et transposé, sur des onomatopées plus que des mots), et le compagnon actif. Rendu syllabé disponible pour tout mot, synchronisé avec la coloration à l'écran.

**Règle absolue :** aucune consigne n'existe uniquement à l'écrit. Tout est audible en un tap, réécoutable sans limite, et n'a jamais de coût.

### 10.2 Musique

Musique **générative en couches, avec Tone.js**, plutôt que des pistes audio. Décision assumée : c'est le seul poste où un agent ne peut pas produire d'asset correct, et une piste en boucle de 90 s devient insupportable à la troisième session.

- Un thème par région : gamme, tempo, timbres.
- Des couches qui s'ajoutent au fil de la recoloration — une zone grise sonne creux, une zone terminée sonne pleine. La progression s'entend.
- Les sons de réussite sont **accordés sur la tonalité en cours** : rien ne sonne faux, jamais.
- Coupure et volume indépendants pour musique, effets et voix ; la voix reste toujours audible.

### 10.3 Mnémoniques sonores

Une signature de 3 à 5 notes par graphème travaillé, rejouée à chaque apparition. C'est le mécanisme le plus efficace du genre, et le moins cher à produire en génératif : douze mois plus tard, l'enfant se souvient encore du jingle du son `[ou]`.

---

## 11. Comptes et profils

Inchangé depuis la v1 : grille de cartes-profils avec avatar animé, un tap suffit, aucun mot de passe. Jeton signé en cookie `Secure` / `HttpOnly`, 30 jours. Reprise de session avec l'exercice en cours restauré.

Chaque profil possède : son avatar, sa progression, sa carte, ses compagnons, sa région d'accueil et sa **variante de palette**. Deux frères ne voient pas le même monde, et c'est important : le petit ne doit pas jouer dans les décors déjà coloriés par le grand.

Zone parent protégée par un code à 4 chiffres, `scrypt`, verrouillage temporaire après 5 échecs.

---

## 12. Pédagogie

### 12.1 Compétences

Référentiel inchangé (v1 § 7.1) : `gph.*` graphèmes, `syl.*` syllabation, `mot.outil.*`, `lex.*`, `flu.*`, `comp.*`, `enc.*`. Chaque compétence déclare ses prérequis ; aucune n'est proposée si un prérequis est sous 60 % de maîtrise.

**Le mapping régions → compétences n'est pas une décoration :** l'ordre des régions est l'ordre de la progression phonologique. Le narratif suit la pédagogie, jamais l'inverse.

### 12.2 Maîtrise et répétition

BKT simplifié par (profil, compétence) — `p_init 0.15`, `p_transit 0.12`, `p_glissement 0.10`. Acquis à `p ≥ 0.90` sur ≥ 5 tentatives réparties sur 3 jours distincts. Les tentatives avec aide de Gobi comptent à poids 0.4.

Leitner à 5 boîtes sur les items atomiques (graphèmes, mots outils, mots du mur) : J+1, J+3, J+7, J+16, J+35. Les révisions dues sont placées au nœud 3 d'une sortie, jamais en ouverture ni en clôture.

### 12.3 Fluence sans micro

La suppression de l'ASR ne supprime pas la mesure de fluence, elle la déplace sur des indicateurs silencieux, tous déjà journalisés :

- **Latence de reconnaissance** : temps entre l'apparition d'un mot et la bonne réponse, en `eclair` et `attrape`. C'est le meilleur proxy disponible de l'automatisation du déchiffrage.
- **Vitesse d'assemblage** : durée de construction d'un mot en `assemble`, à difficulté égale.
- **Taux de mots reconnus sous 1,5 s**, suivi dans le temps par graphème.
- **Lecture chronométrée facultative** : l'enfant lit un texte pour lui-même et tape « fini ». Auto-déclaratif, donc indicatif — mais suivi longitudinalement, la courbe reste informative.

Le parent voit ces courbes ; l'enfant ne voit jamais un chronomètre autrement que comme un jeu de rapidité assumé.

---

## 13. Technique

### 13.1 Socle (rappel v1, sans l'ASR)

| Couche | Choix |
|---|---|
| Runtime | Node.js 24 LTS, `node:sqlite` intégré — aucune dépendance native à compiler |
| Serveur | Fastify 5, HTTPS, WebSocket pour l'état de session |
| Base | SQLite, mode WAL, migrations SQL numérotées |
| Front | React 19 + TypeScript + Vite, Tailwind CSS v4, Motion, Zustand, TanStack Query/Router, dnd-kit |
| Rendu jeu | SVG en calques + Canvas 2D pour le coloriage et les particules. **Pas de moteur de jeu** : le DOM suffit et reste inspectable |
| Audio | Tone.js pour la musique et les effets, `<audio>` + cache pour la voix pré-rendue |
| Voix | Piper, binaire local, rendu hors ligne à la validation du contenu |
| PWA | vite-plugin-pwa, installation sur l'écran d'accueil, cache des assets |
| LLM | Couche `FournisseurLLM` : `ollama` local, `claude` API, `scripte`. Génération de contenu hors ligne de jeu |

**Retiré de la v1 :** whisper.cpp, le worker ASR, la table d'enregistrements audio, le stockage et la purge des voix d'enfant, la notation par alignement.

**Conséquence heureuse :** le micro n'étant plus nécessaire, la contrainte de contexte sécurisé se relâche. HTTPS par mkcert reste **recommandé** (PWA, installation sur l'écran d'accueil, propreté), mais devient **optionnel** : un repli HTTP simple est désormais pleinement fonctionnel. Le `.bat` propose les deux et démarre en HTTP si l'installation du certificat échoue. C'est le principal risque de la v1 qui disparaît.

### 13.2 Lancement

`demarrer.bat` : vérification de Node → `npm ci` si nécessaire → téléchargement des binaires et voix au premier lancement → certificats si demandés → règle de pare-feu (profil privé) → détection de l'IP LAN → publication mDNS `pierre.local` → démarrage → affichage de l'URL et d'un QR code dans la console.

`arreter.bat` et `sauvegarder.bat` complètent le lot.

### 13.3 Données

Schéma de la v1, moins `audio_ref` dans `tentatives`, plus :

```sql
regions(code, ordre, libelle, competences_json)
noeuds(id, region_code, ordre, moteur, habillage, exercice_id, prerequis_json)
progression_noeud(profil_id, noeud_id, etoiles, meilleur_score, tentatives, dernier_le)
progression_region(profil_id, region_code, pourcentage_colorie, eclat_obtenu_le)
compagnons(profil_id, code, rallie_le)
formes_gobi(profil_id, graphene_code, obtenue_le)
campement(profil_id, objet_code, place_le)
```

`tentatives` reste le journal append-only qui fait foi ; tout indicateur se recalcule depuis lui.

### 13.4 Contenu et agent

Inchangé sur le principe (v1 § 8 et § 16) : un exercice est un JSON validé par JSON Schema, produit par l'agent dans `contenu/brouillons/`, **obligatoirement relu et validé par le parent** avant d'atteindre l'enfant.

Ajouts au schéma :

```jsonc
"jeu": {
  "moteur": "assemble",
  "habillage": "clairiere.ponton",   // doit exister dans contenu/habillages/
  "noeud": "clairiere-04",
  "etoiles": { "sansAide": true, "sansErreur": true },
  "aideGobi": ["souffle-syllabe", "surligne-graphene"]
}
```

Les images PNG/JPG du dossier existant continuent d'alimenter le pipeline d'ingestion (v1 § 9) : normalisation, analyse par agent, découpe, vectorisation du trait pour les coloriages, génération du JSON et rendu TTS, puis file de relecture.

### 13.5 Performance

Cibles sur Galaxy Tab S10 FE : premier rendu < 1,2 s, transition entre nœuds < 150 ms, démarrage d'un son < 80 ms, **60 fps soutenus pendant les animations de recoloration**, bundle initial < 250 Ko gzip. Découpage de code par moteur de mini-jeu, préchargement du nœud suivant pendant que l'enfant joue le courant.

---

## 14. Dashboard parent

Inchangé dans l'esprit (v1 § 15), moins la réécoute audio, plus :

- **Carte de couverture** : la carte du monde annotée par taux de maîtrise réel, pour repérer une région coloriée mais mal acquise.
- **Courbe de latence de reconnaissance**, proxy de fluence (§ 12.3).
- **Top 10 des confusions** avec bouton « travailler ça », qui injecte les items en priorité dans la prochaine sortie.
- **Régie de contenu** : file de relecture, catalogue, habillages disponibles, état d'ingestion.
- Réglages, exports CSV, sauvegarde en un clic.

---

## 15. Lots de livraison

| Lot | Contenu | Résultat observable |
|---|---|---|
| **L0 — Socle** | `.bat`, serveur, base, profils, avatar, campement minimal | On se connecte depuis la tablette, on crée son héros, on touche le décor et ça réagit |
| **L1 — Première région** | Carte, 3 moteurs de mini-jeux, recoloration, Gobi, étoiles, SRS | La Clairière est jouable de bout en bout et se colorie |
| **L2 — Son** | Piper pré-rendu, musique générative Tone.js, mnémoniques | Rien ne dépend plus de la lecture d'une consigne écrite |
| **L3 — Contenu** | Ingestion des images existantes, relecture parent, contrat agent | Les fiches papier deviennent des nœuds |
| **L4 — Variété** | 6 moteurs de plus, 3 habillages par moteur, compagnons Filou et Roc | Deux sorties d'affilée ne se ressemblent pas |
| **L5 — Régions 2 et 3** | Galeries, Marais, Éclats, cinématiques de fin de région | La boucle longue existe |
| **L6 — Compréhension** | Bulle, Cité des Histoires, moteurs `histoire` et `chrono` | On passe du déchiffrage au sens |
| **L7 — Parent** | Dashboard complet, exports, sauvegardes | Pilotage sans ligne de commande |
| **L8 — Fratrie** | Second profil, niveaux CP/GS, palettes distinctes | Le petit frère a son monde à lui |

L1 est le lot qui décide de tout : s'il n'est pas amusant, aucun des suivants ne le rendra amusant.

---

## 16. Critères de recette

Aux critères techniques de la v1 (installation en moins de 5 min, fonctionnement hors-ligne, validation du contenu agent, persistance des tentatives, exactitude du dashboard) s'ajoutent des critères **de qualité ludique**, également opposables :

- **R11** Le campement compte au moins 25 points d'interaction gratuits, dont 10 animations uniques et 6 répliques vocales.
- **R12** Chaque compétence est travaillable par au moins 3 mini-jeux mécaniquement distincts.
- **R13** Une sortie complète ne rejoue jamais deux fois le même habillage.
- **R14** Aucun parcours, quel que soit le nombre d'erreurs, n'affiche d'écran d'échec, ne retire un acquis ou ne se termine sur une erreur.
- **R15** Toute consigne est audible en un tap, réécoutable sans limite, sans coût en étoiles.
- **R16** Aucune interaction ne demande de précision motrice supérieure à une cible de 64 px avec 24 px de tolérance.
- **R17** Le taux de retour spontané est mesuré : ≥ 4 sessions par semaine non sollicitées sur 3 semaines consécutives. C'est le seul critère qui compte vraiment.
- **R18** Test au réel : l'enfant termine une sortie complète **sans qu'un adulte lui explique quoi que ce soit**. À observer sans intervenir, même quand c'est tentant.

---

## 17. Risques

| Risque | Parade |
|---|---|
| Répétition perçue au bout de 3 semaines | Séparation moteur/habillage, 3 habillages minimum, choix du compagnon, régions ouvertes en parallèle, R12 et R13 opposables |
| Le narratif écrase la pédagogie | Les régions sont définies **à partir** de la progression phonologique ; toute nouvelle zone doit déclarer les compétences qu'elle couvre avant d'être dessinée |
| Volume d'assets graphiques sous-estimé | Style à contour épais et aplats, entièrement SVG, habillages déclaratifs, réutilisation systématique des calques ; un habillage doit se faire en une passe d'agent |
| Musique et voix bâclées | Génératif Tone.js pour la musique, Piper pré-rendu pour la voix : zéro pipeline d'asset audio à maintenir |
| Ça marche mais ce n'est pas amusant | L1 = une région complète et jouable, testée sur l'enfant avant tout élargissement. On ne construit pas les cinq autres régions sur un prototype non validé |
| Le grand frère colorie le monde du petit | Progression, carte et palette strictement par profil (§ 11) |

---

## 18. À trancher avant de développer

1. **Le nom.** « La Pierre des Mots » est un titre de travail. Le vrai nom devrait venir de l'enfant — le lui faire choisir est déjà une adhésion gagnée.
2. **Fournisseur LLM par défaut** : Ollama local pour les répliques et indices, Claude API pour la génération de contenu hors ligne de jeu. À confirmer.
3. **Échantillon de fiches** : 20 images du dossier existant suffisent à calibrer le tri automatique et à valider que le pipeline d'ingestion tient la route avant de l'industrialiser.
4. **HTTPS ou non** : sans micro, c'est devenu un choix de confort (PWA, icône sur l'écran d'accueil). Recommandation : le proposer, ne pas en faire un préalable au premier lancement.
