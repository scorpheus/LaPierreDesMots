# Gobi grandit : image perçue comme identique

Après publication, le parent signale que le nom change sur l'écran « Gobi a grandi », mais
qu'il retrouve la même image. Le stade précis affiché est demandé pour reproduire son cas.

Vérifications du 9 septembre :

- `EvolutionGobi` utilise désormais la pose `repos` avant et après la transition.
  `DessinDeGobi` sélectionne `stade-1.webp` à `stade-10.webp` à partir du code de stade.
- Les dix fichiers WebP ont des empreintes SHA-256 distinctes. L'examen des stades 1, 2 et 10
  montre toutefois le même corps, la même pose et le même visage : la différence visible
  concerne principalement les cristaux au sommet de la tête. Le stade nommé « L'Œuf de
  cristal » montre déjà le personnage complet.
- GitHub Pages sert la version `2efaf2a61cb04a9d`. Les images des stades 1, 2 et 10 répondent
  en HTTP 200 et leurs octets correspondent aux fichiers locaux. Cela ne prouve pas la
  version actuellement exécutée par l'onglet du parent. Preuve dans
  `bac-a-sable/diagnostic-gobi-images-publiees.log`.

Le test `EvolutionGobiProgression.test.tsx` vérifie les adresses d'images du composant monté,
pas leur décodage navigateur ni la lisibilité de la transformation. Son commentaire affirmant
qu'il contrôle « l'image réellement chargée » surestime donc sa portée. Le correctif précédent
du branchement des images ne certifiait pas leur différenciation visuelle.

Aucun asset, seuil, libellé ou original de référence n'est modifié dans ce diagnostic. La suite
dépend du stade signalé : distinguer l'ancien écran servi par le cache d'une transformation
graphique trop discrète. Une évolution physique plus marquée serait un changement de direction
artistique à expliciter, au-delà de la règle historique du cristal et du corps constant.
