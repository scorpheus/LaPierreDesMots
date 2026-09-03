# Choix du compagnon avant une sortie

État au 3 septembre 2026.

La carte demande désormais avec qui partir avant de composer une sortie. Gobi reste toujours
disponible et seuls les compagnons déjà ralliés par le profil sont proposés. Le serveur et le mode
Android autonome vérifient à nouveau ce ralliement : envoyer directement le code d'un compagnon
encore absent ne permet pas de contourner la progression.

Le choix n'est pas seulement décoratif. Le référentiel `contenu/monde/compagnons.json` désigne les
moteurs que chaque compagnon met en avant. Le sélecteur privilégie l'un de ces moteurs au milieu de
la sortie lorsqu'un exercice éligible existe, sans modifier les prérequis, l'échauffement, la
synthèse ni la règle d'un habillage unique.

Les quatre portraits validés ont chacun un mouvement CSS léger dans la bande et dans le choix de
départ : Filou se balance, Roc respire, Plume bondit et Bulle flotte. Ces mouvements s'arrêtent avec
le réglage d'animations calmes et avec `prefers-reduced-motion`.

## Suite artistique distincte

Les compagnons ne possèdent encore aucune planche de sprites : seulement quatre portraits PNG.
Produire de vraies animations articulées demande une passe dédiée par personnage (références,
poses, planche déterministe, découpe et contrôle visuel). Il ne faut pas agrandir artificiellement
les portraits actuels en pseudo-sprites. Cette passe pourra suivre le protocole `hatch-pet`, mais
elle est volontairement séparée de ce raccord fonctionnel afin de ne pas multiplier les générations
d'images sans validation intermédiaire.
