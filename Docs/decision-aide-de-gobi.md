# L'aide de Gobi — décisions R46 et R41

Écrit le 2026-08-07. Complète les documents de référence sans les modifier.
Mesures reproductibles : `bac-a-sable/r46-r41/`, harnais Vitest autonome
(`npx vitest run --config bac-a-sable/r46-r41/vitest.mesure.config.ts`).

## D46-a — Le texte et le clip de l'aide appartiennent à la COQUILLE, pas au moteur

`AideProposee.texte` était renseigné par **2 moteurs sur 14** (recensement par objet, moteurs
montés sur un exercice livré) : `trace` (« la grande barre ») et `libre`. Les douze autres
passaient `null`.

Ce n'étaient pas douze oublis. Un moteur ne connaît ni l'identifiant de son exercice ni le
manifeste des voix ; il ne peut donc produire aucun texte que le jeu sache **prononcer**, et
« rien n'est synthétisé à l'exécution » fait d'un texte imprononçable un texte inutile. Le
dépôt avait déjà rendu cet arbitrage pour le bouton « écouter » (`MoteurAssemble.tsx`) :
« il lui faudrait la clé `<exercice>/<consigne>` … seul l'écran le connaît ».

**Décision.** `client/src/composants/aide-de-gobi.ts` résout l'aide en un couple
(texte affiché, clé du clip qui le dit), depuis `EcranNoeud`. `texte: null` côté moteur
signifie désormais **« rien de particulier : la consigne suffit »**, et non « on a oublié ».

Cette forme ne pourrit pas : un quinzième moteur hérite du texte et du clip sans que personne
ait à s'en souvenir. Le faire porter par l'état de chaque moteur aurait exigé qu'on s'en
souvienne quatorze fois.

**Coût audio : zéro clip.** 286 consignes livrées, 286 clips `normal` au manifeste, taux
1.000 — Gobi relit la consigne, donc il joue le clip que la barre de consigne joue déjà.
Mesuré sur le corpus entier, consigne par consigne : **318 / 318 lisibles et audibles**.

## D46-b — Un repli ne doit jamais pouvoir ressembler à ce qu'il remplace

`Gobi.tsx` écrivait `const texte = aide?.texte ?? INVITE_PAR_DEFAUT`. Comme aucun des douze
moteurs ne renseignait `texte`, le `??` retombait **toujours** sur l'invitation : taper
« ? Gobi » ne produisait pas une bulle vide (ce qui se serait vu) mais **aucun changement**,
ce qui ne se voit pas. Le défaut a survécu trois campagnes et 354 assertions vertes.

**Décision.** L'invitation ne sert que quand `aide === null`. L'état « aide sans texte » n'est
plus repeint : il est **nommé** (`data-aide-source="manquant"`) donc comptable, et le DOM
distingue l'attente de la parole (`data-gobi-dit="invite" | "aide"`). Mesuré sur les 76
exercices : `manquant` = 0.

## D41 — Au campement, Gobi est un compagnon, pas un aide

Les trois paliers d'aide sont définis relativement à une **étape d'exercice** (v2 § 5.4). Au
campement il n'y a ni consigne, ni cible, ni erreur : rien à aider. Le bouton y était câblé sur
`() => undefined` — un rappel *fourni avec du néant*, invisible au détecteur de rappels morts,
qui cherche les rappels *non fournis*. C'était le seul de tout `client/src`.

**Décision.** `ProprietesGobi.surDemande` devient `(() => void) | null` — obligatoire, donc
chaque appelant tranche ; `null` au campement, et le bouton ne s'affiche pas. Motif repris de
D42 sans changer un mot : « un bouton qui ne répond pas casse la confiance plus sûrement qu'un
bouton absent ». L'aide reste entière dans les exercices.

## Les trois codes d'aide orphelins — état, et pourquoi ils n'ont pas été émis

`souffle-syllabe`, `surligne-graphene`, `montre-couleur` sont déclarés par 68, 34 et
11 exercices, et **aucun chemin ne les produit** (garde Q2).

Deux faits mesurés commandent la décision :

1. **Aucun consommateur.** `aide.code` n'est lu **nulle part** dans `client/src` : le rendu ne
   branche que sur `aide.niveau` (`colorie`, `place`, `trace`) et sur `aide.texte`. Les émettre
   aujourd'hui remplacerait un énumérant mort par un énumérant émis-et-ignoré — et rendrait le
   garde Q2 **vert sur une couche restée inerte**, ce qui est pire que rouge.
2. **Ils ne peuvent pas disparaître par ce lot.** `CodeAideGobi` est recopié dans
   `partage/src/contenu/validation.ts` et `contenu/schemas/exercice.schema.json`, et 76 fichiers
   de `contenu/exercices/` les déclarent. Les retirer invaliderait ces 76 fichiers.

**Travail requis, chiffré**, dans cet ordre :

| code | ce qui manque | quantité mesurée |
|---|---|---|
| `souffle-syllabe` | un consommateur (surligner/dire la syllabe) · une propriété `syllabe` sur `BoutonEcouter` · des clips `mot/<mot>` en rendu `syllabe` | 40 clips manquants sur 82 consignes portant un `mot` (42 déjà couvertes) |
| `surligne-graphene` | un consommateur ; l'émetteur naturel existe (`grave`, `Trou.attendu` porte le graphème) | 0 clip — l'aide est visuelle |
| `montre-couleur` | un consommateur ; l'émetteur naturel existe (`colorie`, `CibleColoriage.couleur`) | 0 clip — l'aide est visuelle |

## Dettes adjacentes, mesurées et non traitées par ce lot

- **Aide écrite mais muette sur `trace` et `libre`** : leurs textes propres (libellés de traits,
  invitation du coloriage libre) n'ont aucun clip. D42 masque alors le bouton — rien ne ment,
  mais l'aide n'y est pas audible. 3 exercices concernés.
- **`EtatGobi.formeActive` n'est jamais renseigné** ailleurs que par `null`
  (`partage/src/monde/gobi.ts:201` ; seul un fixtures de test pose `'ou'`). Conséquence :
  `cristal` et `libelleForme` valent toujours `null` au campement — **Gobi ne porte jamais le
  cristal que l'enfant a gagné**. Défaut réel, hors du périmètre de ce lot (serveur + monde).
