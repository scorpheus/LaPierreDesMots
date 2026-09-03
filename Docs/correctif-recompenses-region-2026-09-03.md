# Raccordement des récompenses de fin de région — 3 septembre 2026

## Défaut observé

Un profil pouvait terminer entièrement la Clairière et recevoir son Éclat, tout en gardant Filou
grisé et le fanion marqué « encore à rapporter ». La table des compagnons n'avait aucun écrivain
atteignable et la route de dépôt d'un objet de campement n'était appelée par aucun geste du client.

## Règle appliquée

Une région dont la recoloration atteint 100 % et dont l'Éclat est obtenu matérialise
automatiquement ses récompenses déclaratives :

- le compagnon associé à cette région est rallié ;
- l'objet associé à cette région est posé au campement.

La date d'obtention de l'Éclat sert de date aux deux récompenses. Les écritures sont idempotentes :
une relecture ou une nouvelle réussite ne remplace jamais la première date. La synchronisation a
lieu pendant la reconstruction du monde depuis le journal, ce qui répare aussi les profils ayant
terminé une région avant ce correctif.

## Retour donné à l'enfant

L'écran de victoire régionale montre désormais séparément le portrait du compagnon et l'objet
rapporté, avec les phrases « rejoint ta bande » et « rejoint le campement ». Le coffre et le
campement relisent ensuite le même état ; ils ne maintiennent aucun compteur parallèle.

## Preuves ciblées

- `tests/api/monde.test.ts` termine réellement tous les nœuds de la Clairière, puis vérifie Filou
  et le fanion sans appel manuel à la route de dépôt.
- `tests/composants/EcranRecompense.test.tsx` vérifie que les deux cadeaux sont annoncés sur la
  victoire régionale.
- Recette ciblée du 3 septembre : 79 tests réussis sur le monde, la récompense, le campement et le
  coffre.
