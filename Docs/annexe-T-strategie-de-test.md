# La Pierre des Mots — Annexe T : stratégie de test et de vérification

**Complète** les specs v2 (§ 19)
**Destinataire principal** l'agent qui développe l'application
**Principe directeur** un agent ne peut pas améliorer ce qu'il ne peut pas mesurer. Chaque exigence des specs doit avoir soit un test automatique, soit une raison écrite de ne pas en avoir.

---

## 1. Le problème à résoudre

Un agent qui code sans boucle de vérification produit du plausible, pas du juste. Il croit avoir fini parce que le fichier compile. Trois symptômes attendus sur ce projet précis :

- **Régression pédagogique silencieuse.** Un ajustement du BKT ou du Leitner ne casse rien visiblement : l'appli tourne, les exercices s'enchaînent, et la progression est devenue absurde. Personne ne le voit avant trois semaines.
- **Contenu incohérent.** Un exercice référence un média absent, un habillage inexistant, un graphème hors référentiel. Ça casse en jeu, chez l'enfant, pas en développement.
- **Non-déterminisme.** Aléatoire, horloge, animations, audio : sans maîtrise de ces quatre sources, l'agent obtient des résultats de test différents à chaque exécution et finit par les ignorer.

La stratégie ci-dessous traite ces trois points avant tout le reste.

---

## 2. Rendre l'application testable (préalable non négociable)

Ces quatre points sont des contraintes d'architecture, pas des options de confort. Ils sont à implémenter dans le lot L0.

### 2.1 Aléatoire injecté

Aucun appel à `Math.random()` dans le code applicatif. Un service `Alea` unique, instancié avec une graine :

```ts
// serveur/services/alea.ts  et  client/src/services/alea.ts
export function creerAlea(graine: number) { /* mulberry32 */ }
```

Graine par défaut aléatoire en production, forcée par `ATELIER_GRAINE` en test. Une règle ESLint interdit `Math.random` hors de ce fichier.

### 2.2 Horloge injectée

Aucun `new Date()` ni `Date.now()` direct : tout passe par `Horloge.maintenant()`. Indispensable pour tester le Leitner — vérifier qu'un item revient bien à J+7 sans attendre une semaine.

```ts
Horloge.figer('2026-09-01T08:00:00Z');
Horloge.avancer({ jours: 7 });
```

### 2.3 Effets externes derrière une interface

| Effet | Interface | Implémentation de test |
|---|---|---|
| Synthèse vocale | `FournisseurVoix` | `VoixMuette` — résout immédiatement, journalise les textes demandés |
| Musique et sons | `FournisseurAudio` | `AudioMuet` — pas de contexte Web Audio en test |
| LLM | `FournisseurLLM` | `scripte` — réponses fixes, déjà prévu en v2 § 13.1 |
| Système de fichiers contenu | `DepotContenu` | Répertoire de fixtures |

Conséquence utile : la suite complète tourne sans son, sans binaire Piper, sans Ollama.

### 2.4 Crochets de test côté client

Montés **uniquement** si `import.meta.env.MODE === 'test'`, absents du bundle de production (vérifié par un test de build, § 8.3) :

```ts
window.__test = {
  chargerProfil(fixture),        // état complet : progression, SRS, maîtrise
  allerAuNoeud(id),              // saute la carte et les cinématiques
  repondre(valeur),              // répond sans passer par le geste
  etat(),                        // dump sérialisable de l'état courant
  sauterAnimations(),            // durées à 0
  graine(n)
};
```

Sans ça, chaque test E2E devrait rejouer 40 minutes de progression pour atteindre la Cité des Histoires. Avec ça, il y arrive en une ligne.

---

## 3. Les six niveaux de test

```
        ┌──────────────────────────────────────┐
   T6   │ Observation réelle (l'enfant)        │  manuel, protocole écrit
        ├──────────────────────────────────────┤
   T5   │ Perf, a11y, budget de bundle         │  Playwright + axe + size
        ├──────────────────────────────────────┤
   T4   │ Visuel (captures de référence)       │  Playwright screenshots
        ├──────────────────────────────────────┤
   T3   │ E2E parcours + robustesse            │  Playwright
        ├──────────────────────────────────────┤
   T2   │ API + intégration serveur            │  Vitest + fastify.inject
        ├──────────────────────────────────────┤
   T1   │ Unitaire, composant, contenu         │  Vitest + Ajv + fast-check
        └──────────────────────────────────────┘
```

### T1 — Unitaire, composant, contenu

**Outils** Vitest 3, happy-dom, Testing Library, `fast-check` (property-based), Ajv 2020.

**Cœur logique — couverture exigée ≥ 90 %, tests par tables :**

- `validation/*` — un cas par mode (`choix-unique`, `ensemble`, `ordre-exact`, `paires`, `normalise`, `saisie`, `regions`), avec les cas limites : accents, majuscules, espaces multiples, apostrophes typographiques, réponses vides, réponse en double.
- `bkt/*` — mise à jour de maîtrise. Tests de propriété plutôt que d'exemple : une suite de réussites fait croître `p` de façon monotone ; une suite d'échecs la fait décroître ; `p` reste dans `[0,1]` quelle que soit la séquence ; une tentative avec aide pèse strictement moins qu'une tentative sans aide.
- `leitner/*` — les échéances J+1/3/7/16/35, le retour en boîte 1 sur échec, l'absence de dérive quand plusieurs révisions tombent le même jour.
- `selecteur/*` — composition d'une sortie. Propriétés : jamais deux fois le même habillage (R13), jamais une compétence dont un prérequis est sous 60 %, toujours un nœud d'échauffement en ouverture, toujours une réussite en clôture.
- `etoiles/*`, `progression/*`, `recoloration/*` — calculs purs.

**Composants** : les moteurs de mini-jeux montés isolément, pilotés par événements clavier et pointeur. Un test par moteur pour : bonne réponse, mauvaise réponse, aide de Gobi, double-tap rapide (aucune double soumission), désordre de rendu.

**Contenu** — suite `test:contenu`, exécutée sur *tout* `contenu/exercices/**/*.json` :

1. Conformité au JSON Schema.
2. Unicité des `id`, immutabilité vérifiée contre le registre.
3. Tous les médias référencés existent sur disque.
4. Le `jeu.moteur` existe, le `jeu.habillage` existe, le couple est déclaré compatible.
5. Toutes les compétences citées existent dans le référentiel.
6. Le graphe de prérequis est acyclique et la difficulté est cohérente avec la profondeur.
7. Chaque consigne dispose d'un audio pré-rendu (R15).
8. Couverture lexicale : aucun mot hors liste de fréquence CE1, sauf mots cibles déclarés.
9. Chaque distracteur de QCM porte un `pourquoiFaux`.
10. Chaque compétence est couverte par ≥ 3 moteurs distincts (R12).

Cette suite est aussi la commande que l'agent générateur de contenu doit exécuter avant de déposer un brouillon.

### T2 — API et intégration serveur

`fastify.inject()`, aucun port ouvert, base SQLite en mémoire réinitialisée entre les tests.

- Cycle de vie d'une session : ouverture, tentatives, reprise après interruption brutale, aucune tentative perdue.
- Idempotence : rejouer deux fois la même tentative (réseau capricieux, double tap) ne double pas le score.
- Multi-appareil : deux clients sur le même profil ne se marchent pas dessus.
- Migrations : partir d'une base v1 de fixture, migrer, vérifier l'intégrité des données.
- Recalculs : la progression dérivée du journal `tentatives` est identique après un `RECALCULER` complet.

**Test de rejeu.** On conserve dans `tests/fixtures/journaux/` des journaux de tentatives réels (anonymisés du prénom). `test:rejeu` les rejoue dans le moteur pédagogique et compare le résultat à un fichier de référence. C'est le filet contre les régressions silencieuses du § 1 : toute modification du BKT, du Leitner ou du sélecteur fait diverger le rejeu, et l'agent doit alors expliquer et valider l'écart avant de mettre à jour la référence.

### T3 — E2E et robustesse

**Playwright**, profil d'appareil calqué sur la Galaxy Tab S10 FE (1920×1200, tactile, DPR 2), `reducedMotion: 'reduce'`, graine fixée.

Parcours obligatoires :

| Scénario | Vérifie |
|---|---|
| Premier lancement | Création de profil, personnalisation d'avatar, arrivée au campement |
| Sortie complète | 5 nœuds enchaînés, butin, retour au campement enrichi |
| Recoloration | Une zone grise devient colorée et le reste après rechargement |
| Fin de région | Éclat obtenu, cinématique passable, région suivante ouverte |
| Reprise | Fermeture brutale en plein nœud, réouverture, reprise proposée et correcte |
| Aide de Gobi | Appel de l'aide, étoile 2 non attribuée, aucune pénalité ailleurs |
| Bascule de profil | Deux profils, progressions et palettes strictement étanches |
| Zone parent | Code faux ×5 → verrouillage, code juste → dashboard |
| Hors-ligne | Coupure d'Internet : aucune fonctionnalité dégradée |

**Deux tests de robustesse, spécifiques à ce projet :**

`test:e2e:cassecou` — un bot qui répond **systématiquement faux** sur 40 nœuds consécutifs. Assertions : aucun élément `[data-etat="echec"]` n'apparaît jamais, aucune étoile déjà acquise n'est retirée, aucun mot ne disparaît du mur des noms, chaque sortie se termine sur `[data-fin="reussite"]`, et l'aide se déclenche automatiquement au 2e essai. C'est la traduction mécanique de R14, la règle de non-échec — le seul principe des specs qu'il serait catastrophique de casser sans s'en rendre compte.

`test:e2e:singe` — 5 000 taps aléatoires sur l'ensemble de l'application. Assertions : aucune exception non capturée, aucun écran blanc, et **aucun état sans issue** (à tout instant, au moins un élément interactif est présent et mène quelque part). Le blocage sans issue est le pire bug possible sur une appli d'enfant : il ne saura pas le décrire, il arrêtera simplement de jouer.

### T4 — Visuel

Captures de référence Playwright sur les écrans structurants : campement, carte, chaque moteur de mini-jeu × chaque habillage, écran de récompense, chaque réglage de police de lecture (Andika, OpenDyslexic, Luciole, Belle Allure, Verdana), thème sombre.

Stabilisation obligatoire avant capture : `document.fonts.ready`, animations à 0, graine fixée, horloge figée, avatar de fixture. Tolérance 0,2 % de pixels.

Ces tests attrapent ce qu'aucun autre niveau ne voit : un contour disparu, un texte qui déborde en OpenDyslexic (corps plus large, c'est le cas le plus fréquent), une zone grise restée grise.

### T5 — Accessibilité, performance, budget

- **axe-core** sur chaque écran : contraste, ordre de focus, rôles, libellés.
- **Règle maison de taille de cible** (R16) : tout élément interactif ≥ 64×64 px avec 24 px de tolérance de dépôt. Automatisable, donc automatisé.
- **Budget de bundle** : échec du build si le bundle initial dépasse 250 Ko gzip.
- **Fluidité** : trace Playwright pendant une animation de recoloration, avec bridage CPU ×4 ; médiane ≥ 55 fps, aucune image au-delà de 50 ms.
- **Latences** : premier rendu < 1,2 s, transition entre nœuds < 150 ms, démarrage d'un son < 80 ms.

### T6 — Observation réelle

Deux exigences des specs ne sont pas automatisables, et il faut l'assumer par écrit plutôt que de les diluer :

- **R17** — ≥ 4 sessions spontanées par semaine sur 3 semaines. Mesuré par le dashboard, mais c'est un constat, pas un test.
- **R18** — l'enfant termine une sortie complète sans qu'un adulte lui explique quoi que ce soit.

Protocole R18 : on installe, on lance, **on ne dit rien**, on note l'horodatage de chaque hésitation de plus de 5 secondes et chaque demande d'aide. Une fiche par session dans `tests/observations/`. Trois hésitations sur le même écran valent un bug, à traiter avec la même priorité qu'un plantage.

---

## 4. Des exigences aux tests

| Exigence | Test | Niveau |
|---|---|---|
| R1 installation < 5 min | Script de vérification sur machine propre (VM ou conteneur Windows) | manuel outillé |
| R3 chaque moteur jouable et journalisé | E2E par moteur + assertion en base | T3 |
| R4 hors-ligne | E2E avec réseau coupé | T3 |
| R5 contenu agent validé | `test:contenu` sur les brouillons | T1 |
| R6 changement de police | Test composant + capture visuelle × 5 polices | T1, T4 |
| R8 reprise après fermeture brutale | E2E interruption | T3 |
| R9 dashboard exact | Rejeu de journal + comparaison des agrégats | T2 |
| R10 aucun appel sortant | Playwright, interception réseau, liste blanche vide | T3 |
| R11 25 interactions au campement | Comptage DOM `[data-interaction="libre"]`, ≥ 10 animations uniques, ≥ 6 répliques | T3 |
| R12 3 moteurs par compétence | Analyse statique du registre de contenu | T1 |
| R13 pas de répétition d'habillage | Simulation de 200 sorties sur le sélecteur | T1 |
| R14 aucun échec | `test:e2e:cassecou` | T3 |
| R15 consigne audible | Vérification d'existence des audios | T1 |
| R16 taille des cibles | Règle a11y maison | T5 |
| R17, R18 | Observation | T6 |

Toute exigence ajoutée aux specs doit venir avec sa ligne dans ce tableau. Une exigence sans test est un vœu.

---

## 5. Commandes

```
npm run test              # T1 + T2, sans watch
npm run test:contenu      # validation de tout le contenu
npm run test:e2e          # T3, parcours + robustesse
npm run test:visuel       # T4  (--maj pour régénérer les références)
npm run test:qualite      # T5, a11y + perf + budget
npm run test:rejeu        # rejeu des journaux de référence
npm run verifier          # tout, un seul code de sortie, rapport consolidé
```

Chaque commande produit un rapport machine dans `tests/rapports/*.json` **et** un résumé lisible dans `tests/rapports/RAPPORT.md`. Les artefacts d'échec (captures, traces, vidéos, diff visuels) vont dans `tests/rapports/artefacts/`.

`verifier.bat` enchaîne l'ensemble hors ligne de commande, pour le parent.

Crochets Git via **lefthook** (binaire unique, pas de dépendance Node globale, comportement propre sous Windows) : `pre-commit` → lint + T1 sur les fichiers touchés ; `pre-push` → `verifier` complet.

---

## 6. Boucle de travail de l'agent

Formulée comme une consigne directement transposable dans `CLAUDE.md` :

1. **Avant d'écrire** — lire les specs de la section concernée, puis écrire ou mettre à jour le test qui décrit le comportement attendu. Le lancer, constater qu'il échoue pour la bonne raison. Un test qui passe du premier coup avant l'implémentation est un test qui ne teste rien.
2. **Pendant** — le plus petit incrément qui fait passer le test.
3. **Après** — `npm run verifier`. Lire `RAPPORT.md`, pas la sortie brute.
4. **En cas d'échec** — corriger le code, jamais le test, sauf si le test contredit les specs. Dans ce cas : le signaler explicitement, citer le passage des specs concerné, et attendre l'arbitrage. **Ne jamais assouplir une assertion pour faire passer une suite.**
5. **En cas de divergence du rejeu** — s'arrêter. Expliquer l'écart pédagogique en langage clair, proposer, ne pas mettre à jour la référence de sa propre initiative.
6. **Avant de déclarer terminé** — vérifier la définition de terminé ci-dessous.

### Définition de « terminé »

| Type de travail | Terminé quand |
|---|---|
| Moteur de mini-jeu | Tests composant (bonne réponse, mauvaise, aide, double-tap), 1 parcours E2E, 1 capture visuelle par habillage, a11y au vert, non-échec vérifié |
| Habillage | Aucune ligne de code ajoutée, captures visuelles générées, `test:contenu` au vert, compatibilité moteur déclarée |
| Exercice ou lot de contenu | `test:contenu` au vert, présent dans la file de relecture, audios pré-rendus |
| Module pédagogique | Couverture ≥ 90 %, tests de propriété, rejeu de journal identique ou écart justifié |
| Écran d'interface | Capture visuelle, axe-core, tailles de cibles, comportement en `reducedMotion`, rendu dans les 5 polices |
| Correction de bug | Un test qui reproduit le bug **écrit avant** le correctif |

### Interdictions

- Ne jamais mettre un test en `skip` pour débloquer une suite. Un test désactivé est un mensonge dans le rapport.
- Ne jamais introduire d'attente arbitraire (`waitForTimeout`) : attendre un état, jamais une durée.
- Ne jamais appeler `Math.random`, `Date.now`, une API réseau ou l'audio réel depuis un test.
- Ne jamais annoncer « c'est terminé » sans avoir exécuté `npm run verifier` dans le même tour.

---

## 7. Couverture

Cibler par zone, pas globalement — une couverture globale à 80 % ne dit rien d'utile.

| Zone | Cible | Motif |
|---|---|---|
| `pedagogie/` (BKT, Leitner, sélecteur, étoiles) | ≥ 90 %, plus mutation testing | Erreur silencieuse et durable |
| `validation/` | ≥ 95 % | C'est le juge : un faux négatif décourage l'enfant pour rien |
| `moteurs/` | ≥ 80 % | Le reste est couvert en E2E |
| `serveur/routes/` | ≥ 80 % | |
| Interface, habillages, décors | pas de cible | Couvert en visuel et en E2E ; y courir après est du temps perdu |

**Mutation testing (Stryker), restreint à `pedagogie/` et `validation/`.** Justification : ce sont les seuls modules où un bug ne se voit pas à l'écran. Ailleurs, c'est disproportionné.

---

## 8. Trois pièges à traiter explicitement

### 8.1 Le temps

Toute la logique de révision espacée dépend de dates réelles. Sans horloge injectée, ces tests sont soit impossibles, soit faux. Un jeu de tests dédié parcourt 90 jours simulés et vérifie qu'un item vu une fois puis échoué revient bien plus vite qu'un item maîtrisé.

### 8.2 L'audio pré-rendu

Le rendu Piper est un artefact de build, pas un comportement d'exécution. À tester : que le cache est complet (aucune consigne sans audio), que le hachage est stable (le même texte ne se re-rend pas), et qu'un changement de texte invalide bien l'entrée. La qualité de la voix, elle, s'écoute — pas de test automatique là-dessus.

### 8.3 La fuite des crochets de test

Un test de build vérifie que `window.__test` et tout code de test sont **absents du bundle de production** : recherche de chaînes dans les artefacts compilés. Sinon, un enfant curieux finira par trouver `allerAuNoeud` — et honnêtement, il aura raison d'essayer.

---

## 9. Dépendances de test

| Rôle | Choix |
|---|---|
| Runner unitaire et composant | Vitest 3 + happy-dom |
| Assertions DOM | @testing-library/react, @testing-library/user-event |
| Property-based | fast-check |
| Schémas | Ajv 2020 (déjà présent en production) |
| API | `fastify.inject()`, aucune dépendance supplémentaire |
| E2E, visuel, perf | Playwright (+ @axe-core/playwright) |
| Mutation | Stryker, périmètre restreint |
| Crochets Git | lefthook |

Rien d'exotique, tout tourne sous Windows sans compilation native, et l'ensemble s'exécute hors-ligne une fois installé.
