# Journal des décisions

**Règle** une décision prise se consigne ici le jour même, avec sa date et son motif. Ce qui n'y
figure pas n'a pas été décidé (addendum § B.8). Les points encore ouverts sont en fin de document.

---

## 2026-08-01 — Démarrage du développement

### D1. Périmètre de la première livraison : tranche verticale mince

Ni le L0 strict des specs, ni L1c complet. La première livraison traverse **toute la pile sur un
seul cas** :

socle et testabilité (`Alea`, `Horloge`, les trois fournisseurs, `window.__test`) · le moteur
**`colorie`** seul · la recoloration · **un nœud jouable de bout en bout** · la chaîne de test
complète jusqu'à `npm run verifier` sortant en code 0.

**Motif.** Le moteur `colorie` est la forme canonique du jeu (voir
[fiches-origine-analyse.md](fiches-origine-analyse.md) § 3) : le prendre en
premier fait traverser d'un coup la lecture-consigne, la validation par régions, la règle de
non-échec et la recoloration. Une tranche verticale prouve le workflow — l'objet de cette
livraison — là où L0 strict ne produirait rien de jouable.

### D2. Décors de la première livraison : SVG bouchons écrits à la main

Pas de génération ComfyUI pour l'instant. Des décors simples écrits directement en SVG, dont les
**régions fermées sont garanties par construction**.

**Motif.** Zéro dépendance, zéro attente, et surtout : on valide la *mécanique* de recoloration sans
la confondre avec la qualité du *style*. Le décor bouchon devient ensuite le cas de test permanent
de la vraie chaîne — quand ComfyUI et potrace produiront un décor, il devra se comporter exactement
comme lui.

### D3. Premier lancement en HTTP simple

Tranche le point laissé ouvert en v2 § 18.4 et addendum § B.3.4. `demarrer.bat` démarre en HTTP.
mkcert et HTTPS viendront quand la PWA et l'icône sur l'écran d'accueil compteront.

**Motif.** Sans micro, HTTPS n'est plus qu'un confort. L'installation du certificat sur la tablette
était le principal point de friction de la v1 : on ne le réintroduit pas au premier lancement.

### D4. Installations autorisées

Autorisation groupée, sans redemander paquet par paquet :

- **le socle npm** de l'annexe T § 9 et de la v2 § 13.1 (Fastify 5, React 19, Vite, Tailwind v4,
  Motion, Zustand, TanStack, dnd-kit, Vitest 3, Ajv, fast-check, Playwright, lefthook, ESLint) ;
- **potrace**, pour la vectorisation ;
- **faster-whisper**, pour le contrôle qualité voix.

Toute dépendance **hors de cette liste** se propose et s'attend.

### D5. Fournisseur LLM : llama.cpp local

Tranche le point v2 § 18.2 et addendum § B.3.2. **llama.cpp est déjà installé avec ses modèles**
(`D:\Projet_perso\llama`, port 8001, API compatible OpenAI), serveur à lancer au besoin. Ollama
n'apporterait qu'une couche de gestion par-dessus ce qui existe déjà.

### D6. Contrôle qualité voix : faster-whisper large-v3

Le motif est déjà éprouvé sur cette machine dans le projet GaladrielCompanionApp :
`WhisperModel(nom, device="auto", compute_type="auto")` avec repli CPU/int8 sur échec de chargement
CUDA, modèle `large-v3`, langue `fr`. À reprendre tel quel pour l'ASR inverse de l'annexe P § 4.4,
au lot L2.

### D7. Le design des personnages passe par une validation explicite

Aucune fiche de personnage — Gobi, Filou, Bulle, Roc, Plume — n'est figée, ni transformée en LoRA,
sans validation. C'est un durcissement de la boucle de relecture parent de l'annexe P § 6.3,
appliqué en amont : la validation porte sur le design, avant la production de masse qui en dépend.

### D8. Modèles d'image : modèles de base uniquement

Les LoRA présentes sur l'installation ComfyUI servent un autre projet et ne concernent pas
celui-ci. Les workflows figés n'utilisent que les **modèles de base**. La liste blanche de
`production/workflows/*.api.json` reste la garantie mécanique de ce point.

### D9. Le dépôt est auto-contenu — aucune installation hors du dossier

**Règle** : on clone, on lance, ça marche. Rien ne s'installe ailleurs que dans le dossier du
projet, jamais.

| Poste | Où ça vit |
|---|---|
| Dépendances npm | `node_modules/` local, **jamais `npm install -g`** |
| Paquets Python | venv `.venv/` **à la racine du dépôt**, jamais de `pip install` global |
| Binaires tiers (potrace…) | `outils/bin/`, téléchargés par `outils/installer-outils.mjs`, ignorés par git |
| Lancement | `demarrer.bat` à la racine, Node natif, HTTP |
| Base de données | `donnees/`, ignoré par git |

**Motif.** Le dépôt doit partir sur git et se réinstaller ailleurs sans reconstituer un
environnement à la main. Une dépendance installée globalement est une dépendance invisible : elle
marche sur la machine où elle a été posée, et nulle part ailleurs. C'est aussi ce qui rend une
campagne d'agents reproductible.

**Restent extérieurs, et c'est assumé** : ComfyUI et llama.cpp sont des **services** installés sur
la machine, pas des dépendances du projet. Le dépôt ne les embarque pas — il porte seulement les
scripts qui les pilotent, et doit se comporter correctement quand ils sont absents.

### D10. Campagnes multi-agents — contrat gelé avant implantation parallèle

Le développement est mené par lots d'agents parallèles. L'ordre est non négociable :

1. **Un agent gèle le contrat** sur disque (`Docs/contrat-technique-v1.md`) : arborescence
   complète, propriétaire de chaque fichier, code exact des interfaces partagées.
2. **Les lots implantent en parallèle**, chacun ne possédant que ses fichiers. Un seul écrivain par
   fichier, toujours.
3. **Revue mécanique + revue adverse**, puis **l'orchestrateur compile** — jeton unique, aucun agent
   ne compile ni n'installe.

**Motif.** Un contrat gelé n'oblige personne tant qu'un fichier n'est pas nommé pour chaque
morceau : sans propriétaire explicite, un symbole déclaré n'est écrit par personne et le lot ne
compile plus. Le plan partagé s'écrit **une fois sur disque** et on donne son chemin aux agents —
le recopier dans N briefs, c'est N occasions de le déformer.

### D11. L'ingestion passe devant la génération d'assets — clôt le point ouvert O8

L'ordre des lots de la v2 § 15 est modifié : **l'ingestion des 105 fiches (ex-L3) passe devant la
production d'assets générés (ex-L1a et L1b)**.

**Motif.** Trois raisons convergentes, aucune n'étant l'indisponibilité de ComfyUI :

1. Les illustrations des fiches sont **déjà du trait noir sur blanc à régions fermées** — le format
   exact que la chaîne ComfyUI s'efforce de produire (annexe P § 2). Générer avant d'avoir ingéré,
   c'est fabriquer ce qu'on possède.
2. Les **40 à 60 références de style** que l'annexe P § 3.3 demandait de dessiner à la main pour
   entraîner la LoRA **existent déjà** : ce sont ces illustrations. Elles fixent le style cible et
   fourniront le corpus d'entraînement, dans le style que l'enfant connaît.
3. Le volume graphique était le **risque n° 3** de la v2. Il tombe : 105 scènes exploitables
   immédiatement.

**Circonstance aggravante, pas cause** : ComfyUI est hors service depuis le 2026-08-01. Cela
confirme la décision sans la fonder — elle tiendrait même si ComfyUI fonctionnait.

### D12. Commits au fil de l'eau sur `main`

Les commits se font au fil de l'eau, sans validation préalable message par message. Messages en
français. La relecture porte sur le résultat, pas sur chaque incrément — le dépôt est solo et
l'historique git rend tout réversible.

### D13. `p_devinette` par mode de réponse — clôt le point ouvert O2

Ajoute au BKT de la v2 § 12.2 le quatrième paramètre canonique, qui y manquait. Il est fixé **par
mode de réponse**, jamais globalement :

| Mode de réponse | `p_devinette` | Justification |
|---|---|---|
| Vrai / faux | **0,50** | Une chance sur deux au hasard. Le format dominant des niveaux 1 à 3 du corpus |
| QCM 3 options | **0,33** | Niveaux 3 et 4 |
| QCM 4 options | **0,25** | |
| Placement (`place`) | **0,05** | Plusieurs régions cibles plausibles, mais le hasard aboutit rarement |
| Coloriage à consigne (`regions`) | **0,02** | Il faut trouver la bonne région *et* la bonne couleur |
| Saisie, complétion | **0,01** | Quasi nul |
| Ordre, appariement | **1 / n!** | Calculé depuis le nombre d'éléments |

**Deux règles qui en découlent, et qui comptent autant que les valeurs :**

- **Un item à forte devinette ne suffit jamais seul à établir une maîtrise.** Le critère d'acquis
  (`p ≥ 0,90` sur ≥ 5 tentatives réparties sur 3 jours, v2 § 12.2) exige en plus **au moins deux
  tentatives à `p_devinette ≤ 0,10`**. Sans cette clause, une série de vrai/faux chanceux fait
  franchir le seuil.
- Ces valeurs sont des **paramètres déclarés en données**, pas des constantes dans le code : elles
  seront recalibrées sur les tentatives réelles, et le test de rejeu doit rendre visible tout
  changement.

**Motif.** Sans ce paramètre, une série de vrai/faux répondus au hasard fait *monter* la maîtrise
estimée, et le sélecteur cesse de proposer une compétence non acquise. C'est nommément la
« régression pédagogique silencieuse » que l'annexe T § 1 désigne comme le premier risque du projet
— et le corpus réel l'aggrave, puisque le vrai/faux y est majoritaire.

### D14. Niveau réel de l'enfant : il déchiffre encore

**Le niveau 1 du corpus (CP) est son niveau.** Il lit mot à mot ; une phrase courte lui demande un
effort.

**Conséquences, dans l'ordre d'importance :**

1. **Le moteur `colorie` est confirmé comme investissement principal**, et le moteur `place`
   (point O6) passe juste derrière — ensemble ils couvrent les 79 consignes d'action du niveau 1.
2. **Les 90 fiches des niveaux 2 à 7 ne sont pas le contenu utile aujourd'hui.** Elles supposent le
   déchiffrage acquis. Elles restent précieuses — comme réserve, et comme corpus de style — mais
   l'ingestion doit commencer par le niveau 1 et ne pas se disperser.
3. **Le corpus ne couvre PAS la progression phonologique des specs** — voir O10 ci-dessous, c'est le
   point le plus important ouvert par cette réponse.

### D15. Geste de coloriage : tap par défaut, frottement en option

En exercice, on **choisit une couleur puis on tape une région** : remplissage instantané avec le
balayage radial de 900 ms. Le **frottement au doigt** reste disponible dans le chaudron de
coloriage libre du campement.

**Motif.** Le tap est conforme à R16 (aucune coordination fine exigée), il est rapide, parfaitement
validable, et c'est lui qui rend la recoloration spectaculaire. Le frottement garde sa place là où
il n'y a aucun enjeu : le plaisir du geste sans le coût de la précision.

### D16. Erreur de coloriage : la couleur se pose puis s'écoule

La couleur se dépose une fraction de seconde sur la mauvaise région, puis **s'écoule hors de la
zone comme de l'eau**. Aucun rouge, aucun son négatif, aucun marqueur d'échec.

**Limite connue et compensée.** Ce comportement n'indique pas où chercher la bonne réponse — c'était
l'objection à ce choix. Elle est levée par la gradation d'aide déjà prévue en v2 § 5.4, qui devient
ici **obligatoire et non optionnelle** :

| Essai | Ce qui se passe |
|---|---|
| 1er | La couleur se pose et s'écoule. Rien d'autre |
| 2e | Gobi intervient sans être appelé : il **relit la consigne à voix haute** et surligne le groupe nominal qui désigne la cible |
| 3e | La bonne région s'anime doucement ; l'enfant valide lui-même et repart avec une réussite |

Sans cette gradation, le choix D16 laisserait un enfant qui déchiffre encore (D14) sans issue.

### D17. Modèle multi-profils dès la v1, un seul profil utilisé

La table `profils`, la progression par profil et les variantes de palette existent dans le schéma
dès maintenant ; l'étanchéité stricte entre profils (v2 § 11) n'est pas encore exercée en pratique.

**Motif.** Rendre le modèle multi-profils coûte peu maintenant et très cher à rattraper : toute la
progression, la carte et les collections sont indexées par profil. Aucun écran de gestion de
fratrie n'est développé tant qu'il n'y a pas de second enfant.

### D18. Profil de lecteur réel — et ce qu'il commande

**Fin de CP. Confusions de lettres. Lecture lente avec des erreurs.** C'est le point de départ réel,
et il prime sur toute hypothèse de niveau tirée de l'âge.

Trois conséquences qui changent des priorités :

1. **Les confusions de lettres ont une région dédiée dans les specs** — Les Galeries, `b/d/p/q` et
   sons proches (v2 § 3.3). Elles étaient prévues en **deuxième** région. À la lumière de D18,
   elles remontent : c'est un besoin actuel, pas futur. Combiné à O10 (aucun matériau phonologique
   dans le corpus), c'est le contenu à produire en premier.
2. **La lenteur est une donnée à suivre, pas un défaut à corriger de front.** La latence de
   reconnaissance est déjà l'indicateur de fluence retenu par la v2 § 12.3. Elle devient
   l'indicateur principal du dashboard parent, dès la v1.
3. **Les réglages typographiques passent en priorité v1**, au lieu d'attendre un lot ultérieur.
   Voir D19.

### D19. Typographie de lecture : réglages en v1, et mesure plutôt que croyance

Les specs prévoyaient déjà (v2 § 9.3) cinq polices embarquées localement — **Andika** par défaut,
**OpenDyslexic**, **Luciole**, **Belle Allure**, **Verdana** — et des réglages par profil : corps
16-40 px, interlettrage, espacement des mots, interligne, coloration syllabique alternée,
surlignage de la ligne courante, règle de lecture. **Tout cela est livré en v1**, pas plus tard.

**Ce que dit l'état des connaissances — vérifié, sources à l'appui :**

*Sur OpenDyslexic.* L'étude contrôlée de référence (Wery & Diliberto, *Annals of Dyslexia*, 2017 —
protocole à traitements alternés, élèves du primaire diagnostiqués dyslexiques, comparaison avec
Arial et Times New Roman sur dénomination de lettres, lecture de mots et de pseudo-mots) conclut à
**aucune amélioration** de la vitesse ni de la précision, ni individuellement ni pour le groupe.
Certaines analyses relèvent même une **dégradation** face à Arial et Times New Roman. Détail
notable : **aucun participant n'a déclaré préférer** cette police. Le tableau global reste
contradictoire — un travail sur adultes dyslexiques (Franzen, *Annals of Eye Science*) rapporte un
bénéfice — mais la dominante chez l'enfant est nette : pas d'effet.

*Sur l'espacement.* Zorzi et al., *PNAS*, 2012 : un interlettrage augmenté de 2,5 pt (~0,88 mm)
donne une lecture **20 % plus rapide** et **deux fois moins d'erreurs**, **sans entraînement
préalable**. Mécanisme proposé : les lecteurs en difficulté sont particulièrement sensibles à
l'**encombrement perceptif** (*crowding*), que l'espacement réduit.

*La nuance qui commande la conception.* Un espacement large **dégrade** la vitesse des **lecteurs
rapides** (Frontiers in Psychology, 2020). L'espacement n'est donc pas un réglage à monter par
défaut : c'est un réglage **par profil**, à mesurer — et à redescendre à mesure qu'il progresse.

*Limite honnête.* Cette littérature porte sur des lecteurs **diagnostiqués dyslexiques**. L'enfant
ne l'est pas : il sort du CP, lit lentement et se trompe (D18). Le mécanisme du *crowding* concerne
aussi les lecteurs débutants, mais **la transposition reste une hypothèse**, pas un acquis. Raison
de plus pour mesurer sur lui plutôt que d'appliquer une moyenne.

**Sources** :
[Wery & Diliberto 2017 (PubMed)](https://pubmed.ncbi.nlm.nih.gov/26993270/) ·
[texte intégral](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5629233/) ·
[Zorzi et al. 2012, PNAS (PubMed)](https://pubmed.ncbi.nlm.nih.gov/22665803/) ·
[Interletter spacing and dyslexia (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3497831/) ·
[Wider Letter-Spacing… Impairs Reading Rates of Fast Readers (Frontiers, 2020)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.00444/full)

**Conclusion opérationnelle, sans dogmatisme** : on embarque OpenDyslexic — la préférence subjective
d'un enfant compte pour son adhésion, et c'est gratuit. Mais on ne la présente pas comme un remède,
et on soigne **au moins autant les réglages d'espacement**, qui sont probablement le vrai levier.

**Et surtout : on mesure.** C'est l'avantage décisif de cette application sur une fiche papier.
Protocole, à câbler dès que la latence est journalisée :

- même compétence, même type d'item, **police alternée d'une session à l'autre** ;
- comparer les **latences de reconnaissance** et les taux d'erreur par police et par réglage
  d'espacement ;
- l'enfant ne voit jamais qu'on compare ; le parent voit les courbes.

Au bout de quelques semaines, on saura ce qui marche **pour lui** — ce qu'aucune étude générale ne
peut dire. C'est le seul verdict qui compte ici.

### D20. Gobi — amende la v2 § 4.2

**Le design des specs est abandonné.** « Petite créature ronde, deux grands yeux, pas de bras » est
trop pauvre : les specs se contredisaient elles-mêmes, puisqu'elles posent qu'« à 7 ans, on veut
être un héros, pas un élève mignon ».

**Direction retenue** : créature ronde et douce **à structure cristalline**, croisement des
directions « minérale » et « animale ». Fiche complète et déclinaisons dans
[fiche-personnage-gobi.md](fiche-personnage-gobi.md).

**Références données par l'utilisateur** : Baymax, le Boursouf de Hogwarts Legacy, et les cristaux
— que l'enfant adore. Conformément à l'annexe P § 3.3, elles sont traduites en **principes de
conception** et ne sont **jamais nommées dans un prompt** ni visées comme cible visuelle. Les
principes extraits sont : silhouette d'un seul tenant reconnaissable en ombre chinoise · aucun angle
agressif · matière dont on devine le toucher à l'œil · rondeur rassurante contrastée par la dureté
du cristal.

**Le cristal porte les 25 déclinaisons** (une par graphème maîtrisé) : c'est lui qui change de
forme, de couleur et de croissance, pas le corps. C'est ce qui rend la collection lisible et la
production cohérente.

### D21. Technologies web — au maximum de ce que permet 2026

**Décision de l'utilisateur, développeur C++ :** ce projet sert aussi à démontrer l'état de l'art
du web. On ne se limite pas.

Cela **amende explicitement** la v2 § 13.1 (« pas de moteur de jeu : le DOM suffit »). Le DOM reste
la structure de l'interface et des zones de lecture ; le **rendu du jeu** peut aller jusqu'à WebGPU.

Deux garde-fous, non négociables car ils protègent l'enfant et non le code :

1. **Le repli est obligatoire.** Tout effet avancé dégrade proprement : si WebGPU est absent ou trop
   lent, le jeu reste intégralement jouable en SVG/CSS. La cible de 60 fps sur Galaxy Tab S10 FE
   n'est pas négociable, l'effet l'est.
2. **`prefers-reduced-motion` et le réglage « animations calmes » suppriment le décoratif** et
   gardent le fonctionnel, quelle que soit la technologie employée.

### D22. Temps réel par défaut, vidéo par exception

**Règle d'arbitrage donnée par l'utilisateur** : *si c'est faisable en temps réel et que c'est plus
beau et plus interactif, ce ne doit pas être une vidéo.*

| Poste | Arbitrage |
|---|---|
| Boucles d'ambiance | **Temps réel.** Eau, feuillage, lucioles, fumée : shaders et calques SVG animés. Plus net, plus léger, réactif à l'état de recoloration |
| Cycles d'animation des compagnons | **Temps réel**, à partir de poses générées puis vectorisées. Gobi doit réagir, pas jouer un film |
| Cinématiques de fin de région | **Temps réel de préférence** — c'est **le décor réel de l'enfant** qui reprend ses couleurs, pas une séquence générique. Zéro Mo, personnalisé, impossible à obtenir en vidéo. Repli WebM VP9 si le rendu déçoit |
| Intro et écran d'accueil | **Vidéo acceptable** : vue une fois, sautable, aucun état à refléter |

La règle de l'addendum § A.1 tient toujours et se trouve renforcée : **aucune vidéo dans la boucle
courte** d'un mini-jeu.

### D23. Confusions de lettres miroir — ce que la conception en fait

**Fait rapporté** : l'enfant confond `b`/`p` et d'autres lettres miroir, en fin de CP. Aucun
diagnostic posé, aucun bilan réalisé.

**Ce que dit la littérature, vérifié :**

- Les confusions de lettres miroir touchent **plus de 80 % des enfants en CP**. C'est une **étape
  normale** de la spécialisation cérébrale, le temps que le cerveau construise une reconnaissance
  des lettres **sensible à l'orientation** — capacité que la vision n'a aucune raison d'avoir
  développée avant, puisqu'un objet reste le même objet retourné.
- Elles sont considérées comme développementalement typiques **jusque vers 7-8 ans**.
- **Les inversions ne sont pas en soi un marqueur de dyslexie** : la dyslexie est d'abord un trouble
  du traitement **phonologique**, pas visuel.
- Signal méritant un avis : persistance nette **au-delà de 8 ans**, ou **association** à une lecture
  lente et à une orthographe faible, ou apparition d'une aversion pour la lecture.
- **La pratique du geste d'écriture accélère l'apprentissage de la lecture.** C'est le levier le
  plus directement exploitable ici.

**Position retenue** : rien de ce qui est décrit ne sort de la fenêtre attendue. La **combinaison**
inversions + lecture lente (D18) mérite d'être **suivie dans le temps** — ni alarme, ni déni. Un
bilan orthophonique n'est ni urgent ni absurde ; c'est un orthophoniste qui tranche, pas cette
application.

**Trois conséquences de conception :**

1. **Distinguer les AXES de confusion, jamais traiter « b/d/p/q » en bloc.** Ce sont deux mécanismes
   différents : `b`↔`d` et `p`↔`q` sont des miroirs **gauche-droite** ; `b`↔`p` et `d`↔`q` sont des
   miroirs **haut-bas**. Un enfant peut être gêné par un axe et pas par l'autre. Le contenu des
   Galeries et le suivi doivent les séparer.
2. **Ajouter le tracé au doigt** au catalogue des moteurs. Le moteur `grave` des specs (v2 § 7) ne
   fait que compléter un mot lettre par lettre : il n'y a **aucun geste d'écriture** dans les douze
   moteurs, alors que c'est précisément ce qui accélère la discrimination des lettres miroir.
   Nouveau point ouvert **O11**.
3. **Le « Top 10 des confusions » du dashboard (v2 § 14) devient une pièce centrale, pas un
   ornement.** L'application peut mesurer ce qu'aucune observation parentale ne capte : quelle
   paire, dans quel sens, à quelle fréquence, avec quelle latence, et **si la courbe descend**.
   C'est aussi ce qui donnerait, le jour venu, une donnée réelle à un orthophoniste plutôt qu'un
   souvenir.

**Sources** :
[Confusions b/d/p/q en CP — étape normale ou dyslexie (Upbility)](https://upbility.fr/blogs/news/mon-enfant-confond-les-lettres-b-d-p-et-q-en-cp-dyslexie-ou-etape-normale-du-developpement) ·
[Allo-Ortho — orthophonistes](https://www.allo-ortho.com/est-ce-normal-que-ma-fille-confonde-le-b-et-le-d-en-cp/) ·
[Ne plus confondre b d p q en GS/CP (Éducation nationale, ac-normandie)](https://prim27.ac-normandie.fr/IMG/pdf/ne_plus_confondre_b_d_p_q_en_gs_ou_et_au_cp_version_2.pdf) ·
[Understood — FAQ sur les inversions de lettres](https://www.understood.org/en/articles/faqs-about-reversing-letters-writing-letters-backwards-and-dyslexia) ·
[The Dyslexia Classroom — lien entre inversions et dyslexie](https://www.thedyslexiaclassroom.com/blog/is-there-a-link-between-reversals-and-dyslexia)

### D24. Gobi a des bras — amende la v2 § 4.2

La contrainte « pas de bras » est levée. Sans bras : aucune posture d'aventure, rien à porter, rien
à montrer, rien à offrir. Elle était cohérente avec le design « boule » abandonné en D20 ; elle ne
l'est plus avec un compagnon qui **guide**.

Gobi a **deux bras courts et robustes**, avec des mains simples. Coût assumé : les 25 déclinaisons
et les 5 états d'animation deviennent un peu plus lourds à produire. Bénéfice : il peut montrer le
chemin, tendre un cristal, applaudir — c'est-à-dire **jouer son rôle**.

### D25. La cascade de récompenses — reprendre ce qui marche déjà sur lui

**Fait rapporté, et c'est la donnée la plus exploitable du projet :** à l'école, un exercice réussi
donne **une étoile** ; cinq étoiles donnent **un tampon spécial** ; dix tampons donnent **une
image**. Ce système le motive réellement.

**Ce que ça nous apprend, et qui vaut mieux que n'importe quelle théorie :**

1. **La cascade à trois paliers fonctionne sur lui.** Fréquent → intermédiaire → rare. Les quatre
   monnaies de la v2 § 6.1 doivent s'y aligner explicitement plutôt que de coexister à plat :

   | Palier | École | Le jeu |
   |---|---|---|
   | Fréquent, à chaque réussite | étoile | **Étoile** de nœud (v2 § 6.2) |
   | Intermédiaire, tous les ~5 | tampon spécial | **Forme de Gobi** ou objet de campement |
   | Rare et désirable, tous les ~10 | image | **Éclat de Pierre** et recoloration d'une zone |

2. **Il faut que le palier rare soit une IMAGE, ou son équivalent.** À l'école c'est une image qu'on
   emporte. Dans le jeu, l'équivalent naturel est **une portion de monde qui reprend ses
   couleurs** — quelque chose qu'il peut montrer. Cela confirme la mécanique signature comme la
   récompense de haut palier, pas comme un simple effet.

3. **La progression doit être VISIBLE avant d'être atteinte.** Trois étoiles sur cinq, sept tampons
   sur dix : ce qui motive, c'est de voir la case suivante vide. Toute jauge de palier doit montrer
   le reste à parcourir, jamais seulement l'acquis.

**Nuance sur l'effet de surjustification (D19 et suivants).** Il ne s'agit pas d'introduire des
récompenses là où il n'y en avait pas : il est **déjà** dans un système qui le motive. On capitalise
sur une mécanique éprouvée sur lui. Les garde-fous restent : ne jamais récompenser le **temps
passé**, uniquement ce qui est appris ; et garder la recoloration comme conséquence de l'action,
non comme monnaie d'échange.

### D26. Le retour sensoriel est une exigence, pas une finition

**Fait rapporté** : « il faut de la nourriture pour lui donner envie, des particules qui bougent
quand c'est bon, et aussi la vibration ». Et surtout : **« c'est parce qu'il lit, donc c'est
cool »**.

Cette dernière phrase est la formulation la plus juste du projet entier, et devrait être son
critère de conception : *le spectaculaire est déclenché par l'acte de lire*. Ce n'est pas une
récompense collée à côté de la lecture — c'est la lecture qui fait le spectacle.

Le game feel de la v2 § 8 cesse d'être une section de finition et devient **une exigence de la
première livraison** :

- particules à chaque bonne réponse (≤ 14, v2 § 8) ;
- **vibration 20 ms** sur dépôt correct — l'API Vibration est disponible sur la tablette ;
- son court à **hauteur montante selon la série en cours** — les specs le désignent déjà comme
  « le détail le plus rentable de toute la liste » ;
- aimantation sur les 24 derniers pixels, `overshoot` de 8 % ;
- réponse visible en **moins de 100 ms** sur tout appui.

Le tout dégradé proprement par `prefers-reduced-motion` et le réglage « animations calmes ».

### D27. Registre de personnage : caractère n'est pas dureté

Deux séries de propositions ont raté la cible en sens inverse, ce qui donne la définition la plus
précise du registre visé :

| Série | Résultat | Diagnostic |
|---|---|---|
| 01 | Yeux kawaii géants, joues roses, bouche minuscule | **Trop bébé.** Contredit « à 7 ans on veut être un héros » (v2 § 2) |
| 02 | Regard en coin, sourcils froncés, sourire narquois | **Trop antagoniste.** Contredit « pas de vilain, pas de menace, pas de peur » (v2 § 3.1) et « grand frère bienveillant, jamais le maître » (v2 § 2) |

**Le registre est entre les deux, et il a un nom : l'énergie complice.** Les références de l'enfant
le montrent — dans les jeux d'aventure qu'il pratique, les personnages secondaires marquants sont
enthousiastes et chaleureux, pas menaçants. À 7 ans, ce qui est « cool », c'est **l'énergie et la
complicité**, pas le regard en coin.

Traduction en règles de dessin, opposables aux prochaines générations :

- **Sourcils relevés**, jamais froncés — c'est le sourcil qui décide de tout ;
- **yeux ouverts, pupille nette**, ni mi-clos ni géants ;
- **sourire franc et ouvert**, jamais en coin ;
- **posture ouverte et tournée vers l'enfant** — il montre, il tend, il accueille ; il ne toise pas
  et ne rôde pas.

**Base retenue** : la proposition 06 (corps rond, bras, besace, crête de cristaux) pour la
structure, le dynamisme de la 08 pour la posture, l'expression entièrement refaite.

### D28. Gobi évolue comme un tamagotchi — et ça réconcilie tous les essais ratés

**Idée de l'utilisateur, et c'est la meilleure du chantier :** garder la boule de la première série,
et **la faire évoluer** au fil des progrès.

**Pourquoi c'est la bonne réponse, et pas un compromis :**

1. **Les cinq séries cessent d'être des échecs et deviennent des STADES.** La boule ronde n'était pas
   ratée : c'est le **stade 1**. Le compagnon plus structuré, plus équipé, plus héroïque est le
   stade final. Ce qui paraissait une oscillation entre « trop bébé » et « trop héros » était en
   réalité les deux extrémités d'un axe d'évolution.
2. **Ça s'emboîte exactement dans le système de copie** déjà prévu (v2 § 4.2) : chaque graphème
   maîtrisé donne une forme de Gobi. On passe de 25 variantes à plat à une **progression** — et une
   progression se montre, se désire, et s'attend.
3. **Ça épouse la cascade de récompenses de l'école** (D25) : les formes de Gobi sont le palier
   intermédiaire, les stades d'évolution le palier rare. C'est ce qui motive déjà l'enfant, appliqué
   à son compagnon.
4. **Le lien est direct entre lire et voir grandir son compagnon** : c'est la traduction la plus
   littérale de « c'est parce qu'il lit, donc c'est cool » (D26).

**Trois questions restées ouvertes** : combien de stades · l'évolution est-elle irréversible (elle
doit l'être — un acquis n'est jamais repris, v2 § 5.4) · le stade se choisit-il ou se subit-il.

### D29. Le noir et blanc ne vaut que pour les DÉCORS, pas pour les personnages

**Distinction manquée jusqu'ici, et probable cause des cinq échecs.**

L'annexe P § 2 impose « la couleur vient du code, pas du modèle ». Ce principe existe **pour la
mécanique de recoloration** : une zone grise doit être un SVG dont les remplissages ne sont pas
encore assignés. Il est indispensable — pour les **décors**.

**Gobi n'est pas une zone à colorier.** Il ne se recolorie jamais, il n'a aucune région à révéler :
c'est un compagnon. Lui imposer le trait noir sur blanc n'apportait donc rien, et coûtait
peut-être beaucoup — hypothèse de l'utilisateur, en cours de test : les modèles de diffusion sont
entraînés massivement sur des images en couleur, et forcer l'absence de couleur dégrade sans doute
l'anatomie et l'expression.

| Type d'asset | Rendu | Motif |
|---|---|---|
| **Décors, calques de recoloration, coloriages** | Trait noir sur blanc, régions fermées | La recoloration l'exige — principe intact |
| **Personnages, compagnons, avatars, butins** | **Couleur autorisée** | Ils ne se recolorient pas. Ce qui compte est leur cohérence, pas leur coloriabilité |

À confirmer par le test empirique en cours (campagne « maîtriser ComfyUI »).

### D30. Une campagne dédiée à la maîtrise de l'outil, avant d'en produire davantage

Cinq séries de personnage ont échoué faute de méthode, pas faute de prompt : sans référence
visuelle à verrouiller, la génération texte-vers-image ne converge pas sur un design précis.
L'annexe P le disait déjà (§ 3.3 : LoRA de style ou IPAdapter avec image de référence figée) —
l'orchestrateur ne l'a pas appliqué et a brûlé cinq séries à tâtonner.

Une campagne établit donc : l'état de l'art du verrouillage de personnage · l'inventaire complet des
modèles et nœuds réellement disponibles, avec liste blanche · le test empirique noir et blanc contre
couleur · puis un **guide** (`Docs/guide-comfyui.md`), des **workflows figés**
(`production/workflows/*.api.json`) et un **skill réutilisable** (`.claude/skills/generer-asset/`).

**Leçon d'orchestration, à retenir au-delà de ce projet** : quand cinq tentatives échouent dans des
directions différentes, le problème n'est pas le paramétrage de la tentative — c'est la méthode.
Changer de prompt une sixième fois aurait coûté un sixième échec.

### D31. Le vrai diagnostic des 5 séries ratées : 20 personnages, pas 20 variantes

La campagne « maîtriser ComfyUI » a mesuré ce que l'orchestrateur avait mal diagnostiqué.

**Le fait, mesuré** : les 4 propositions d'une même série étaient **4 créatures différentes**, avec
**4 graines différentes**, et chaque série changeait en plus de modèle, de CFG, de sampler et de
résolution. Les 20 images ne sont donc pas 20 variantes d'un personnage — **ce sont 20
personnages**.

Aucune technique de cohérence n'était applicable, **parce qu'aucune ne fonctionne sans une image
canonique déjà choisie**. Les cinq séries n'ont pas échoué à tenir un personnage : elles ont fait de
l'exploration texte-vers-image et attendu d'elle une convergence qu'elle ne produit jamais.

> **C'est un problème d'ordonnancement, pas de prompt ni de modèle.**

**Deux problèmes distincts, à traiter séquentiellement :**

| | Quoi | Comment |
|---|---|---|
| **A** | Trouver **UNE** image qu'on garde | Exploration + **jugement humain**. Aucune technique de cohérence ne s'applique ici |
| **B** | La décliner en dizaines de variantes | **Là seulement** interviennent Qwen-Image-Edit, Flux Kontext, LoRA de personnage, ControlNet |

L'étape A n'est pas automatisable et n'a pas à l'être : c'est la validation D7.

### D32. Ce que la mesure a corrigé d'autre

**Mon test « noir et blanc contre couleur » était mal posé.** Mesure de saturation HSV sur les 20
images : la **série 05 n'était pas en noir et blanc du tout** — saturation moyenne de 24 à 52, et
seulement 0,6 % à 11,8 % de pixels neutres, alors que le prompt disait `black and white ink` et le
négatif `color, colored`, à CFG 6 sur un modèle qui écoute le négatif. **La consigne de non-couleur
a été purement ignorée.** L'hypothèse reste à trancher proprement — mais pas sur ces images-là.

**Inventaire corrigé** (complète [environnement-et-outillage.md](environnement-et-outillage.md)) :

- **Flux.1 Kontext dev est installé** — `flux1-dev-kontext_fp8_scaled`, plus `ReferenceLatent`,
  `FluxGuidance`, `FluxKontextImageScale`. Il n'était documenté nulle part. Réputé plus fidèle sur
  les traits du visage que Qwen-Image-Edit.
- **Qwen-Image-Edit 2511 est complet** (modèle, CLIP, VAE, LoRA Lightning 4 pas) et accepte jusqu'à
  **3 images de référence** simultanées.
- **`TrainLoraNode` est natif** : entraîner une LoRA de personnage ne demande rien à installer.
  15 à 30 images cohérentes donnent 85-92 % de cohérence inter-vues, contre 65-75 % pour prompt +
  référence.
- **IPAdapter n'est PAS installé — et ne doit pas l'être** : il est conçu pour des visages humains
  photographiques, et FaceID est inopérant sur une créature. Les 8 wrappers `easy ipadapterApply*`
  présents échoueraient à l'exécution, leur dépendance étant absente.
- **Règle de production tirée de la documentation de Black Forest Labs** : les éditions successives
  dérivent — après **six** éditions en chaîne, la dégradation est visible. Toute déclinaison repart
  donc de l'image canonique, jamais de la déclinaison précédente.

**Livrables** : `Docs/guide-comfyui.md`, `production/workflows/*.api.json` figés, et le skill
`generer-asset` — pour qu'aucune session ne refasse les cinq séries.

### D33. Le sens du tracé (ductus) est normé — le moteur `trace` doit le respecter

**Signalé par la mère de l'enfant, après essai réel : le `d` ne se trace pas dans le bon sens.**
Vérifié, elle a raison, et l'enjeu dépasse l'exactitude.

**Ce que dit la littérature de l'Éducation nationale :**

- Le **ductus** — le sens d'écriture des lettres — est un **code commun**, pas une convention libre.
- **Mal appris dès le départ, un ductus incorrect est très difficile à corriger plus tard** et peut
  bloquer durablement la vitesse d'écriture. **Le CP est l'année clé** de l'automatisation du geste.
- Les lettres cursives françaises se regroupent en **4 familles gestuelles** selon le mouvement qui
  les initie. On travaille une famille à la fois, pour automatiser le geste de base avant de passer
  à la suivante.
- Pour le **`d`** : le geste part **en haut à droite** de la lettre, **tourne dans le sens
  antihoraire** — comme pour tracer un `o` — puis remonte. La boucle vient **avant** la haste.

**Pourquoi c'est le point le plus important du retour, et pas un détail :**

`b` et `d` **n'appartiennent pas à la même famille gestuelle**. Le `b` s'initie par la boucle haute
et descendante ; le `d` par la rotation antihoraire du `o`. **C'est précisément ce geste différent
qui les distingue** — et c'est le seul levier réellement documenté contre la confusion miroir
(D23 : « la pratique du geste d'écriture accélère l'apprentissage de la lecture »).

> Un moteur de tracé qui enseigne un mauvais sens **détruit le mécanisme même** pour lequel il a été
> ajouté. Il vaudrait mieux ne pas l'avoir que l'avoir faux.

**Conséquences opposables :**

1. Le ductus de chaque lettre est une **donnée déclarée** (`contenu/referentiel/ductus-*.json`),
   avec point de départ, sens de rotation et ordre des traits — jamais dérivé de la forme.
2. **Un tracé au bon endroit mais dans le mauvais sens n'est pas une réussite.** La validation porte
   sur le geste, pas seulement sur le résultat.
3. Le guidage montre le sens : point de départ marqué, flèche de direction, tracé fantôme animé.
4. **Regrouper les lettres par famille gestuelle**, jamais par ressemblance visuelle.
5. Cette exigence prime sur le desserrage des tolérances : on assouplit la **précision** (R16 —
   aucune coordination fine), jamais le **sens**.

**Source** :
[Le geste d'écriture et la copie — Éduscol](https://eduscol.education.fr/document/14380/download) ·
[L'écriture à l'école maternelle — Éduscol](https://eduscol.education.gouv.fr/sites/default/files/document/ressc1ecritureforme-lettres456435pdf-74256.pdf) ·
[Le ductus, code d'écriture cursive](https://lutinsdematernelle.over-blog.com/2017/06/ecriture-cursive-le-code-ou-ductus.html) ·
[Progression écriture cursive CP (ac-dijon)](https://circo89-avallon.ac-dijon.fr/IMG/pdf/progression_ecriture_cp_beaune.pdf)

**Note d'orchestration** : la campagne « retour utilisateur 1 » était déjà en vol quand ce point est
arrivé. Son lot C2 desserre les tolérances **sans connaître le ductus** — son résultat devra donc
être repris, pas rejeté : le desserrage reste juste, le sens est à ajouter.

### D34. Un mode « parent testeur » — accès à tous les exercices depuis la zone parent

**Demandé après essai réel, en tant que testeur ET parent.**

Le crochet `window.__test` existe déjà mais il est **absent du bundle de production** (annexe T
§ 8.3), et il doit le rester : « un enfant curieux finira par trouver `allerAuNoeud` — et
honnêtement, il aura raison d'essayer ».

La réponse n'est donc pas de le rouvrir, mais d'ajouter une **galerie d'exercices dans la zone
parent**, déjà protégée par code à 4 chiffres :

- **tout exercice du catalogue est lançable directement**, quel que soit l'état de progression ;
- **rien de ce qui s'y joue n'est journalisé** dans `tentatives` — sinon un parent qui teste fausse
  les statistiques de l'enfant, et le journal cesse de faire foi ;
- chaque exercice s'accompagne de son moteur, son habillage, ses compétences et son état de
  validation, pour servir aussi d'**écran de relecture** (annexe P § 6.3) ;
- l'entrée est **invisible depuis l'espace enfant**.

Bénéfice au-delà du confort : c'est ce qui rend R12 et R13 vérifiables **à l'œil** — trois moteurs
par compétence, trois habillages par moteur — au lieu de reposer uniquement sur un test.

### D35. Il manque la séquence d'ouverture — « le monde t'attend en gris » n'est pas une promesse

**Constaté à l'essai** : *« je n'ai pas compris la phrase "le monde t'attend en gris", c'est pas
joyeux pour l'instant, mais il manque la séquence d'intro sûrement »*. Diagnostic exact.

Sans le récit qui la précède, cette phrase énonce une **perte**. Avec lui, elle énonce une
**mission** : la Pierre s'est brisée, les noms s'effacent, ce qui n'a plus de nom perd ses
couleurs — *et toi, tu sais encore lire les noms, alors les habitants t'attendent* (v2 § 3.1).
C'est exactement le même fait, retourné de l'absence vers le pouvoir d'agir.

**Conséquences :**

1. **Une séquence d'ouverture est nécessaire, pas décorative.** Elle porte le sens de tout le
   mécanisme de recoloration : sans elle, le gris est une tristesse ; avec elle, c'est un travail
   qui attend l'enfant.
2. **Toute formulation est relue sous cet angle** : le jeu ne dit jamais ce qui manque, il dit
   toujours ce que l'enfant peut rendre. Jamais « le monde est gris », toujours « tu peux lui
   rendre ses couleurs ». C'est la même règle que la non-punition de l'erreur (R14), appliquée au
   texte.
3. Elle est **passable au tap** dès la première seconde, et **rejouable** depuis le campement — un
   enfant qui n'a pas suivi la première fois doit pouvoir y revenir seul.
4. C'est le poste où une vidéo générée se justifie (D22 : vue une fois, sautable, aucun état à
   refléter).

### D36. Gobi — forme canonique validée. Clôt l'étape A de D31.

**L'utilisateur a fourni deux images de référence et tranché : « un mélange des 2, en couleur
c'est bien ».** C'est le jugement humain que D31 désignait comme non automatisable, et il débloque
toute la production d'assets.

**Ce que les deux références portent en commun** — et qui est désormais le canon :

| Élément | Description |
|---|---|
| **Corps** | Une sphère duveteuse, contour dentelé qui donne le pelage à l'œil. Aucun angle sur la chair |
| **Crête** | 5 à 7 **cristaux facettés** de tailles inégales, plantés sur le crâne comme une couronne |
| **Yeux** | Grands, ronds, très sombres, deux reflets. Sourcils **fins et arqués** — c'est eux qui donnent la douceur |
| **Bras** | Deux, courts, arrondis, **levés et ouverts** — posture d'accueil (conforme à D24) |
| **Pieds** | Deux, petits, sous le corps |
| **Joues** | Rondes et colorées |

**Ce que chaque référence apporte en propre, et qu'il faut fusionner :**

- **Référence 1** (corps crème) : la **matière duveteuse** très lisible, la bouche ouverte avec deux
  petites dents, l'énergie joyeuse. Cristaux froids — bleus, violets, rose.
- **Référence 2** (corps mauve) : le **cœur de Pierre**, une étoile-cristal jaune **lumineuse** au
  centre du ventre qui rayonne — c'est l'élément narratif qui manquait à la première. Sourire fermé,
  plus doux. Cristaux chauds — verts, jaunes.

**La fusion retenue** : le corps et l'expression joyeuse de la référence 1, **plus le cœur de Pierre
rayonnant** de la référence 2. Le cœur n'est pas décoratif : c'est le lien à la Pierre brisée, et la
seule source lumineuse autorisée sur le personnage.

**Ce que cela confirme :**

1. **La couleur est validée pour les personnages** — D29 tenait. Le trait noir sur blanc ne
   concerne que les décors, parce qu'eux se recolorient.
2. **Le registre est tranché** : rond, doux, chaleureux, expressif. Les séries 4 et 5 (héros
   élancé, super-héros) sont abandonnées.
3. **Le cristal porte les déclinaisons**, comme prévu — sa forme et sa couleur changent par
   graphème maîtrisé, le corps jamais. Les 25 formes et les 5 stades (D28) se construisent dessus.

**Étape B, maintenant possible** : verrouiller cette image et la décliner par Qwen-Image-Edit ou
Flux Kontext (D32). Rappel de la règle : **toute déclinaison repart de l'image canonique**, jamais
de la déclinaison précédente — après six éditions en chaîne, la dégradation est visible.

**Prérequis matériel** : les deux références doivent être déposées sur disque dans
`production/personnages/gobi/reference/`. Sans fichier, aucun verrouillage n'est possible.

### D37 à D40 — arbitrages du 2026-08-02

**D37. Le nuancier de 11 couleurs est validé.** Rouge, orange, jaune, vert, bleu, violet, rose,
brun, noir, blanc, gris — les godets que l'enfant tape. Il couvre toutes les consignes des fiches
d'origine sans exception. **La palette d'interface (7 jetons, v2 § 9.2) reste intacte** : ce sont
deux choses distinctes, l'une habille le jeu, l'autre sert à colorier. Clôt l'addition non validée
signalée par le contrat v1.

**D38. Les deux régions sont ouvertes d'emblée.** Amende la v2 § 3.3, qui n'ouvrait deux régions en
parallèle qu'à partir de la troisième. Motif : l'enfant déchiffre encore (D14) et **les Galeries
travaillent précisément les confusions `b`/`d`/`p`/`q` dont il a besoin maintenant** (D23) ;
l'attendre serait lui refuser le contenu le plus utile. Second motif, du père : « il faut qu'il
puisse changer de type d'exercice et voir la suite » — l'autonomie du choix est elle-même un moteur
de motivation.

**D39. Les captures visuelles de référence attendent le nouveau graphisme.** Le décor est en cours
de réécriture et Gobi va être refait : figer des références maintenant serait les refaire aussitôt.
**`test:visuel` reste donc rouge, et c'est déclaré comme tel** — la chaîne dit la vérité plutôt que
d'être verte à bon compte. Aucune référence n'est figée sans validation humaine (annexe T § 6).

**D40. Le nom « La Pierre des Mots » est conservé.** Clôt le point ouvert O1. Il n'est plus un titre
de travail.

### D41 à D44 — second lot d'arbitrages, 2026-08-02

**D41. Voix entièrement synthétiques.** Sept locuteurs produits par Chatterbox ou XTTS-v2 (à
installer, autorisation à demander). **Aucun enregistrement familial** — écarte la suggestion de
l'annexe P § 4.2. Conséquence assumée : on perd le levier de la voix familière, que l'annexe
décrivait comme « sans commune mesure » ; la porte reste ouverte, cloner une voix plus tard ne
change aucune interface.

**D42. Le bouton « écouter » est masqué tant qu'aucun audio n'existe** pour la consigne. Rien ne
ment, rien ne déçoit — un bouton qui ne répond pas casse la confiance plus sûrement qu'un bouton
absent. **Conséquence à ne pas oublier : R15 reste visiblement non satisfaite**, et l'enfant n'a
aucune aide à la lecture d'ici la livraison des voix. Cela **remonte la priorité du lot voix** : ce
n'est plus une dette confortable, c'est un manque que rien ne compense.

**D43. Gobi évolue en 8 à 10 stades, à petits pas.** Chaque stade est un changement discret — un
cristal de plus, une teinte qui glisse. Progression très fréquente et toujours visible, au prix
d'aucun moment spectaculaire. Remplace le placeholder à 5 stades. L'évolution reste
**irréversible** (un acquis n'est jamais repris) et **portée par le cristal**, jamais par le corps
(D28, D36).

**D44. Les formes de Gobi se collectionnent sur une étagère à cases vides.** Comme un album de
vignettes : les emplacements non gagnés sont **en creux et visibles**. C'est exactement le principe
retenu en D25 — *ce qui motive, c'est de voir la case suivante encore vide*. Le père n'avait pas
compris les formes du campement : le remède n'est pas graphique, c'est de montrer le manque.

### D45. Le campement est conservé tel quel — le pari d'Adibou est maintenu

L'orchestrateur proposait de le supprimer au profit de la carte, jugeant l'incompréhension du père
comme un verdict de conception. **Arbitrage contraire, et il fait autorité** : le hub reste
central, avec ses 25 points d'interaction gratuits (R11) et ses 30 objets qui réagissent au
toucher.

**Le motif retenu** : l'incompréhension vient des **assets bouchons**, pas du concept. Un campement
peuplé de rectangles gris n'est pas un lieu — c'est un menu déguisé. Le juger avant que le
graphisme n'existe, c'était juger la mauvaise chose.

**À rejuger une fois le graphisme refait**, et pas avant : si le père ne le comprend toujours pas
avec de vrais décors, alors seulement la question de conception se posera.

### D46. La durée d'une session est variable — le jeu doit être bon en 5 minutes comme en 30

*« Ça dépendra de son envie »*. Ce n'est pas une non-réponse, c'est une contrainte de conception, et
elle **réconcilie D45 avec le risque qu'il portait** :

1. **Le campement n'est JAMAIS sur le chemin obligatoire vers le jeu.** Depuis l'ouverture de
   l'application, partir en sortie doit se faire en **un tap**, sans traverser le hub. Un enfant qui
   a cinq minutes ne doit pas les dépenser en trajet.
2. **Mais le campement récompense celui qui s'attarde** : c'est là que vont les interactions
   gratuites, la collection, le coloriage libre, les compagnons. Il est *offert*, jamais *imposé*.
3. **Aucun écran intermédiaire obligatoire**, nulle part. Chaque écran qui s'interpose entre l'envie
   de jouer et le jeu mange du temps de lecture.

C'est la formulation qui permet de garder le pari d'Adibou sans en payer le coût sur les sessions
courtes.

### D47. Le ductus livré était bien faux — mesuré, et l'erreur est isolée

D33 était fondé sur la littérature. **La mesure confirme le défaut dans le code livré.**

Aire signée sur `contenu/modeles-lettres/minuscules.json` (repère à `y` vers le bas, aire > 0 =
horaire) :

| Lettre | Départ du rond | Sens tracé | Conforme à D33 ? |
|---|---|---|---|
| **`d`** | `[70, 100]` — **en bas** | **horaire** | **faux sur les deux points** |
| `q` | `[70, 60]` — en haut | antihoraire | **conforme** |
| `a`, `g` | `[60.59, 70]` | horaire | faux sur le sens |
| `o` | `[50, 100]` | horaire | faux sur les deux points |

Le `d` livré est **exactement le parcours inverse** de celui de l'école. Et dans le **même
fichier**, `q` — même famille gestuelle — est juste : ce n'est donc pas une convention assumée,
c'est une **inversion isolée**. Conséquence mesurée : un enfant qui trace le `d` au geste de
l'école reçoit `sens-inverse`, **paie une étoile**, et **fait remonter au dashboard une confusion
`b`/`d` qu'il n'a pas commise**. Le capteur salissait la donnée qu'il devait produire.

### D48. Pourquoi le bot singe n'a pas vu l'écran sans issue — auditer les OBJETS, pas les occurrences

`tests/e2e/singe.spec.ts` assertait `sante.interactifs > 0`. Sur le nœud `trace` il y a deux
éléments interactifs — Écouter, aide de Gobi — donc **le singe était vert sur un écran d'où l'on ne
peut pas sortir**.

> **Compter les éléments interactifs n'est pas compter les sorties.**

C'est le mode d'échec « auditer les occurrences au lieu des objets » : on recense ce que l'attribut
donne à voir, au lieu d'énumérer les objets qui devraient porter la propriété. Le test correct
énumère **les écrans atteignables** et vérifie, pour chacun, qu'**au moins un élément mène
ailleurs** — mesuré : **8 écrans audités, 2 sans issue**, les deux nœuds.

**Règle générale** : une assertion de robustesse porte sur la propriété qui compte, jamais sur un
indice corrélé. `interactifs > 0` est un indice ; `mène ailleurs` est la propriété.

### D49. Trois défauts en chaîne rendaient l'aide inatteignable

Découverts ensemble, ils se renforçaient :

1. `trait-hors-ordre` est **du code mort** — un trait ultérieur tombe toujours sur
   `depart-eloigne` avant lui. Le seul motif capable de dire « commence par le rond » est
   inatteignable.
2. `depart-eloigne` **ne compte pas d'erreur** — donc `nbErreurs` reste à 0 après cinq essais.
3. Donc `erreursAvantIndice: 2` **ne se déclenche jamais** : l'aide n'arrive qu'après **45 s
   d'attente**… sur un écran sans sortie.

Un enfant qui s'y trompait était donc coincé, sans aide et sans issue. Aucun des trois défauts
n'était visible seul.

**Et la tolérance de départ faisait 48 px** (2 × 24) là où R16 exige des cibles de 64 px : un `d`
correct posé 20 px à côté était refusé. D33 autorise explicitement à assouplir la précision — jamais
le sens.

### D50. Économie de l'analyse d'images — mesurer plutôt que regarder

**Signalé par l'utilisateur** : lire des images consomme beaucoup trop de jetons. C'est exact — une
image en pleine résolution coûte l'équivalent de plusieurs pages de texte, et cette session en a
lu une vingtaine.

**Règle : une image ne se regarde que si le jugement demandé est esthétique.** Tout le reste se
mesure par commande, pour une fraction du coût.

| Ce qu'on veut savoir | ❌ Coûteux | ✅ Économe |
|---|---|---|
| Le fond est-il blanc ? Y a-t-il de la couleur ? | lire l'image | saturation HSV moyenne, part de pixels neutres |
| Le trait est-il assez épais ? | lire l'image | largeur des traits mesurée, `stroke-width` du SVG |
| Les régions sont-elles fermées ? | lire l'image | remplissage par diffusion, comptage de sous-chemins |
| Un asset a-t-il changé ? | lire les deux | empreinte SHA-256, ou différence de pixels |
| Le personnage est-il cohérent ? | lire les 25 variantes | lire **2 ou 3** en vignette, mesurer le reste |
| L'écran s'affiche-t-il correctement ? | capture pleine page | arbre d'accessibilité, `get_page_text` |

**Trois règles pratiques :**

1. **Réduire avant de lire.** Une vignette de 512 px suffit pour juger une silhouette ou une
   expression ; la pleine résolution ne sert qu'à inspecter un détail précis.
2. **Échantillonner, ne pas balayer.** Sur une série de N variantes, en regarder 2 ou 3 et mesurer
   les autres. C'est ainsi qu'a été trouvée l'erreur des « 20 personnages » (D31) : par la mesure de
   saturation, pas par la contemplation.
3. **Le jugement esthétique appartient au parent.** Il tranche en trois secondes ce qu'un agent
   décrit en trois paragraphes — mieux, et gratuitement. **Lui envoyer une planche de vignettes
   coûte moins cher que de faire décrire chaque image par un agent**, et donne un meilleur verdict.

**Conséquence pour les campagnes** : une phase de « jugement du regard » se limite à un **échantillon
représentatif** — jamais tous les assets — et s'appuie d'abord sur les mesures. Ce qui doit être
jugé beau part chez le parent, en planche contact.

---

### D51. Le rallumage se fait par PALIERS et par ZONES, jamais par éclaircissement uniforme

**Arbitré par l'utilisateur le 2026-08-03**, sur retour de jeu réel : « rallume une zone dans la
clairiere ça se voit mieux. les 12 paliers c'est bien ».

**Le défaut, mesuré sur sa base de jeu, jamais supposé.** Le voile de Grisaille s'effaçait par une
opacité linéaire, `opacite = 1 − pourcentageColorie`. Après son premier exercice :

```
clairiere : pourcentage_colorie = 0,0833   (1 nœud sur 12)
voile      : opacité = 1 − 0,0833 = 0,917
```

Un exercice réussi levait **8 % d'un gris uniforme**. Ses mots : « j'ai fait un peu de clairiere,
2/12 écrit en bas, je ne vois aucun changement au gris de la clairiere ». La promesse centrale du
jeu — la recoloration qui est SIMULTANÉMENT la barre de progression, la récompense et la
justification narrative (v2 § 3.2) — était **exacte dans la base et invisible à l'écran**. Ce
n'était pas un défaut de rendu : la boucle de récompense ne se fermait pas.

**La décision.** On garde N paliers (N = le nombre de nœuds de la région : 12 en Clairière, 14 aux
Galeries et à la Cité). Chaque palier retire une ZONE entière de Grisaille, par un halo qui naît à
l'ancre du marqueur — l'endroit où l'enfant vient de jouer — et s'étend. Le halo est un **masque**,
jamais un disque peint par-dessus : ce qui apparaît est le dessin en couleur déjà présent, comme
« la couleur vient du code » l'impose partout ailleurs.

**Et la loi du rayon est MESURÉE, parce que la loi calculée était fausse.** Première version :
`rayon = R·√(k/N)`, qui donne une aire de DISQUE constante. Elle a l'air juste et elle ne l'est
pas — mesurée sur les six silhouettes :

```
clairiere          palier 1 = 19,5 %   palier 12 = 0,0 %
galeries           palier 1 = 23,3 %   palier 14 = 0,0 %
foret-muette       palier 1 = 24,1 %   palier 12 = 0,0 %
cite-des-histoires palier 1 = 15,5 %   palier 14 = 0,0 %
```

Le disque couvrait tout le territoire bien avant le dernier palier : **les huit derniers exercices
de la Clairière n'auraient rien rallumé.** Soit le défaut corrigé, déplacé de la première moitié du
parcours vers la seconde — et invisible à la relecture, parce qu'une aire de disque constante
*ressemble* à une part de territoire constante.

Il n'existe pas de formule fermée pour un polygone concave dont l'ancre n'est pas le centre. La loi
est donc une **table de quantiles mesurés** : `client/src/monde/rallumage.gen.ts`, engendrée par
`node scripts/generer-rallumage.mjs` depuis `carte-monde-v3.svg`. Le quantile à 25 % **est** le
rayon qui contient le quart du territoire ; la promesse devient vraie par construction.

Des quantiles, et non des rayons par palier : **le nombre de nœuds d'une région change à mesure que
le contenu s'écrit**. Une table indexée par palier serait fausse au prochain exercice ajouté, en
silence.

**Ce qui garde la décision** : `tests/composants/VoileGrisaille.test.tsx` ne fait pas confiance à la
table — il recompte les points intérieurs des silhouettes dans le décor et vérifie ce que les rayons
rallument vraiment. Une table fausse le fait rougir. Il vérifie aussi qu'**aucun palier ne rallume
rien**, qui est le défaut exact corrigé ici, et qu'une région absente de la table rend un rayon nul
plutôt qu'un rayon inventé.

**Portée** : à relancer après toute retouche de `carte-monde-v3.svg` ou de la table `ANCRES` de
`EcranCarte.tsx`. Le générateur refuse d'écrire si une ancre tombe hors de sa silhouette.

---

## Points encore ouverts

| # | Point | Source | Bloque quoi |
|---|---|---|---|
| O1 | **Le nom du jeu** — « La Pierre des Mots » est un titre de travail, à faire choisir par l'enfant | v2 § 18.1 | Rien techniquement |
| O3 | **Contrat de validation du mode `regions`** — tolérance de débordement, région laissée blanche, ordre libre ou imposé, comportement en cas d'erreur | [fiches-origine-analyse.md](fiches-origine-analyse.md) § 3 | Le moteur `colorie` — tranché par le contrat technique v1 |
| O5 | **Le vrai/faux mérite-t-il de survivre ?** — format le moins informatif, mais dominant dans le corpus réel | [fiches-origine-analyse.md](fiches-origine-analyse.md) § 6 | Le lot L6 |
| O6 | **Un moteur `place` manque au catalogue** des 12 moteurs — glisser-déposer vers une région cible, pour les consignes « Dessine X à côté de Y » | [fiches-origine-analyse.md](fiches-origine-analyse.md) § 5, F1 | Le niveau 1 du corpus |
| O7 | **Le niveau 7 (rédaction libre) n'est pas validable automatiquement** — LLM juge local, validation parent différée, ou transformation en phrase à trou | [fiches-origine-analyse.md](fiches-origine-analyse.md) § 5, F2 | Le lot L6 |
| **O11** | **Aucun moteur ne fait tracer une lettre.** Les 12 moteurs de la v2 § 7 n'ont aucun geste d'écriture — `grave` ne fait que compléter lettre par lettre. Or le tracé est ce qui accélère la discrimination des lettres miroir (D23). Proposition : un moteur `trace`, tracé au doigt avec guidage et tolérance conforme à R16 | D23 | Le travail sur les confusions `b`/`p`, besoin actuel |
| **O10** | **Le corpus ne couvre pas la progression phonologique.** Les 105 fiches travaillent la lecture appliquée et la compréhension ; elles supposent le déchiffrage acquis. Or l'enfant déchiffre encore (D14). Les régions 1 à 5 des specs — voyelles, CVC, nasales, lettres muettes, graphèmes rares — **n'ont aucun matériau dans le corpus** | D14 + [fiches-origine-analyse.md](fiches-origine-analyse.md) § 2 | Le contenu de La Clairière, donc le lot L1 au complet |

## Points clos

| # | Point | Clos par | Le |
|---|---|---|---|
| **O2** | `p_devinette` manquant au BKT | **D13** — valeurs fixées par mode de réponse, plus la clause des deux tentatives à faible devinette | 2026-08-01 |
| **O4** | Les fiches d'origine étaient introuvables | Versées : **7 PDF, 105 fiches** dans `Docs/NIVEAU 1..7.pdf`. Analyse dans [fiches-origine-analyse.md](fiches-origine-analyse.md). Le corpus dépasse largement les 20 fiches demandées par les specs | 2026-08-01 |
| **O8** | Ordre des lots — ingestion ou génération d'abord | **D11** — l'ingestion passe devant | 2026-08-01 |
| **O9** | ComfyUI hors service | Résolu le jour même. Version 0.29.2, 30,3 Go de VRAM libre, piloté par le plugin `comfy@comfyui-mcp`. Mesuré, pas rapporté | 2026-08-01 |
