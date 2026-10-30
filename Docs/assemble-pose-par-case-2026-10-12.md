# Assemble : on pose un bloc DANS une case, toucher ne juge rien — contrat gelé, 12 oct. 2026

Origine : retour du parent, tableau E19 (galeries-07, « Les stalagmites à empiler ») :

> « Si on prend la deuxième partie du mot, ça dit non. Alors qu'on ne fait que cliquer une fois […]
> il faudrait que ça dise non si on le met à la place du premier. Là on a *mar* et *che* : le *che*,
> si je le mets à la deuxième position avant de mettre le *mar*, ça devrait fonctionner, ça ne
> devrait pas directement me dire non. »

## 1. Ce qui se passe aujourd'hui (mesuré dans le code)

- `ActionAssemble` n'a qu'une pose : `{ type: 'poser', bloc }`, **sans case**. Le réducteur
  (`partage/src/moteurs/assemble/moteur.ts`) juge par `evaluerAssemble`
  (`validation.ts`) : le bloc doit être `etape.restantes[0]`, la case suivante. Sinon refus
  `bloc-hors-ordre`, qui compte une erreur.
- Côté client, un toucher sur un bloc émet `poser` tout de suite : toucher *che* = « poser *che*
  dans la première case vide » = refus. Glisser *che* sur la case 2 fait la même chose : la case
  visée est ignorée.

## 2. Ce qui doit se passer

1. **Toucher un bloc le PREND** (il est mis en évidence) : aucun verdict, aucune erreur, aucun
   son de refus, rien au journal. Retoucher le même bloc le repose dans la réserve. Toucher un
   autre bloc change de bloc pris.
2. **Toucher une case** alors qu'un bloc est pris = poser ce bloc **dans cette case**. Glisser un
   bloc **sur une case** = la même pose. Les deux gestes (T11) aboutissent à la même action.
3. Le verdict porte sur **la case** : le bloc est accepté si et seulement si c'est le bloc de la
   solution à ce rang et que la case est libre. L'ordre dans lequel l'enfant remplit les cases
   est libre (*che* en case 2 avant *mar* en case 1 : accepté).
4. Mauvais bloc dans une case → refus bienveillant comme aujourd'hui (R14 : rien ne se perd, le
   bloc revient), `compteErreur` comme aujourd'hui (`bloc-hors-ordre` ou `bloc-intrus`), avec la
   confusion « attendu = bloc de la solution à CE rang ».
5. Case déjà remplie → refus sans erreur (nouveau motif `case-occupee`, `compteErreur: false`).
6. L'étape est finie quand toutes ses cases sont remplies ; le reste (paliers, étoiles, aide,
   fin d'exercice) inchangé.

## 3. Contrat de types (gelé)

```ts
// partage/src/moteurs/assemble/types.ts
export type ActionAssemble =
  | { readonly type: 'poser'; readonly bloc: IdBloc; /** rang de la case, base 0 */ readonly case?: number }
  | ...inchangé
// MotifRefusAssemble gagne 'case-occupee' (compteErreur false).
```

- **Sans `case`** : comportement d'avant, à l'identique (les journaux de référence du rejeu
  portent des `poser` sans case ; `npm run test:rejeu` doit rester vert **sans toucher aux
  références**).
- **Avec `case`** : `acquis[bloc] = String(case + 1)` (rang base 1, comme aujourd'hui) ;
  `restantes` perd ce bloc (où qu'il soit), et garde l'ordre de la solution — donc
  `restantes[0]` reste « le bloc de la première case vide », ce qu'utilise l'aide `montre-cible`.
- Le bloc PRIS vit dans l'état du composant (comme une sélection d'interface), pas dans le
  réducteur : prendre n'est pas un acte pédagogique et n'a rien à faire au journal. Si le socle
  (`client/src/moteurs/commun/glisser.tsx`) fournit déjà ce « prendre puis poser », s'en servir
  plutôt que de le réécrire.
- `modeReponse` reste `'ordre'`, `nbElements` inchangé (p_devinette = 1/n!).

## 4. Ce qui n'est PAS dans ce contrat

- Le moteur `phrase` (E05, guirlande, validé par le parent) a la même mécanique « case
  suivante ». **Question posée au parent** (tableau T21) : faut-il lui appliquer la même règle ?
  Pas fait sans sa réponse.
- Aucun contenu (`contenu/`) ne change.

## 5. Preuves attendues

- Unitaires (réducteur) : *che* en case 2 puis *mar* en case 1 → étape finie, 0 erreur ; mauvais
  bloc en case → refus + 1 erreur ; case occupée → refus sans erreur ; `poser` sans case →
  comportement d'avant (au moins un test existant le couvre déjà, il doit rester vert).
- Composant : toucher un bloc ne produit ni refus ni action `poser` ; toucher bloc puis case
  émet `poser` avec `case`.
- e2e (`tests/e2e/parcours-assemble-*.spec.ts`) : sur galeries-07, au doigt, deuxième bloc posé
  en case 2 d'abord → accepté ; tous rouges avant la correction, verts après.

## 6. Implanté le 12 oct. 2026 — écarts au contrat

- **`EtatEtapeAssemble` gagne `solution`** (déclaré en dernier, après `ordreAffichage`, pour le
  garde Q4). Raison : le réducteur ne reçoit pas le contenu (`ContexteMoteur`), et le rang d'une
  case ne se déduit pas de `acquis` posé sans case. Garde Q4 vert.
- **Le bloc pris vit dans le composant** (`prisId`), `glisser.tsx` inchangé. Chaque case est une
  cible de dépôt (`data-case="<rang>"`) ; glisser sur la ligne du mot hors d'une case ne pose plus
  rien et ne coûte rien.
- La fente « prochaine » ne s'allume plus d'elle-même : seulement quand l'aide est réclamée (sinon
  elle désignait la case à remplir, et l'ordre redevenait imposé à l'œil).
- Téléphone en paysage (hauteur ≤ 520 px, corps 27, interligne 2) : la réserve de lignes de refus
  est retirée, sinon le centre des cases était rogné et non touchable.
- Tests adaptés parce qu'ils supposaient le toucher = pose (contredit par le parent) :
  `MoteurAssemble.test.tsx` (bonne réponse, mauvaise réponse, double-tap),
  `parcours-assemble-stable.spec.ts`, `parcours-glisser-et-toucher.spec.ts`, et l'outil partagé
  `tests/e2e/gestes-dom.ts` (le geste assemble touche le bloc puis sa case). Aucune assertion
  assouplie.
- Preuves : `tests/unitaires/assemble-pose-par-case.test.ts` (4 rouges avant / 8 verts),
  `MoteurAssemble.test.tsx` (6 rouges avant / 11 verts), `parcours-assemble-pose-par-case.spec.ts`
  (4 rouges avant / 4 verts) ; `npm run test:rejeu` sans divergence, références intactes.
