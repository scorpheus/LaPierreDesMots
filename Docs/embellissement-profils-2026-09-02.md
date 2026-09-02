# Embellissement de l’écran des profils — 2 septembre 2026

## Décision appliquée

L’écran d’entrée présente désormais chaque enfant comme le héros de sa propre aventure. La grande
zone tapable conserve strictement le comportement décidé par la v2 § 11 : un tap sur la carte
choisit le profil et mène à la carte du monde, sans mot de passe ni confirmation.

Le portrait est construit par le client à partir des trois couleurs déjà enregistrées dans
`ConfigurationAvatar` (`peau`, `cheveux`, `yeux`). Ce n’est pas un nouvel asset à valider. Les
anciens profils dont l’avatar serait incomplet reçoivent les valeurs par défaut de la v2, afin que
l’écran d’entrée ne puisse pas devenir vide ou cassé.

Chaque carte rassemble trois chemins sans ambiguïté :

- la grande illustration et le prénom continuent l’aventure sur la carte du monde ;
- « Partir en sortie » conserve le raccourci D46 vers un exercice ;
- « Ma lecture » ouvre les réglages propres à cet enfant.

La carte « Nouveau joueur » reprend exactement la même silhouette et la même hauteur que les cartes
existantes. Elle reste visuellement distincte par son contour discontinu et son grand signe plus.
L’espace parent demeure séparé en pied de page.

## Parti pris visuel

Le décor utilise des aplats mats et frais : ciel bleu clair, deux collines vertes et soleil jaune.
Les couleurs de l’avatar enregistré deviennent réellement visibles au lieu d’être remplacées par
une initiale sur un disque. L’initiale reste une petite signature secondaire, utile lorsque deux
portraits se ressemblent.

Il n’y a ni animation ni mouvement de texte sur cet écran. La grille est prévue pour trois cartes
sur une tablette en paysage et revient à une colonne sous 600 px.

## Preuve automatisée

Le cas ajouté dans `tests/composants/EcranProfils.test.tsx` a d’abord échoué sur l’ancien rendu :
aucune invitation, aucun portrait et aucun paysage n’existaient. Après implantation :

```text
tests/composants/EcranProfils.test.tsx : 11 tests réussis sur 11
```

La compilation et la recette globale sont volontairement laissées à l’orchestrateur, conformément
au partage de travail multi-agent.
