# Contrat — PWA autonome publiée sur GitHub Pages

**Statut : architecture validée par le propriétaire le 2026-09-04 ; implantation, recette locale
et première publication HTTPS réalisées le même jour.**
Ce document complète l’addendum de portage Android sans modifier les quatre documents de
référence. Il décrit une troisième cible de la même application : le navigateur autonome.

## 1. Résultat attendu

Une famille ouvre une URL publique sous `https://scorpheus.github.io/LaPierreDesMots/`, peut
installer le jeu comme PWA et continue à jouer sans réseau avec le noyau et les ressources déjà
mises en cache.
Les profils, tentatives, réglages et projections restent exclusivement sur l’appareil, survivent
aux fermetures et aux mises à jour du site, et ne sont envoyés ni à GitHub ni à un serveur du
projet.

Le changement d’appareil, de navigateur ou d’origine Web ne synchronise pas la progression. Une
fonction d’export/import locale doit rendre ce choix réversible sans introduire de compte distant.

## 2. Architecture retenue

Le mode `pwa` réemploie `PortApiLocal`, les services et dépôts SQL partagés et les migrations déjà
embarquées par le mode Android. Seule l’ouverture de la base diffère :

```text
partage/src/base                  logique SQL et métier commune
├── adaptateur Node SQLite       serveur LAN
├── adaptateur Capacitor SQLite  APK Android
└── adaptateur SQLite WASM/OPFS  PWA hébergée statiquement
```

Le stockage navigateur est une base SQLite dans l’Origin Private File System. La cible choisie est
le VFS `opfs-sahpool`, adapté à GitHub Pages parce qu’il ne demande pas les en-têtes COOP/COEP. Il
n’autorise qu’une connexion simultanée : le jeu doit donc garder une connexion unique et refuser
ou rendre inerte un second onglet écrivain.

La dépendance retenue est `@sqlite.org/sqlite-wasm`, distribution npm du sous-projet SQLite WASM.
Le propriétaire a explicitement autorisé son installation le 2026-09-04 ; la version
`3.53.0-build1` est installée et épinglée exactement dans `client/package.json`.

## 3. Persistance et vie privée

- La base est liée à l’origine `https://scorpheus.github.io`, au profil du navigateur et à
  l’appareil. Une mise à jour des fichiers publiés ou un changement du chemin interne du jeu ne
  l’efface pas.
- Un changement de domaine crée une nouvelle origine et donc un nouvel espace de stockage. Avant
  un tel changement, l’interface doit demander un export puis proposer un import.
- Au premier usage réel, l’application demande `navigator.storage.persist()` et affiche dans la
  zone parent si le navigateur a accordé ou refusé la persistance durable.
- Effacer les données du site reste une suppression volontaire de la base. La PWA ne promet jamais
  de récupérer ce qu’aucun export n’a sauvegardé.
- Aucune donnée de progression ne va dans l’URL, un cookie, GitHub Actions ou un outil d’analyse.

## 4. Livraison statique

Une cible Vite `--mode pwa` produit `client/dist-pwa/`. Elle diffère du mode Android sur quatre
points seulement : adaptateur de base, chemins sous `/LaPierreDesMots/`, manifeste/service worker
et repli des routes profondes.

Le service worker met en cache atomiquement la coquille, les modules, SQLite WASM, les polices, les
SVG, les JSON et les clips audio du build. Les PNG, WebP et JPEG, beaucoup plus lourds, sont mis en
cache à leur première consultation. Chaque cache porte une version dérivée du build ; l’activation
d’une nouvelle version remplace les ressources mais ne touche jamais à OPFS. Une mise à jour ne
peut donc pas effacer la progression. En revanche, tant qu’un téléchargement complet explicite
n’existe pas, il ne faut pas promettre qu’une illustration jamais consultée sera disponible hors
connexion.

GitHub Pages ne fournit pas le repli SPA de Fastify. Le livrable contient un `404.html` qui restaure
le chemin demandé avant de charger `index.html`, afin qu’un rafraîchissement de `/carte` ou
`/parent/dashboard` revienne dans l’application.

## 5. Publication et règle GitHub

Les sources audio et plusieurs polices nécessaires au build sont volontairement ignorées par Git.
Un runner GitHub hébergé ne peut donc pas reconstruire seul le livrable complet. La première voie
est une publication construite localement : un script racine vérifie et construit `dist-pwa/`,
puis prépare sa publication sur une branche dédiée. GitHub Pages ne fait ensuite que livrer les
fichiers statiques.

**Règle dure pour tous les agents :** préparer un workflow, un script ou une branche locale est
autorisé dans ce chantier. Avant toute action distante qui modifie GitHub — création/configuration
du site Pages, push d’une branche de publication, déclenchement de workflow, changement de secret,
release ou paramètre du dépôt — l’agent annonce exactement l’action au propriétaire et attend son
accord. Aucun agent ne doit considérer l’authentification `gh` de cette machine comme une
autorisation implicite d’écrire sur GitHub.

Le script utilisateur à la racine est `publier-site.bat`. Son mode `--preparer` est sûr à relancer,
refuse une campagne de tests concurrente, exécute une seule validation complète, construit la PWA,
prépare le commit local `gh-pages` et enregistre ses empreintes dans le bac à sable. Il n’écrit
jamais sur GitHub. Après l’annonce de l’action distante et l’accord du propriétaire, le mode
`--publier` refuse toute divergence depuis cette préparation, pousse le commit exact, attend
l’Action Pages puis vérifie la version et les ressources essentielles servies en HTTPS. La
procédure répétable est consignée dans `.agents/skills/publier-pwa-github-pages/SKILL.md`.

GitHub Pages est configuré sur la branche `gh-pages`, dossier racine, avec HTTPS forcé. Chaque
nouveau push autorisé de cette branche déclenche l’Action gérée par GitHub
`pages build and deployment` ; elle livre le build déjà produit sur le PC et ne recompile pas les
sources privées de voix ou de polices.

## 6. Lots et propriété des fichiers

1. **Gardes rouges — réalisé.** Nouveaux tests dédiés : sélection du port `pwa`, base persistante après
   rechargement, manifeste installable, cache hors ligne, chemins sous le dépôt et route profonde.
2. **Base navigateur — réalisé.** Nouvel adaptateur et worker SQLite WASM ; factorisation minimale de
   `port-local.ts` pour injecter l’ouverture Node/Capacitor/WASM sans dupliquer les méthodes.
3. **Coquille PWA — réalisé.** Manifeste, icône dérivée d’un asset validé, service worker,
   demande de persistance et interface d’état dans la zone parent.
4. **Build et routage Pages — réalisé.** Mode `pwa`, base `/LaPierreDesMots/`, repli `404.html`, serveur
   local fidèle à GitHub Pages et commande `tester:pwa`.
5. **Sauvegarde — réalisé.** Export/import versionné de la progression, avec validation et refus atomique
   d’un fichier incomplet ou d’une version inconnue.
6. **Publication réalisée.** `publier-site.bat` et le constructeur du worktree `gh-pages`
   existent. La première branche a été publiée après l’annonce et l’accord prévus au § 5, puis
   GitHub Pages a été activé sur `gh-pages` / racine. Aucun workflow personnalisé n’est nécessaire :
   l’Action Pages officielle déploie automatiquement le livrable statique.

L’orchestrateur seul installe, compile et lance `npm run verifier`. Les agents travaillent sur des
fichiers disjoints et lisent ce document au lieu d’en recopier une variante dans leurs briefs.

## 7. Recette avant publication

La publication n’est proposée que si les preuves suivantes sont vertes dans le même tour :

1. création d’un profil et d’au moins une tentative en mode PWA local ;
2. fermeture puis réouverture dans le même profil Chromium : progression identique ;
3. remplacement du build servi par une version neuve : migrations appliquées, progression intacte ;
4. mode hors connexion : accueil, carte, exercice, habillage et audio déjà mis en cache disponibles ;
5. chargement direct d’une route profonde, retour navigateur et rafraîchissement fonctionnels ;
6. second contexte écrivain refusé proprement, sans corruption ni écran sans issue ;
7. export, suppression locale contrôlée, import : journal et progression restaurés ;
8. `npm run verifier`, puis lecture de `tests/rapports/RAPPORT.md`.

### Automatisation de la publication

La procédure quotidienne ne recopie plus manuellement les commandes :

```powershell
.\publier-site.bat --preparer
# arrêt obligatoire : annonce du push et accord explicite du propriétaire
.\publier-site.bat --publier
```

La préparation contrôle d’abord le dépôt, les voix et les polices locales ainsi que l’absence de
travailleurs Vitest, tinypool ou Playwright rattachés à ce dépôt. Elle échoue en nommant leurs PID
au lieu de les arrêter : un processus peut appartenir à un autre chantier légitime. Une validation
verte, le commit source, le commit de livraison et la version du build sont ensuite liés dans
`bac-a-sable/publication-gh-pages-etat.json`. Ce fichier est ignoré par Git et ne constitue pas une
autorisation distante.

Un `ERR_NO_BUFFER_SPACE` isolé dans l’E2E indique une pénurie de ressources réseau Windows, pas un
échec fonctionnel. Dans ce seul cas mesuré, le script rejoue une fois la famille E2E complète et
conserve les onze autres rapports verts. Il ne relance jamais automatiquement une assertion métier,
un défaut visuel ou une seconde panne d’infrastructure.

La publication exige que ces empreintes soient encore exactes, puis automatise le push, l’attente
de l’Action officielle, le contrôle de l’état `built` et une recette HTTP de la racine, du manifeste,
de son icône, du service worker, de la version et de tous les visuels de production (`PNG`, `SVG`,
`WebP`) énumérés par le manifeste Vite. Ils sont sondés en `HEAD` par lots de seize, sans télécharger
les quelque 200 Mo du livrable. Ce contrôle générique est obligatoire depuis qu’une publication a
révélé que le port autonome indexait SVG et PNG, mais pas WebP : les sources et les tests de Gobi
étaient présents tandis que son image disparaissait sur GitHub Pages. Un test local compare aussi
l’ensemble des fichiers de `contenu/assets/` et `contenu/habillages/` aux URL du port autonome afin
qu’une nouvelle extension oubliée échoue avant le build. Mesure du 4 septembre 2026 : 339 visuels
résolus localement ; 46 petits SVG incorporés dans le JavaScript par Vite et 293 fichiers externes
à sonder sur GitHub Pages. Le plancher distant est fixé à 250 pour refuser un manifeste
anormalement amputé sans confondre l’incorporation normale des petits fichiers avec une absence.
La persistance réelle sur tablette reste une
recette humaine : le script ne supprime ni ne remplace les données OPFS du navigateur.

### Mesure du 2026-09-04

Le build `pwa` a produit 1 591 fichiers, 194,4 Mio au total, dont 15,9 Mio de noyau préchargé. La
recette Chromium automatisée a validé les points 1, 2, 4, 5, 6 et 7 : profil relu après fermeture,
rechargement hors connexion contrôlé par le service worker, zéro requête `/api/`, route profonde
et rafraîchissement conservés, second onglet refusé, export/import réussi et faux fichier refusé
sans altérer la base. Le point 3 est couvert par le remplacement successif de plusieurs builds sur
le même profil OPFS ; une recette après publication HTTPS restera requise sur la tablette cible.

Le test local complet se fait sur le PC à
`http://127.0.0.1:4175/LaPierreDesMots/` avec `tester-pwa.bat`. Une tablette qui ouvre une adresse
LAN en HTTP n’est pas dans un contexte Web sûr : le rendu y est visible, mais OPFS et le service
worker ne sont pas garantis. La vraie recette tablette doit utiliser l’URL HTTPS GitHub Pages, ou
un serveur HTTPS local qui fera l’objet d’un lot séparé.

Les 27 gardes ciblées PWA et lanceurs, le lint, TypeScript et le build PWA sont verts. Une exécution
de `npm run verifier` a croisé une seconde campagne lancée simultanément dans le même dépôt : leurs
écritures concurrentes dans `tests/rapports/` rendent ce rapport consolidé impropre comme preuve.
Il ne doit pas être relancé en parallèle ; la campagne déjà conduite par l’autre chantier reste la
source attendue pour la validation globale.

### Première publication du 2026-09-04

- source : commit `7c491cfe69a870d9ca60a4b39dd8f7de8106e661` ;
- livrable : version `3c8e0b5858ccc99d`, 1 592 fichiers applicatifs, 194,4 Mio ;
- branche de livraison : commit `25124d60d79d2b3cd2fb898274eb587b2b262fac` sur `gh-pages` ;
- Action Pages : exécution `33866967883`, construction, déploiement et rapport réussis ;
- URL : `https://scorpheus.github.io/LaPierreDesMots/`, HTTPS forcé.

La recette Chromium sur cette URL publique confirme la relecture du profil après fermeture, le
rechargement hors connexion sous contrôle du service worker, le refus du second onglet, la portée
`https://scorpheus.github.io/LaPierreDesMots/`, l’export/import de SQLite, le refus atomique d’une
sauvegarde invalide, zéro requête `/api/`, zéro erreur de page et la conservation d’une route
profonde après rafraîchissement.
