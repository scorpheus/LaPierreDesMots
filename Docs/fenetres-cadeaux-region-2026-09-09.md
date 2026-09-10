# Cadeaux de région consultables

Demande du 9 septembre : les enfants touchent les annonces de récompense pour voir leur gain.

L’écran de récompense rend consultables le compagnon rallié, l’objet rapporté au campement
et l’annonce des régions nouvellement ouvertes. Chaque bouton ouvre une fenêtre avec le nom
et l’illustration déjà utilisés dans le jeu. Les régions sont accompagnées de la carte du monde.
Les boutons gardent les attributs de contrôle existants et une cible minimale de 64 pixels.

L’ouverture ne déclenche aucune écriture dans le journal, aucune remise de cadeau et aucune
navigation. Les cartes de compagnon et d’objet gardent leur condition existante : région
terminée et acquisition présente dans le monde. Une région ouverte est annoncée seulement
si elle était fermée dans l’instantané précédent. Consulter une collection ne déclenche rien.

L’évolution de Gobi possède déjà sa fenêtre `EvolutionGobi`, déclenchée par un changement
effectif de stade entre deux états du monde. Ce comportement est conservé.

Vérification ciblée : `tests/composants/cadeaux-region-fenetre.test.tsx` contrôle l’ouverture,
le nom, l’image exacte et la fermeture. Les suites sont exécutées par l’orchestrateur lors
de l’intégration ; ce document ne constitue pas un verdict de campagne.
