# Campagne de recette exhaustive des exercices — 2026-09-02

## Périmètre

La campagne couvre les **75 exercices pédagogiques et l'activité libre de compatibilité** décrits
par les 76 fiches de nœud : Clairière (12), Forêt muette (12), Galeries (13 + l'activité libre),
Marais jumeau (12), Volcan (12) et Cité des histoires (14).

Un exercice n'est pas déclaré propre parce que son JSON est valide ou que son composant se monte.
Il doit passer la recette enfant ci-dessous, dans le vrai site et au format paysage tablette.

## Grille obligatoire, une ligne par exercice

1. **Consigne** : phrase française naturelle, courte, vocabulaire CE1, prononçable et non ambiguë.
2. **Aide** : donne une stratégie ou un indice concret ; elle ne répète jamais simplement la consigne.
3. **Gameplay** : toutes les actions demandées existent, sont atteignables et produisent le bon effet.
4. **Choix** : ordre non déductible de la consigne ; les propositions sont mélangées par `Alea` quand
   l'ordre n'est pas lui-même l'objet pédagogique.
5. **Visuel** : aucun asset absent, aucun blockout géométrique présenté comme illustration finale,
   texte lisible à distance de bras, zones tactiles adaptées à un enfant.
6. **Réaction** : retour immédiat et calme ; pas de feu d'artifice générique ni de résidu sur l'écran
   suivant.
7. **Sortie** : réussite, récompense, exercice suivant et retour au monde sont cohérents ; une activité
   libre ne crée ni tentative pédagogique ni récompense.
8. **Audio hors campagne** : à la demande du parent le 2 septembre, la voix est mise de côté tant
   que le profil audio reste désactivé. Elle ne bloque pas la recette fonctionnelle ou visuelle.

Verdicts autorisés : `PROPRE`, `CORRIGÉ`, `BLOQUÉ-ASSET`. Chaque verdict autre que
`PROPRE` nomme le défaut et le fichier concerné. Une simple présence DOM ne vaut jamais recette.

## Ordre de travail

1. Corriger les blocages transversaux déjà reproduits : particules persistantes, récompense,
   ordre prévisible, aide tautologique, activité libre traitée comme exercice.
2. Recetter les 12 exercices de la Clairière, car c'est le premier parcours enfant.
3. Recetter en parallèle les cinq autres régions.
4. Ajouter des mutations représentatives des défauts réellement trouvés et prouver que la QA rapide
   rougit pour chacune.
5. Lancer une seule campagne globale `npm run verifier` après les corrections et lire son rapport.

## Règles de campagne parallèle

- Les agents ne compilent pas, ne régénèrent pas les références visuelles et ne committent pas.
- Chaque agent écrit uniquement dans sa région et dans son rapport sous `Docs/recettes/`.
- L'orchestrateur relit chaque rapport avant intégration, exécute les contrôles ciblés, puis la campagne
  globale finale.
- Les quatre documents de référence restent inchangés.
