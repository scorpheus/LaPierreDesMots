# Licences des polices de lecture

**Écrit par `scripts/telecharger-polices.mjs`. Ne pas modifier à la main** : le script le
régénère, et une empreinte écrite à la main est une empreinte que personne n’a mesurée.

Les fichiers `.woff2` de ce dossier **ne sont pas versionnés**. Leurs licences le
permettraient pour la plupart, mais un dépôt de code n’est pas un miroir de distribution :
ils sont téléchargés à l’installation, et leur empreinte SHA-256 est épinglée ci-dessous.
Un fichier dont l’empreinte diffère n’est **pas** écrit (D9).

| Fichier | Famille | Graisse | Licence | Auteur | Source | SHA-256 | État |
|---|---|---|---|---|---|---|---|
| `andika-regular.woff2` | Andika | 400 | SIL Open Font License 1.1 | SIL Global | https://cdn.jsdelivr.net/npm/@fontsource/andika@5.2.5/files/andika-latin-400-normal.woff2 | `319cc7dee0e22c4cfb68864a254c1ceabfa2df25437aa9d8c3814bfc967fd379` | présent |
| `andika-bold.woff2` | Andika | 700 | SIL Open Font License 1.1 | SIL Global | https://cdn.jsdelivr.net/npm/@fontsource/andika@5.2.5/files/andika-latin-700-normal.woff2 | `7741c884c7aaf187b9cfcdb07ae6cf20017aa050ba60423cee6b56813e8f90ac` | présent |
| `opendyslexic-regular.woff2` | OpenDyslexic | 400 | SIL Open Font License 1.1 | Abbie Gonzalez | https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.2.5/files/opendyslexic-latin-400-normal.woff2 | `f007004af3cda5d8076e57c943f8cc8d00a0da25988b1ae1048683d60e7cac1a` | présent |
| `atkinson-hyperlegible-regular.woff2` | Atkinson Hyperlegible | 400 | SIL Open Font License 1.1 | Braille Institute of America | https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.2.5/files/atkinson-hyperlegible-latin-400-normal.woff2 | `b09653e3ba9d95e26da5c408979f40451990a4573ce5f96abe6982e2fcb09e6c` | présent |
| `atkinson-hyperlegible-bold.woff2` | Atkinson Hyperlegible | 700 | SIL Open Font License 1.1 | Braille Institute of America | https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.2.5/files/atkinson-hyperlegible-latin-700-normal.woff2 | `d8e8b1e0e929651439e25e23ade4b9d6cac073f2444aadb8e8b85431726c2036` | présent |
| `fredoka-variable.woff2` | Fredoka | variable | SIL Open Font License 1.1 | Milena Brandão, Hafontia | https://cdn.jsdelivr.net/npm/@fontsource-variable/fredoka@5.2.5/files/fredoka-latin-wght-normal.woff2 | `5acd18c3fcaab27993b4702c2631653014bb733877d87f99a0d4a0c9a20606de` | présent |

## Pourquoi chaque police est là

- **Andika** (`andika-regular.woff2`) — Police par défaut de toute zone de lecture (v2 § 9.3). Conçue pour l’alphabétisation : « a » et « g » à une boucle, comme dans les manuels.
- **Andika** (`andika-bold.woff2`) — Graisse des mots cibles d’une consigne. La graisse marque, elle n’insiste pas.
- **OpenDyslexic** (`opendyslexic-regular.woff2`) — Embarquée pour l’ADHÉSION, jamais présentée comme un remède (D19). Wery & Diliberto 2017 ne mesure aucune amélioration chez l’enfant.
- **Atkinson Hyperlegible** (`atkinson-hyperlegible-regular.woff2`) — Interface hors zone de lecture. Dessinée pour la basse vision : caractères très différenciés, ce qui sert aussi un enfant qui déchiffre.
- **Atkinson Hyperlegible** (`atkinson-hyperlegible-bold.woff2`) — Graisse de l’interface. Jamais dans une zone de déchiffrage — là, c’est Andika.
- **Fredoka** (`fredoka-variable.woff2`) — Titres et boutons. Ronde et gaie — l’habillage du monde, jamais le texte que l’enfant déchiffre.

## Verdana

Verdana **n’est pas embarquée** et ne peut pas l’être : police système propriétaire, non
redistribuable. Elle reste proposée dans les réglages et rendue par la pile système ;
absente, `client/src/lecture/polices.ts` retombe sur Andika. C’est l’écart n° 5 du contrat
des features v2 § 8, assumé et sans alternative légale.
