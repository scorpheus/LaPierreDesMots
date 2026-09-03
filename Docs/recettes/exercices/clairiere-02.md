# Recette — clairiere-02 / luciole-couleurs-01

Date : 2026-09-02
Moteur : `eclair`
Habillage : `clairiere.luciole`

## Parcours joué

Le contenu réel comporte six étapes (`rouge`, `bleu`, `vert`, `jaune`, `rose`, `brun`), trois
choix par étape et une réponse distincte à chaque fois. La consigne affichée est : « Touche la
luciole de la couleur que tu as lue. » Elle est audible via le contrôle d'écoute ; l'aide Gobi
propose la relecture de la consigne sans coût. Le geste demandé est concret : chaque choix rendu
par `MoteurEclair` porte `data-option` et une cible tactile ; le tap déclenche réellement
`repondre`, pas une simple sélection décorative.

Le mot n'apparaît qu'après le tap « Prêt ? », reste exposé 1 800 ms, puis disparaît. « Revoir »
le réaffiche sans erreur ni palier d'aide. Une mauvaise luciole incrémente l'erreur et expose la
confusion, mais laisse la tentative réussie et ne crée aucun état d'échec. Une bonne réponse
avance d'une étape ; la sixième clôt l'exercice et transmet la réussite/récompense au conteneur.

L'ordre des choix est tiré une seule fois par `Alea` dans `moteurEclair.creerEtat` : il n'est donc
pas exploitable en tapant systématiquement le premier bouton et reste rejouable à graine égale.

## Contrôles fonctionnels

Test rouge par défaut fonctionnel vérifié sur le contrôle « Revoir » et le passage à l'étape
suivante : avant correction, le mot restait masqué après « Revoir » et l'éclair suivant pouvait
partir sans « Prêt ? ». Les tests présents couvrent désormais ces deux effets visibles, ainsi que
bonne réponse, mauvaise réponse sans échec, aide, réécoute gratuite et double-tap.

Commandes ciblées exécutées :

```text
npm test -- --run tests/unitaires/eclair-ordre-options.test.ts tests/composants/MoteurEclair.test.tsx tests/composants/aide-de-gobi.test.tsx
15 tests passés, 0 échec
```

Le schéma et l'habillage déclarent bien `eclair`; les six étapes du contenu sont valides. Aucun
changement moteur ou contenu n'est requis pour cette ligne de recette.

## Verdict tablette

Le plateau, le bouton « Prêt ? », les choix et les contrôles restent séparés du décor animé ; les
choix sont rendus en boutons tactiles et la réponse ne dépend pas d'un glisser-déposer. Le contrat
de geste est donc compréhensible et atteignable au tap sur tablette.

**BLOQUÉ-ASSET** — `contenu/habillages/clairiere/luciole.svg` est encore un SVG gris de blockout.
La recette gameplay est recevable, mais la validation esthétique et la livraison tablette finale
attendent l'asset luciole final. Aucune image n'a été générée ni modifiée dans cette recette.
