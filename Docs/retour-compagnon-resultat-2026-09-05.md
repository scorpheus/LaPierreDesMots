# Retour — compagnon au résultat (5 septembre 2026)

## Correction locale

Le compagnon qui accompagne une sortie est porté par
`sortie.compagnon`. `EcranNoeud` le lit déjà pour l'aide ;
`EcranRecompense` le lit désormais au même endroit du chemin de données et affiche son
portrait canonique dans la scène de réussite.

La résolution du code vers le libellé et l'asset vient de
`contenu/monde/compagnons.json`, via `compagnonsDuDocument`. Ainsi, le résultat ne dépend pas
d'une lecture réseau du monde qui peut encore être en cours à l'arrivée sur l'écran. Les quatre
portraits existants sont réemployés : aucun atlas ni asset brouillon n'est promu.

Sans compagnon dans `sortie.compagnon`, la scène conserve Gobi et son animation de joie.
Les marques de rendu sont `data-compagnon-recompense` (`gobi`, `filou`, `roc`, `plume` ou
`bulle`) et `data-scene-recompense` (`gobi-joie` ou `compagnon-joie`).

## Séparation des récompenses

La présence du compagnon choisi pendant la sortie ne constitue pas une évolution de Gobi.
`EvolutionGobi` reste la surcouche dédiée à un changement de stade détecté depuis le monde
après l'enregistrement ; la carte de compagnon nouvellement rallié reste, elle, une récompense
régionale distincte. Ces trois informations ne sont donc pas fusionnées.

## Régressions ajoutées

`tests/composants/EcranRecompense.test.tsx` couvre les quatre compagnons, le repli Gobi, une
reprise de sortie, son dernier exercice et l'absence de confusion avec une évolution de Gobi.
Le rouge a été constaté par le principal avant l'implantation. Les suites et la vérification
globale restent sous sa responsabilité selon le contrat du lot.

## Repli de composition de sortie

Le 5 septembre, la route de composition a répondu `409` pour un départ vers le Marais Jumeau.
Le sélecteur exclut tous ses nœuds lorsque les prérequis ne sont pas assez maîtrisés : les
exercices du Marais demandent notamment `syl.cvc` ou `syl.cv` avant les nasales et digrammes,
et le profil de contrôle ne les avait pas encore au seuil de `0,60`. Le sélecteur exige au moins
quatre nœuds éligibles ; il refuse donc justement de produire un plan pédagogique fictif.

La carte conserve néanmoins une issue R14 : elle charge le nœud de repli annoncé. Cette branche
effaçait auparavant la sortie et, avec elle, le compagnon choisi. Elle crée maintenant seulement
en mémoire un plan de **session** à une étape : le paquet réellement chargé fournit le nœud,
l'habillage et les compétences ; le rôle `synthese` est explicitement terminal car cette session
ne comporte qu'une étape ; l'horodatage vient de l'Horloge injectée. Ce plan n'est jamais
archivé : la seule tentative d'archive est le `POST` de composition déjà refusé en `409`.
