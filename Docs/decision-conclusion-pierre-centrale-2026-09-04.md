# Décision — la Pierre centrale conclut le voyage

Date : 4 septembre 2026.

## Décision parentale appliquée

La zone centrale de la carte n'est plus La Clairière. Elle représente la Pierre des Mots
brisée et devient la conclusion du parcours : après l'obtention des six Éclats régionaux,
l'enfant peut la toucher pour ouvrir une célébration courte. La Clairière est le premier départ,
placé sur le chemin du sud déjà dessiné dans le raster.

Cette décision complète la v2 sans modifier ses documents de référence : les six régions,
leur ordre phonologique, leurs nœuds et leurs Éclats restent inchangés (v2 § 3.3). La Pierre
centrale n'est donc ni une septième région, ni un nœud pédagogique, ni une nouvelle monnaie.

## Règle de progression

`conclusionCentraleAccessible(carte)` est la règle unique. Elle devient vraie exactement quand
les six `eclatObtenuLe` sont renseignés. Le pourcentage de recoloration ne suffit pas : l'Éclat
est la récompense narrative qui fait foi, et la conclusion ne peut pas devancer son écriture
dans le journal.

La carte reste jouable après cette célébration : les prises de régions déjà terminées conservent
le repli de rejouabilité R14. La conclusion est réouvrable depuis la Pierre, sans récompense
supplémentaire ni état persistant à synchroniser.

## Rendu et limites assumées

Le raster existant `contenu/assets/decors/carte-six-regions.png` est réemployé. Le masque de la
Clairière couvre désormais le chemin/pré au sud ; un masque distinct révèle la Pierre centrale
uniquement à la conclusion. Aucun asset, nœud, fichier de contenu enfant ni image n'a été créé
ou modifié.

La célébration est volontairement courte : elle donne une vraie fin lisible, sans inventer une
cinématique, une voix ou une séquence d'images qui exigeraient une validation artistique et
éditoriale distincte.

## Garde-fous exécutés

- `tests/unitaires/carte.test.ts` vérifie qu'un Éclat manquant garde le centre fermé et que six
  recolorations sans Éclat ne l'ouvrent pas.
- `tests/composants/EcranCarte.test.tsx` vérifie l'ancre centrale, le déplacement de la
  Clairière, la cible accessible et le panneau de conclusion.
- `tests/unitaires/ton-sans-perte.test.ts` couvre les nouveaux textes enfant.

Mesure du 4 septembre 2026 : ces trois fichiers passent, soit 57 tests. La validation globale,
la compilation et la construction ne sont pas exécutées dans ce sous-lot, conformément à la
règle de jeton unique de la campagne.
