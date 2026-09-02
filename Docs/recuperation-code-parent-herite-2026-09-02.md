# Récupération des anciens codes parent implicites — 2 septembre 2026

## Constat sur la base réelle

La base `donnees/pierre.db` contenait un code créé le 1er août 2026 avec l’origine
`ouverture-implicite`, et non par l’écran explicite ajouté ensuite. Le parent ne l’avait donc pas
nécessairement choisi en connaissance de cause. Six essais avaient en outre fermé la porte
jusqu’au 2 septembre 2026 à 20:08:05 UTC. La valeur `0000`, attendue pendant le test manuel,
n’était pas ce code.

## Décision appliquée

La migration 011 supprime uniquement un code marqué `ouverture-implicite`, puis remet son verrou à
zéro. Elle ne touche ni aux profils, ni à leur progression, ni aux réglages. Les codes portant
`ecran-definition` ou `redefinition` restent inchangés, verrou compris.

Après cette récupération unique, `/parent` affiche « Choisis le code du foyer » et le parent pose
lui-même quatre chiffres. Il n’existe volontairement aucun bouton public « code oublié » sur la
tablette : il rendrait inutile la séparation avec l’espace enfant.

La base réelle a été sauvegardée avant récupération dans `donnees/sauvegardes/`. Le comportement
de la migration est couvert par `tests/api/recuperation-code-parent.test.ts` dans les deux sens :
ancien code retiré, code explicitement choisi conservé.
