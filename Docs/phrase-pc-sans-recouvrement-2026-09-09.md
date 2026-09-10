# Phrase sur PC à zoom normal

Retour parent : blocs trop hauts et bande claire masquant Filou en bas. Le moteur
de phrase avait une hauteur intrinsèque supérieure à la scène flexible qui le portait ;
son contenu débordait sur l'aide. Tests rouges : bas du moteur à 870,59 pour une aide
commençant à 770 px, puis 846,09 contre 675,41 sur l'autre format.

La phrase déclare désormais sa hauteur naturelle via le contrat des plateaux défilants.
Sur PC (largeur ≥ 1100 et hauteur ≥ 701 pixels CSS), le modèle est au-dessus, le
dessin à gauche et les étiquettes et cases à droite. Le repère d'étape et les marges
de l'en-tête sont compacts ; les réglages de lecture des mots sont conservés.
Sur petit écran le flux naturel permet de défiler sans masquer Filou.

Quatre tests navigateur passent : absence de recouvrement en 1920×904 et 1366×768,
aide atteignable, stabilité lors d'un refus sur téléphone/tablette et acquis inchangés.
Construction de production réussie, servie sur le site local. Vérifications ciblées,
aucune campagne générale relancée.
