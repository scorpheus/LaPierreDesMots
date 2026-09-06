---
name: publier-pwa-github-pages
description: Construire, tester ou publier la PWA de La Pierre des Mots sur GitHub Pages, avec SQLite WASM/OPFS et sauvegarde locale. À utiliser pour toute recette PWA, préparation gh-pages, mise en ligne ou question sur le passage d’un commit au site public.
---

# Publier la PWA sur GitHub Pages

Lire d'abord `Docs/contrat-pwa-github-pages.md`. Le livrable est construit sur la machine du
propriétaire, car les voix et plusieurs polices requises sont ignorées par Git. GitHub Pages livre
ensuite les fichiers statiques ; il ne détient jamais la base de progression.

## Modèle de déploiement actuel

Un commit sur `main`, même réussi, **ne modifie jamais à lui seul le site public**. Le runner GitHub
ne compile pas les sources : il ne possède ni les voix ni toutes les polices locales. La chaîne
effective est :

```text
commit(s) source sur le PC
→ `publier-site.bat --preparer` : garde de concurrence + vérification unique + build + commit local
→ accord explicite du propriétaire
→ `publier-site.bat --publier` : push + attente de l’Action + recette HTTPS
```

Ne pas inventer un workflow qui compile sur un runner GitHub hébergé. Une automatisation depuis
chaque commit demanderait un runner auto-hébergé sur le PC et constitue un autre chantier. Tant
qu'elle n'est pas décidée, dire clairement au propriétaire qu'une nouvelle version reste invisible
en ligne jusqu'à l'exécution de `publier-site.bat` puis au push de `gh-pages`.

## Autorisation GitHub — arrêt obligatoire

Préparer et tester des fichiers ou une branche locale est permis. Avant toute écriture distante,
annoncer au propriétaire l'action exacte et attendre son accord explicite. Cela couvre au minimum
un `git push`, la création ou la configuration de GitHub Pages, un déclenchement d'Action, un
changement de secret, une release et une modification de paramètre du dépôt. La présence d'une
session `gh` authentifiée n'est jamais une autorisation implicite.

Transmettre la même règle à tout sous-agent appelé sur ce chantier. Ne jamais demander à un
sous-agent de publier directement.

## Recette locale

1. Exécuter `tester-pwa.bat`, ou successivement `npm run construire:pwa` et
   `npm run servir:pwa`.
2. Ouvrir `http://127.0.0.1:4175/LaPierreDesMots/` sur le PC. `localhost` est un contexte sûr pour
   OPFS et le service worker ; une tablette reliée à une adresse LAN en HTTP ne l'est pas. La
   recette tablette réelle attend donc l'URL HTTPS de GitHub Pages ou un serveur HTTPS local.
3. Dans un profil Chromium persistant, contrôler : création puis relecture d'un profil après
   fermeture, rechargement hors connexion, route profonde avec recherche et fragment, refus
   propre du second onglet, absence de requête `/api/`, puis export et réimport de la sauvegarde.
4. Une nouvelle version du service worker doit remplacer ses caches sans toucher à la base OPFS.
   Ne jamais effacer les données du site pour « réparer » une recette : cela détruit la progression
   locale et masque précisément le comportement à vérifier.

Le cache initial est hybride : coquille, code, WASM, polices, SVG, JSON et voix sont préchargés ;
les PNG, WebP et JPEG sont conservés à leur première consultation. Ne pas promettre tout le jeu
illustré hors connexion avant qu'un téléchargement complet explicite ait été implanté.

## Commande automatisée en deux temps

### Garde fonctionnelle locale avant préparation

Avec le build PWA courant et `npm run servir:pwa` déjà ouvert, lancer `npm run qa:pwa`.
Cette commande ne publie rien. Elle conserve un profil Chromium dédié sous
`bac-a-sable/profil-recette-pwa-opfs`, y ajoute un joueur de recette, termine un exercice par
les entrées tactiles natives, le rejoue hors connexion avec ses images et un clip Opus, puis
contrôle SQLite après fermeture, export/import, second onglet et route profonde.

Elle vérifie le nom exact du module JavaScript servi : un ancien onglet peut encore exécuter
l'ancien build, même si le nouveau service worker est installé. Fermer les anciens contextes
pour laisser l'activation normale se produire ; ne pas forcer `skipWaiting` pendant une partie,
ni effacer OPFS/caches pour obtenir artificiellement un vert.

Le test des images ne suffit pas : les fichiers `monde/*.json` sont aussi lus par URL dans
les récompenses et le coffre. Une importation JSON comme objet ne les inscrit pas dans
`urlAssetAutonome`. Conserver la garde d'inventaire JSON de
`tests/unitaires/depot-contenu-autonome-assets.test.ts`, en plus des visuels.

Contrôler aussi les `<image href>` à l'intérieur des SVG : un fichier présent dans le paquet
peut rester introuvable si son chargeur omet la réécriture commune des URL. Les moteurs de
placement et de coloriage ont exposé ce défaut en recette autonome. Attendre l'image SVG
illustrée avant son décodage : son décor de repli apparaît plus tôt et ne prouve aucun chargement.

`qa:pwa` couvre le parcours de démarrage, pas les 76 exercices : ceux-ci appartiennent à
`test:tactile` et à la matrice responsive. Un jeu passé par `__test.repondre` ne remplace pas
la tentative réellement écrite par le port SQLite du livrable autonome.

### Préparation et publication

1. Exécuter une seule fois `publier-site.bat --preparer`. Ne pas lancer `npm run verifier` avant :
   cette commande le fait déjà et relit ses rapports. Elle refuse un dépôt sale, les assets locaux
   absents et toute campagne Vitest/Playwright concurrente de ce dépôt avant d’engager les tests
   longs. Elle ne tue jamais un processus automatiquement. Si l’unique échec est
   `ERR_NO_BUFFER_SPACE` dans l’E2E, elle rejoue une seule fois la famille E2E complète et conserve
   les onze autres preuves vertes ; tout autre échec arrête la préparation.
2. Lire son résumé : commit source, commit `gh-pages`, version du build et nombre de preuves. Le
   fichier ignoré `bac-a-sable/publication-gh-pages-etat.json` lie ces quatre valeurs. Toute
   modification ultérieure invalide la publication au lieu d’envoyer d’autres octets.
3. S'arrêter, annoncer que `--publier` poussera le commit indiqué vers la branche distante
   `gh-pages` et déclenchera GitHub Pages, puis attendre l’accord explicite du propriétaire.
4. Après accord, exécuter :

   ```powershell
   .\publier-site.bat --publier
   ```

   Cette commande revérifie les empreintes préparées, pousse exactement `gh-pages`, attend l’Action
   `pages build and deployment`, exige son succès et l’état Pages `built`, puis contrôle en HTTPS
   la page racine, `version-build.json`, le service worker, le manifeste, son icône et tous les
   visuels de production (`PNG`, `SVG`, `WebP`) présents dans le manifeste Vite. Ces derniers sont
   sondés par requêtes `HEAD` en petits lots afin de ne pas retélécharger toute la bibliothèque.

Sans argument, un double-clic sur `publier-site.bat` équivaut à `--preparer` et conserve la fenêtre
ouverte. En automatisation, toujours préciser le mode afin de ne pas introduire de pause.

La recette technique distante est automatisée. La recette fonctionnelle d’installation et de
persistance sur la tablette reste à faire sans supprimer la base locale existante.
