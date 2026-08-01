# Licences des polices de lecture

**Écrit par `scripts/telecharger-polices.mjs`. Ne pas modifier à la main** : le script le
régénère, et une empreinte écrite à la main est une empreinte que personne n’a mesurée.

Les fichiers `.woff2` de ce dossier **ne sont pas versionnés**. Leurs licences le
permettraient pour la plupart, mais un dépôt de code n’est pas un miroir de distribution :
ils sont téléchargés à l’installation, et leur empreinte SHA-256 est épinglée ci-dessous.
Un fichier dont l’empreinte diffère n’est **pas** écrit (D9).

| Fichier | Famille | Graisse | Licence | Auteur | Source | SHA-256 | État |
|---|---|---|---|---|---|---|---|
| `andika-regular.woff2` | Andika | 400 | SIL Open Font License 1.1 | SIL Global | https://cdn.jsdelivr.net/npm/@fontsource/andika@5.2.5/files/andika-latin-400-normal.woff2 | `_non épinglée_` | ABSENT |
| `andika-bold.woff2` | Andika | 700 | SIL Open Font License 1.1 | SIL Global | https://cdn.jsdelivr.net/npm/@fontsource/andika@5.2.5/files/andika-latin-700-normal.woff2 | `_non épinglée_` | ABSENT |
| `opendyslexic-regular.woff2` | OpenDyslexic | 400 | SIL Open Font License 1.1 | Abbie Gonzalez | https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.2.5/files/opendyslexic-latin-400-normal.woff2 | `_non épinglée_` | ABSENT |
| `luciole-regular.woff2` | Luciole | 400 | SIL Open Font License 1.1 | Laurent Bourcellier et Jonathan Perez, pour le CTRDV | **source non établie** | `_non épinglée_` | ABSENT |
| `belle-allure-gs.woff2` | Belle Allure GS | 400 | À VÉRIFIER — gratuite pour un usage personnel et éducatif, redistribution non acquise | Jean Boyault | **source non établie** | `_non épinglée_` | ABSENT |

## Pourquoi chaque police est là

- **Andika** (`andika-regular.woff2`) — Police par défaut de toute zone de lecture (v2 § 9.3). Conçue pour l’alphabétisation : « a » et « g » à une boucle, comme dans les manuels.
- **Andika** (`andika-bold.woff2`) — Graisse des mots cibles d’une consigne. La graisse marque, elle n’insiste pas.
- **OpenDyslexic** (`opendyslexic-regular.woff2`) — Embarquée pour l’ADHÉSION, jamais présentée comme un remède (D19). Wery & Diliberto 2017 ne mesure aucune amélioration chez l’enfant.
- **Luciole** (`luciole-regular.woff2`) — Formes très différenciées — candidate sérieuse pour un enfant qui confond des lettres miroir (D23).
- **Belle Allure GS** (`belle-allure-gs.woff2`) — Cursive scolaire française. Sert à reconnaître ce qu’il voit sur son cahier.

## Verdana

Verdana **n’est pas embarquée** et ne peut pas l’être : police système propriétaire, non
redistribuable. Elle reste proposée dans les réglages et rendue par la pile système ;
absente, `client/src/lecture/polices.ts` retombe sur Andika. C’est l’écart n° 5 du contrat
des features v2 § 8, assumé et sans alternative légale.
