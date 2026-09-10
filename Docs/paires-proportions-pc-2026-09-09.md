# Proportions du plateau de paires sur PC

La capture parent montre les paires du Marais : mots très étirés, images petites et
plateau tassé en haut. Les colonnes alternaient une largeur flexible et une vignette
bornée ; une règle plus spécifique empêchait aussi la scène de prendre la place restante.

À partir de 1200 pixels CSS, le plateau est centré et borné à 72 rem, les quatre
colonnes ont la même largeur, et cartes et illustrations suivent la hauteur disponible.
La scène prend l'espace restant pour centrer le plateau. Les règles tablette et téléphone
restent celles du jeu. La place réservée aux messages de refus est conservée.

Deux tests PC (1366 et 1920 pixels) constatent avant correction des différences de largeur
de 400 et 677 pixels, puis passent après correction. Ils contrôlent les 12 cartes présentes,
leurs largeurs égales, le centrage, l'image lisible et l'absence de carte hors écran.
Les deux contrôles de stabilité des paires après refus sur téléphone et tablette passent.
La validation reste ciblée ; aucune nouvelle campagne générale lancée.

Les 32 parcours de cadrage existants passent également (plateaux complets, sélection,
paire acquise et rotations tablette/paysage). Construction de production réussie et
servie par le site local 8080.

Retour parent suivant : ensemble encore trop petit. La borne de 72 rem est remplacée
par 94 vw, plafonnée à 1500 px et à la largeur du parent ; les illustrations passent
de 16 à 22 dvh (maximum 240 px), les cartes de 18 à 24 dvh. Les trois formats PC
1366×768, 1366×912 et 1920×912 passent : illustration agrandie, centrage, cartes
équilibrées et toutes présentes à l'écran. Nouvelle construction locale livrée.

La campagne globale du 10 septembre révèle que ce grand gabarit déborde de 59 px sur les
trois plateaux de maîtrise à 16 cartes. Une règle fondée sur la densité — présence d'une
treizième carte, sans liste d'identifiants dans le CSS — conserve les cartes à au moins
144 px et réduit seulement leur part de hauteur. Les six combinaisons formées par
`cite-des-histoires-02`, `cite-des-histoires-12`, `volcan-12` et les viewports
1920×1080/1920×1200 sont gardées explicitement, avec le profil Andika à 27 px.
