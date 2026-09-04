---
name: publier-pwa-github-pages
description: Construire, tester ou publier la PWA de La Pierre des Mots sur GitHub Pages, avec SQLite WASM/OPFS et sauvegarde locale. À utiliser pour toute recette PWA, préparation gh-pages ou mise en ligne du site.
---

# Publier la PWA sur GitHub Pages

Lire d'abord `Docs/contrat-pwa-github-pages.md`. Le livrable est construit sur la machine du
propriétaire, car les voix et plusieurs polices requises sont ignorées par Git. GitHub Pages livre
ensuite les fichiers statiques ; il ne détient jamais la base de progression.

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

## Préparation de la publication

1. Exécuter `npm run verifier`, puis lire `tests/rapports/RAPPORT.md`.
2. Vérifier que le dépôt principal est propre. `publier-site.bat` refuse volontairement les
   changements suivis ou non suivis afin que le livrable corresponde à un commit source connu.
3. Exécuter `publier-site.bat`. Il reconstruit la PWA et prépare uniquement un commit local dans
   le worktree ignoré `bac-a-sable/publication-gh-pages`.
4. Inspecter le commit local et le fichier `SOURCE_COMMIT.txt`.
5. S'arrêter, annoncer au propriétaire la commande distante affichée par le script ainsi que son
   effet, puis attendre son accord. La première publication demande aussi son accord avant de
   configurer Pages sur la branche `gh-pages`, dossier racine.

Après une publication autorisée, vérifier l'installation et la persistance sur
`https://scorpheus.github.io/LaPierreDesMots/`, sans supprimer la base locale existante.
