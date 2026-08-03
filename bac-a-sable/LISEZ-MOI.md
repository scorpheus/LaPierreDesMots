# Bac à sable

**Le dossier de travail des agents.** Tout ce qui est temporaire, exploratoire ou jetable s'écrit
**ici**, et jamais dans le dossier temporaire du système.

## Pourquoi

Écrire hors du projet demandait une autorisation à chaque fichier — pour un script d'inspection, une
page HTML d'essai, une capture. Ce dossier lève ce frottement : il appartient au projet, il est
donc accessible sans rien demander.

Bénéfice inattendu : ce qui est ici **reste visible**. Un script d'inspection écrit dans le
dossier temporaire du système disparaît de la mémoire collective ; ici, la session suivante le
retrouve — et peut s'apercevoir qu'il a déjà été écrit.

## Ce qui va ici

- les pages HTML d'essai et les maquettes jetables ;
- les scripts d'inspection (Python, Node, PowerShell) qui mesurent quelque chose une fois ;
- les captures et rendus intermédiaires qu'on veut regarder ;
- les scripts de campagne multi-agents ;
- les sorties brutes qu'on veut relire avant d'en tirer une conclusion.

## Ce qui NE va pas ici

- **le code de l'application** — il a sa place dans `partage/`, `serveur/`, `client/` ;
- **les tests** — ils vont dans `tests/`, c'est là qu'ils sont exécutés ;
- **les décisions et les mesures qui font foi** — elles vont dans `Docs/`. Une mesure qui compte
  n'est pas un brouillon ;
- **les assets de production** — ils vont dans `contenu/` ou `production/`.

## Règles

1. **Ignoré par git.** Le dépôt reste propre, et « on clone et ça démarre » (D9) n'embarque aucun
   brouillon.
2. **Rien d'important ne vit ici.** Un fichier de ce dossier peut disparaître sans conséquence. Si
   quelque chose mérite de survivre, il change de dossier.
3. **Nommer par intention**, pas par date : `mesurer-saturation-gobi.py` vaut mieux que `test3.py`.
   Un nom qui dit ce qu'il fait évite de le réécrire dans six semaines.
4. **Chacun range ses propres restes**, et uniquement les siens (règle globale de suppression).
