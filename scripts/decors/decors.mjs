/**
 * LES 53 SCÈNES — lot M6, contrat du monde v4 § 2 (M6).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER REMPLACE, MESURÉ AVANT D'ÊTRE JUGÉ
 *
 * `find contenu/habillages -name "*.svg" -size -1000c | wc -l` → **40** le 2026-08-02, dont
 * 3 au campement (M8) et 1 archivé au registre (`galeries/grottes.svg`) : **36 bouchons**
 * appartiennent à M6, et l'inventaire du v4 § 1.2 les décrit exactement — « les 39 sont le
 * même fichier à l'identifiant près » : un `<rect>` de fond, six `<rect>` arrondis de
 * 200 × 160 en grille 3 × 2, un cadre.
 *
 * Ce que ça donnait à l'enfant, littéralement : dans `clairiere/lucioles.svg`, **une luciole,
 * un buisson, la lune et un sentier étaient le même rectangle**, et `galeries/pierre.svg`
 * déclarait six régions de surface `32000.0` identique. La consigne « colorie la lune en
 * jaune » ne mesurait donc pas la lecture — elle mesurait la chance. C'est la réponse
 * littérale au défaut n° 5 du père, « comment déterminer la maîtresse ? ».
 *
 * ── LES SIX RÈGLES DE DESSIN, TOUTES OPPOSABLES (v2 § 9, annexe P § 2, v4 § 2) ─────────────
 *  1. **Trait noir sur blanc, coloriable par le code.** Aucune couleur ici : fond parchemin,
 *     régions en grisaille, contour `--trait`. La couleur vient du code, au rendu.
 *  2. **Trois calques**, `fond` → `zones` → `trait`, et chaque région est un ENFANT DIRECT de
 *     `#calque-zones`.
 *  3. **Régions fermées par construction** : les formes sont des listes de sommets, l'émetteur
 *     pose le `Z`, et il refuse d'écrire si `estCheminFerme` dit non.
 *  4. **Reconnaissable sans légende.** Chaque objet porte le signe qui le désigne : un arbre a
 *     un tronc et un houppier LOBÉ (un disque parfait se lit « ballon »), une grenouille a
 *     deux yeux au-dessus du crâne et deux pattes, un poisson une queue fourchue.
 *  5. **Deux régions d'un même décor n'ont jamais la même silhouette ni la même surface.**
 *     Mesuré par l'émetteur, qui refuse d'écrire sinon.
 *  6. **Aucun identifiant ne meurt.** Les 6 régions de chaque bouchon sont reprises À LA
 *     LETTRE et re-dessinées ; les régions ajoutées sont neuves. Une consigne qui nommerait
 *     une région disparue serait un état sans issue — le pire défaut possible ici.
 *
 * ── POURQUOI DES RÉGIONS EN PLUS, ET COMBIEN ───────────────────────────────────────────────
 * Les bouchons portaient 6 régions ; ces scènes en portent 6 à 10. Ce n'est pas de
 * l'ornement : `pourcentageColorie` (D25) fait de la surface non colorée « ce que la carte
 * donne à voir », et six pavés donnaient six paliers de 16 %. Le plafond de 40 du v4 § 2 n'est
 * jamais approché — le décor le plus riche du dépôt, `ecole-v2.svg`, en porte 31 et il n'est
 * pas touché ici.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */

import * as F from './formes.mjs';

const L = 960;
const H = 600;

/** Bande de ciel : bord supérieur droit, bord inférieur ondulé à la hauteur `h`. */
const ciel = (h, amp = 12, ondes = 3) => [[0, 0], [L, 0], ...F.onde(L, 0, h, amp, ondes)];

/** Bande de sol : bord supérieur ondulé à `y`, jusqu'au bas de la scène. */
const sol = (y, amp = 10, ondes = 4) => F.bandeau(0, L, y, H, amp, ondes);

/** Un tracé du calque de trait : polyligne ouverte, jamais remplie. */
const ligne = (points) => `M${points.map(([x, y]) => `${x},${y}`).join(' L')}`;

/** Une région coloriable. `anneaux` : une liste de sommets, ou une liste d'anneaux. */
const z = (id, libelle, anneaux, extra = {}) => ({ id, libelle, anneaux, ...extra });

/** Les timings par défaut, repris des habillages existants. */
const TEMPO = { appuiMs: 60, relachementMs: 120, refusMs: 180, recolorationMs: 800, interEtoilesMs: 180 };

const NUANCIER = {
  clairiere: ['vert', 'jaune', 'bleu', 'brun', 'rose', 'blanc'],
  galeries: ['violet', 'bleu', 'gris', 'blanc', 'brun', 'noir'],
  'marais-jumeau': ['bleu', 'vert', 'gris', 'violet', 'brun', 'blanc'],
  'foret-muette': ['vert', 'brun', 'gris', 'noir', 'blanc', 'jaune'],
  volcan: ['rouge', 'orange', 'jaune', 'noir', 'gris', 'brun'],
  'cite-des-histoires': ['orange', 'jaune', 'rose', 'violet', 'blanc', 'brun'],
};

/**
 * Les décors maîtres validés sont servis comme fond illustré pour les moteurs de
 * placement, tri, phrase, etc. Le SVG généré reste présent (et ses régions restent
 * tapables) mais sa géométrie est masquée pour éviter le blockout par-dessus l'image.
 * Les scènes `colorie` ne prennent un raster que lorsqu'il est explicitement déclaré dans
 * leur fiche : leurs zones transparentes restent alors le masque tactile du moteur.
 */
function fondRasterExercice(spec) {
  // Les moteurs colorie/libre ont leur propre contrat de calques (fond/trait/masques).
  // Ne pas leur substituer un maître complet : cela neutraliserait la recoloration.
  if (spec.moteurs?.some((moteur) => moteur === 'colorie' || moteur === 'libre')) return undefined;
  const nom = spec.fichier.replace(/\.svg$/u, '').split('/').pop();
  const prefixe = spec.region === 'marais-jumeau'
    ? 'marais'
    : spec.region === 'foret-muette'
      ? 'foret'
      : spec.region === 'cite-des-histoires'
      ? 'cite'
      : spec.region;
  return `/api/contenu/assets/assets/decors/exercices/${prefixe}-${nom}.png`;
}

/** Complète une scène : viewBox par défaut, chemin du `.habillage.json` dérivé du SVG. */
function scene(spec) {
  const fondRaster = fondRasterExercice(spec);
  return {
    viewBox: '0 0 960 600',
    traits: [],
    timings: TEMPO,
    nuancier: NUANCIER[spec.region],
    ...spec,
    ...(spec.fondIllustre || !fondRaster ? {} : {
      fondIllustre: fondRaster,
      masquerGeometrie: true,
    }),
    fichierHabillage: `habillages/${spec.fichier.replace(/\.svg$/u, '.habillage.json')}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════ LA CLAIRIÈRE (8)

const CLAIRIERE = [
  scene({
    habillage: 'clairiere.collier',
    fichier: 'clairiere/collier.svg',
    libelle: 'Le collier de perles',
    description:
      'Un coffret ouvert dans la mousse, un fil tendu qui retombe, et trois perles de trois ' +
      'tailles enfilées dessus. Les trois perles diffèrent par le diamètre : « la deuxième » ' +
      'se désigne sans compter.',
    region: 'clairiere',
    moteurs: ['assemble'],
    zones: [
      z('ciel-du-matin', 'le ciel du matin', ciel(152, 14, 3)),
      z('mousse', 'la mousse', F.lobe(140, 540, 96, 5, 0.68, 44, 0.4, 0.5)),
      z('herbe-du-bord', 'l’herbe du bord', F.touffes(520, 950, 566, 46, 8, 22)),
      z('coffret', 'le coffret', [[300, 486], [344, 440], [618, 440], [662, 486], [662, 564], [300, 564]]),
      z('fil', 'le fil', F.ruban([[180, 218], [280, 300], [400, 350], [480, 362], [560, 350], [680, 300], [780, 218]], 11)),
      z('perle-un', 'la première perle', F.ellipse(300, 302, 37, 37, 18)),
      z('perle-deux', 'la deuxième perle', F.ellipse(480, 364, 47, 47, 20)),
      z('perle-trois', 'la troisième perle', F.ellipse(660, 302, 27, 27, 16)),
      z('feuille-posee', 'la feuille posée', F.poser('feuilleDentee', 726, 452, 122, 98)),
      z('caillou', 'le caillou', F.lobe(846, 546, 50, 4, 0.8, 32, 0.9, 0.6)),
    ],
    traits: [
      ligne([[300, 486], [662, 486]]),
      ligne([[481, 440], [481, 486]]),
      ligne([[180, 218], [180, 250]]),
      ligne([[780, 218], [780, 250]]),
    ],
  }),

  scene({
    habillage: 'clairiere.guirlande',
    fichier: 'clairiere/guirlande.svg',
    libelle: 'La guirlande de fanions',
    description:
      'Une corde tendue entre un piquet et le bord, trois fanions triangulaires de trois ' +
      'tailles qui y pendent, un lampion, et la pelouse dessous.',
    region: 'clairiere',
    moteurs: ['phrase'],
    zones: [
      z('ciel-de-fete', 'le ciel de fête', ciel(140, 16, 2)),
      z('pelouse', 'la pelouse', sol(500, 12, 3)),
      z('corde-tendue', 'la corde tendue', F.ruban([[60, 150], [240, 230], [480, 268], [720, 230], [900, 150]], 15)),
      z('fanion-un', 'le premier fanion', F.poser('fanion', 200, 216, 112, 132)),
      z('fanion-deux', 'le deuxième fanion', F.poser('fanion', 420, 256, 126, 152)),
      z('fanion-trois', 'le troisième fanion', F.poser('fanion', 652, 234, 96, 116)),
      z('piquet', 'le piquet', F.rect(878, 148, 28, 362)),
      z('lampion', 'le lampion', F.poser('lanterne', 78, 178, 92, 122)),
      z('fleur', 'la fleur', F.etoile(152, 540, 46, 20, 6)),
      z('caillou-du-pre', 'le caillou du pré', F.lobe(762, 552, 44, 5, 0.76, 32, 1.2, 0.62)),
    ],
    traits: [ligne([[860, 512], [924, 512]]), ligne([[124, 300], [124, 340]])],
  }),

  scene({
    habillage: 'clairiere.lianes',
    fichier: 'clairiere/lianes.svg',
    libelle: 'Les lianes',
    description:
      'Une branche épaisse en travers, trois lianes de longueurs différentes qui en pendent, ' +
      'deux houppiers lobés, un champignon au sol.',
    region: 'clairiere',
    moteurs: ['chemin'],
    zones: [
      z('jour-entre-branches', 'le jour entre les branches', ciel(118, 10, 4)),
      z('clairiere-sol', 'le sol de la clairière', sol(500, 14, 3)),
      z('branche', 'la branche', F.ruban([[40, 182], [300, 150], [620, 168], [930, 140]], 26)),
      z('liane-un', 'la première liane', F.ruban([[180, 180], [170, 230], [182, 280], [170, 330], [184, 380], [170, 428], [180, 470]], 16)),
      z('liane-deux', 'la deuxième liane', F.ruban([[440, 168], [456, 222], [440, 276], [458, 330], [442, 384], [458, 434], [444, 478]], 20)),
      z('liane-trois', 'la troisième liane', F.ruban([[720, 174], [706, 232], [720, 290], [704, 348], [718, 406], [704, 448], [716, 486]], 13)),
      z('feuillage', 'le feuillage', F.lobe(762, 108, 122, 6, 0.66, 44, 0.2, 0.6)),
      z('houppier-gauche', 'le houppier de gauche', F.lobe(180, 96, 92, 5, 0.7, 44, 1, 0.55)),
      z('champignon-du-sol', 'le champignon du sol', F.poser('champignon', 74, 468, 112, 112)),
      z('pierre-mousse', 'la pierre moussue', F.lobe(872, 542, 56, 4, 0.8, 32, 0.5, 0.6)),
    ],
    traits: [ligne([[40, 196], [930, 158]]), ligne([[120, 540], [860, 528]])],
  }),

  scene({
    habillage: 'clairiere.luciole',
    fichier: 'clairiere/luciole.svg',
    libelle: 'La luciole qui clignote',
    description:
      'La nuit, une lune fine, une étoile, une tige qui monte du sol, la feuille large qu’elle ' +
      'porte, et le halo rayonnant de la luciole posée dessus.',
    region: 'clairiere',
    moteurs: ['eclair'],
    zones: [
      z('nuit', 'la nuit', ciel(300, 18, 2)),
      z('herbe-courte', 'l’herbe courte', F.touffes(0, 960, 554, 34, 16, 26)),
      z('rocher-plat', 'le rocher plat', [[600, 470], [822, 452], [860, 506], [560, 516]]),
      z('tige', 'la tige', F.ruban([[300, 540], [290, 440], [312, 350], [300, 300]], 14)),
      z('feuille-large', 'la feuille large', F.poser('feuilleDentee', 332, 268, 182, 152)),
      z('halo', 'le halo', F.etoile(300, 250, 86, 40, 10)),
      // ── R7 bis : LA LUCIOLE N'ÉTAIT PAS DESSINÉE ────────────────────────────────────────────
      //
      // Trouvé en jouant, le 2026-08-03 : « j'ai touché la luciole, mais je ne vois aucune
      // luciole sur l'écran ». Il avait raison, et c'était mesurable en une commande — les
      // identifiants du SVG produit :
      //
      //     calque-fond · calque-trait · calque-zones · etoile-du-soir · feuille-large
      //     halo · herbe-courte · lune-fine · nuit · rocher-plat · souche-basse · tige
      //
      // Le halo était là, l'insecte non. La scène s'appelle « La luciole qui clignote », son
      // `<desc>` parle du « halo rayonnant de la luciole posée dessus », `MoteurEclair` la fait
      // clignoter — et rien ne la dessinait. Un oubli de description, invisible à toute
      // vérification : le SVG était valide, ses régions fermées, ses surfaces justes.
      //
      // La forme existait déjà et servait TROIS fois dans `clairiere.lucioles` ; seule cette
      // scène-ci, celle du singulier, ne l'appelait pas.
      //
      // Placement : centrée sur le halo (300, 250), donc au sommet de la tige qui culmine à
      // (300, 300) — son abdomen chevauche la pointe, elle est POSÉE dessus et ne flotte pas.
      // Taille 120 × 128, entre la « haute » (132 × 138) et la « basse » (96 × 102) de l'autre
      // scène : c'est le sujet du tableau, elle doit primer sur les trois de la ronde.
      z('luciole', 'la luciole', F.poser('luciole', 240, 186, 120, 128)),
      z('lune-fine', 'la lune fine', F.croissant(842, 122, 58, 26)),
      z('etoile-du-soir', 'l’étoile du soir', F.etoile(140, 110, 30, 13, 5)),
      z('souche-basse', 'la souche basse', F.poser('souche', 56, 466, 142, 112)),
    ],
    traits: [ligne([[420, 344], [500, 330]]), ligne([[420, 366], [492, 356]])],
  }),

  scene({
    habillage: 'clairiere.lucioles',
    fichier: 'clairiere/lucioles.svg',
    libelle: 'La ronde des lucioles',
    description:
      'Un sentier clair qui serpente, l’herbe haute d’un côté, un buisson lobé de l’autre, la ' +
      'lune en croissant, et trois lucioles de trois tailles — la haute, la basse, la lointaine.',
    region: 'clairiere',
    moteurs: ['attrape'],
    zones: [
      z('nuit-claire', 'la nuit claire', ciel(258, 16, 3)),
      z('sentier', 'le sentier', F.ruban([[60, 570], [260, 520], [480, 540], [700, 500], [930, 530]], 48)),
      z('herbe-haute', 'l’herbe haute', F.touffes(0, 500, 554, 76, 9, 22)),
      z('buisson', 'le buisson', F.lobe(762, 468, 110, 6, 0.68, 44, 0.5, 0.7)),
      z('lune', 'la lune', F.croissant(862, 120, 64, 28)),
      z('luciole-haute', 'la luciole du haut', F.poser('luciole', 250, 140, 132, 138)),
      z('luciole-basse', 'la luciole du bas', F.poser('luciole', 424, 292, 96, 102)),
      z('luciole-lointaine', 'la luciole lointaine', F.poser('luciole', 636, 200, 66, 70)),
      z('fleur-de-nuit', 'la fleur de nuit', F.etoile(120, 300, 40, 17, 6)),
    ],
    traits: [ligne([[60, 592], [930, 552]])],
  }),

  scene({
    habillage: 'clairiere.paniers',
    fichier: 'clairiere/paniers.svg',
    libelle: 'Les deux paniers',
    description:
      'Une table couverte d’une nappe, deux paniers à anse de deux tailles, et trois fruits ' +
      'qu’on distingue à la forme : la pomme ronde, la poire en poire, la prune petite.',
    region: 'clairiere',
    moteurs: ['tri'],
    zones: [
      z('mur-du-fond', 'le mur du fond', ciel(168, 8, 2)),
      z('nappe', 'la nappe', [[80, 400], [880, 400], [922, 470], [38, 470]]),
      z('table', 'la table', [[38, 470], [922, 470], [900, 562], [60, 562]]),
      z('panier-gauche', 'le panier de gauche', F.poser('panier', 178, 180, 222, 212)),
      z('panier-droit', 'le panier de droite', F.poser('panier', 562, 202, 190, 188)),
      z('pomme', 'la pomme', F.poser('pomme', 438, 286, 98, 102)),
      z('poire', 'la poire', F.poser('poire', 820, 268, 86, 118)),
      z('prune', 'la prune', F.ellipse(122, 330, 32, 34, 18)),
      z('bol', 'le bol', [[430, 402], [546, 402], [524, 462], [452, 462]]),
    ],
    traits: [ligne([[100, 562], [100, 596]]), ligne([[860, 562], [860, 596]]), ligne([[38, 470], [922, 470]])],
  }),

  scene({
    habillage: 'clairiere.veillee',
    fichier: 'clairiere/veillee.svg',
    libelle: 'La veillée autour du feu',
    description:
      'Le ciel étoilé, une tente plantée à gauche, le feu en langues de flammes, la bûche ' +
      'posée à côté, la couverture étalée et la marmite à anse.',
    region: 'clairiere',
    moteurs: ['histoire'],
    zones: [
      z('ciel-etoile', 'le ciel étoilé', ciel(300, 14, 2)),
      z('sol-de-la-clairiere', 'le sol de la clairière', sol(498, 12, 4)),
      z('tente', 'la tente', F.poser('tente', 58, 250, 300, 250)),
      z('feu', 'le feu', F.flammes(422, 558, 470, 128, 5, 22)),
      z('buche', 'la bûche', [[398, 486], [580, 470], [590, 508], [404, 524]]),
      z('couverture', 'la couverture', [[640, 468], [882, 448], [904, 530], [618, 532]]),
      z('marmite', 'la marmite', F.poser('marmite', 700, 328, 152, 132)),
      z('lune-pleine', 'la lune pleine', F.ellipse(862, 110, 52, 52, 20)),
      z('etoile-filante', 'l’étoile filante', F.etoile(200, 118, 34, 14, 5)),
    ],
    traits: [ligne([[404, 496], [584, 480]]), ligne([[720, 460], [820, 460]])],
  }),

  // ── ENRICHISSEMENT 1/3 : le décor `place` passe de 3 zones à 9 régions. Les trois zones
  //    de dépôt suivent désormais l’illustration validée : ciel dégagé, pan bleu du toit et
  //    espace libre à droite du banc. « Ce qui est tapable est ce qui est visible. »
  scene({
    habillage: 'clairiere.ecole-place',
    fichier: 'clairiere/ecole-place.svg',
    viewBox: '0 0 922 615',
    libelle: 'La cour de l’école — à toi de placer',
    description:
      'La cour illustrée : l’école, sa maîtresse, le banc, les arbres et les trois zones où ' +
      'placer les dessins.',
    region: 'clairiere',
    moteurs: ['place'],
    fondIllustre: '/api/contenu/assets/assets/decors/ecole.png',
    masquerGeometrie: true,
    zones: [
      z('herbe-cour', 'l’herbe de la cour', F.bandeau(0, 922, 398, 615, 9, 5)),
      z('mur-ecole', 'le mur de l’école', F.rect(190, 258, 160, 142)),
      z('porte-ecole', 'la porte de l’école', F.arche(270, 400, 62, 78)),
      z('arbre-feuilles', 'les feuilles de l’arbre', F.lobe(640, 250, 108, 6, 0.68, 44, 0.4, 0.72)),
      z('arbre-tronc', 'le tronc de l’arbre', F.rect(622, 330, 36, 84)),
      z('banc-assise', 'l’assise du banc', F.rect(38, 466, 114, 26)),
      // Coordonnées mesurées sur `contenu/assets/decors/ecole.png` (1536×1024), ramenées
      // dans le viewBox 922×615 : ciel dégagé, pan bleu du toit central, puis banc de gauche.
      z('ciel', 'le ciel', F.rect(600, 20, 160, 75), { fill: 'none', trait: 'stroke-width="2" stroke-dasharray="8 7"' }),
      z('toit-ecole', 'le toit de l’école', [[315, 120], [425, 43], [520, 125], [520, 170], [315, 170]], { fill: 'none', trait: 'stroke-width="2" stroke-dasharray="8 7"' }),
      z('a-cote-du-banc', 'à côté du banc', [[70, 335], [245, 335], [275, 450], [55, 450]], { fill: 'none', trait: 'stroke-width="2" stroke-dasharray="8 7"' }),
    ],
    traits: [
      ligne([[175, 260], [270, 196], [365, 260]]),
      ligne([[52, 492], [52, 542]]),
      ligne([[138, 492], [138, 542]]),
      ligne([[0, 400], [922, 400]]),
    ],
  }),
];

// ══════════════════════════════════════════════════════════════════════════ LES GALERIES (11)

const GALERIES = [
  scene({
    habillage: 'galeries.cristal',
    fichier: 'galeries/cristal.svg',
    libelle: 'Le cristal qui s’allume',
    description:
      'Deux cristaux facettés de deux hauteurs sur un socle taillé, une stalactite fine, la ' +
      'goutte qui en tombe, une veine lumineuse dans la paroi, l’ombre longue au sol.',
    region: 'galeries',
    moteurs: ['eclair'],
    zones: [
      z('paroi-humide', 'la paroi humide', ciel(358, 16, 3)),
      z('sol-de-la-galerie', 'le sol de la galerie', sol(538, 8, 5)),
      z('ombre-longue', 'l’ombre longue', [[240, 520], [900, 500], [930, 558], [210, 566]]),
      z('socle', 'le socle', F.trapeze(430, 470, 262, 342, 86)),
      z('cristal-clair', 'le cristal clair', F.cristal(360, 150, 152, 322)),
      z('cristal-sombre', 'le cristal sombre', F.cristal(544, 230, 112, 242, 0.3)),
      z('gouttes', 'les gouttes', F.goutte(762, 150, 26, 92)),
      z('stalactite-fine', 'la stalactite fine', F.goutte(160, 58, 18, 142)),
      z('veine-lumineuse', 'la veine lumineuse', F.ruban([[40, 120], [180, 220], [120, 340], [222, 452]], 14)),
      z('galet', 'le galet', F.lobe(846, 540, 48, 4, 0.8, 32, 0.7, 0.6)),
    ],
    traits: [ligne([[360, 210], [360, 460]]), ligne([[544, 274], [544, 466]])],
  }),

  scene({
    habillage: 'galeries.echo-conte',
    fichier: 'galeries/echo-conte.svg',
    libelle: 'La salle des échos',
    description:
      'Une voûte en anneau qui coiffe la salle, le banc de pierre, le cristal du conte, la ' +
      'lampe accrochée, la flaque étalée au sol et un gradin taillé.',
    region: 'galeries',
    moteurs: ['histoire'],
    zones: [
      z('sol-des-echos', 'le sol des échos', sol(520, 10, 4)),
      z('voute-des-echos', 'la voûte des échos', [F.arche(480, 300, 900, 300), F.arche(480, 300, 762, 232)]),
      z('banc-de-pierre', 'le banc de pierre', [[180, 440], [420, 430], [432, 486], [172, 494]]),
      z('cristal-du-conte', 'le cristal du conte', F.cristal(620, 300, 132, 192)),
      z('lampe-du-conte', 'la lampe du conte', F.poser('lanterne', 760, 198, 112, 152)),
      z('flaque-des-echos', 'la flaque des échos', F.lobe(420, 542, 122, 5, 0.7, 44, 0.9, 0.32)),
      z('gradin-de-pierre', 'le gradin de pierre', [[600, 468], [900, 456], [914, 520], [590, 528]]),
      z('stalactite-du-conte', 'la stalactite du conte', F.goutte(300, 118, 24, 122)),
      z('echo-cristal-petit', 'le petit cristal de l’écho', F.cristal(248, 340, 80, 122)),
    ],
    traits: [ligne([[180, 466], [426, 456]]), ligne([[620, 340], [620, 486]])],
  }),

  scene({
    habillage: 'galeries.echos',
    fichier: 'galeries/echos.svg',
    libelle: 'Les cristaux qui se répondent',
    description:
      'Une niche en anneau creusée dans la paroi, quatre cristaux de quatre hauteurs qui s’y ' +
      'répondent, une goutte suspendue et le tapis de sable au sol.',
    region: 'galeries',
    moteurs: ['paires'],
    zones: [
      z('paroi-du-fond', 'la paroi du fond', ciel(148, 10, 3)),
      z('tapis-de-sable', 'le tapis de sable', sol(500, 9, 6)),
      z('niche-des-echos', 'la niche des échos', [F.arche(480, 420, 760, 360), F.arche(480, 420, 622, 300)]),
      z('cristal-echo-un', 'le premier cristal', F.cristal(200, 200, 122, 242)),
      z('cristal-echo-deux', 'le deuxième cristal', F.cristal(380, 250, 96, 202)),
      z('cristal-echo-trois', 'le troisième cristal', F.cristal(580, 230, 112, 222)),
      z('cristal-echo-quatre', 'le quatrième cristal', F.cristal(762, 270, 84, 182)),
      z('goutte-suspendue', 'la goutte suspendue', F.goutte(480, 78, 22, 112)),
      z('galet-plat', 'le galet plat', F.lobe(120, 540, 60, 4, 0.82, 32, 1.4, 0.4)),
    ],
    traits: [ligne([[200, 260], [200, 436]]), ligne([[580, 292], [580, 446]])],
  }),

  scene({
    habillage: 'galeries.frise',
    fichier: 'galeries/frise.svg',
    libelle: 'La frise gravée de la grotte',
    description:
      'Un bandeau creusé dans la paroi, quatre cases gravées de quatre tailles à lire de ' +
      'gauche à droite, une torche qui les éclaire et un éclat tombé au sol.',
    region: 'galeries',
    moteurs: ['chrono'],
    zones: [
      z('paroi-du-haut', 'la paroi du haut', ciel(120, 8, 4)),
      z('sol-de-la-frise', 'le sol de la frise', sol(520, 7, 5)),
      z('bandeau-de-frise', 'le bandeau de la frise', [[60, 200], [900, 188], [908, 432], [52, 444]]),
      z('case-de-frise-un', 'la première case de la frise', F.rect(90, 230, 170, 172)),
      z('case-de-frise-deux', 'la deuxième case de la frise', F.rect(288, 220, 182, 192)),
      z('case-de-frise-trois', 'la troisième case de la frise', F.rect(500, 236, 160, 158)),
      z('case-de-frise-quatre', 'la quatrième case de la frise', F.rect(690, 222, 196, 178)),
      z('torche-de-frise', 'la torche de la frise', F.poser('torche', 876, 60, 72, 150)),
      z('eclat-tombe', 'l’éclat tombé', F.cristal(140, 466, 70, 92)),
    ],
    traits: [
      ligne([[120, 300], [230, 300]]), ligne([[120, 340], [200, 340]]),
      ligne([[320, 300], [440, 300]]), ligne([[320, 350], [400, 350]]),
      ligne([[530, 300], [630, 300]]), ligne([[720, 300], [850, 300]]),
    ],
  }),

  scene({
    habillage: 'galeries.paroi-libre',
    fichier: 'galeries/paroi-libre.svg',
    libelle: 'La paroi qu’on peint comme on veut',
    description:
      'Deux pans de paroi de deux tailles, la veine de cristal qui les traverse, une goutte de ' +
      'pluie, une pierre ronde, une niche vide et un cristal oublié.',
    region: 'galeries',
    moteurs: ['libre'],
    zones: [
      z('ombre-du-fond', 'l’ombre du fond', ciel(228, 14, 2)),
      z('sol-de-la-paroi', 'le sol de la paroi', sol(540, 9, 4)),
      z('grande-paroi', 'la grande paroi', [[60, 180], [520, 158], [542, 470], [40, 492]]),
      z('petite-paroi', 'la petite paroi', [[600, 240], [900, 228], [912, 450], [590, 462]]),
      z('veine-de-cristal', 'la veine de cristal', F.ruban([[80, 300], [220, 248], [360, 320], [500, 268]], 18)),
      z('goutte-de-pluie', 'la goutte de pluie', F.goutte(700, 148, 24, 102)),
      z('pierre-ronde', 'la pierre ronde', F.lobe(300, 528, 74, 4, 0.82, 32, 0.6, 0.7)),
      z('niche-vide', 'la niche vide', F.arche(762, 430, 182, 152)),
      z('cristal-oublie', 'le cristal oublié', F.cristal(866, 300, 80, 132)),
    ],
    traits: [ligne([[80, 240], [500, 220]]), ligne([[620, 300], [880, 292]])],
  }),

  scene({
    habillage: 'galeries.passage',
    fichier: 'galeries/passage.svg',
    libelle: 'Le passage aux pierres plates',
    description:
      'Un ruisseau qui traverse en serpentant, trois pierres plates de trois tailles pour le ' +
      'franchir, les deux rives, une lanterne accrochée et une stalactite au-dessus.',
    region: 'galeries',
    moteurs: ['chemin'],
    zones: [
      z('paroi-du-passage', 'la paroi du passage', ciel(200, 12, 3)),
      z('ruisseau', 'le ruisseau', F.ruban(F.onde(0, 960, 500, 26, 2, 24), 92)),
      z('rive-gauche', 'la rive gauche', [[0, 540], [240, 518], [200, 600], [0, 600]]),
      z('rive-droite', 'la rive droite', [[760, 518], [960, 540], [960, 600], [740, 600]]),
      z('pierre-plate-un', 'la première pierre plate', F.lobe(200, 500, 72, 4, 0.84, 28, 0.3, 0.42)),
      z('pierre-plate-deux', 'la deuxième pierre plate', F.lobe(450, 470, 88, 4, 0.86, 28, 1.1, 0.4)),
      z('pierre-plate-trois', 'la troisième pierre plate', F.lobe(700, 506, 64, 4, 0.8, 28, 2, 0.45)),
      z('lanterne-du-passage', 'la lanterne du passage', F.poser('lanterne', 820, 138, 112, 162)),
      z('stalactite-du-passage', 'la stalactite du passage', F.goutte(560, 58, 26, 132)),
    ],
    traits: [ligne([[876, 60], [876, 140]])],
  }),

  scene({
    habillage: 'galeries.pierre',
    fichier: 'galeries/pierre.svg',
    libelle: 'La pierre à graver',
    description:
      'La dalle inclinée qu’on grave, le sillon déjà creusé, le burin posé, l’éclat détaché, ' +
      'la torche au mur et un copeau de pierre au sol.',
    region: 'galeries',
    moteurs: ['grave'],
    zones: [
      z('paroi-seche', 'la paroi sèche', ciel(178, 10, 3)),
      z('sol-de-la-salle', 'le sol de la salle', sol(520, 8, 5)),
      z('dalle', 'la dalle', [[180, 240], [760, 224], [792, 470], [150, 486]]),
      z('sillon', 'le sillon', F.ruban([[260, 320], [420, 298], [560, 350], [700, 320]], 22)),
      z('burin', 'le burin', F.poser('burin', 778, 148, 62, 192)),
      z('eclat', 'l’éclat', F.cristal(120, 428, 70, 102)),
      z('torche', 'la torche', F.poser('torche', 56, 118, 82, 172)),
      z('copeau-de-pierre', 'le copeau de pierre', [[820, 500], [900, 486], [914, 528], [830, 542]]),
      z('goutte-sur-la-dalle', 'la goutte sur la dalle', F.goutte(872, 300, 20, 82)),
    ],
    traits: [ligne([[200, 260], [740, 246]]), ligne([[200, 452], [764, 438]])],
  }),

  scene({
    habillage: 'galeries.stalagmites',
    fichier: 'galeries/stalagmites.svg',
    libelle: 'Les stalagmites à empiler',
    description:
      'Trois socles trapézoïdaux de trois largeurs, deux stalagmites facettées à poser dessus, ' +
      'une stalactite qui pend de la voûte et une flaque au sol.',
    region: 'galeries',
    moteurs: ['assemble'],
    zones: [
      z('voute-basse', 'la voûte basse', ciel(138, 12, 3)),
      z('sol-de-la-grotte', 'le sol de la grotte', sol(520, 9, 4)),
      z('socle-gauche', 'le socle de gauche', F.trapeze(200, 440, 140, 202, 80)),
      z('socle-milieu', 'le socle du milieu', F.trapeze(470, 430, 120, 182, 92)),
      z('socle-droit', 'le socle de droite', F.trapeze(742, 450, 162, 222, 70)),
      z('stalagmite-un', 'la première stalagmite', F.cristal(200, 218, 92, 222)),
      z('stalagmite-deux', 'la deuxième stalagmite', F.cristal(470, 248, 72, 182)),
      z('stalactite-pendante', 'la stalactite pendante', F.goutte(340, 58, 28, 152)),
      z('flaque-du-sol', 'la flaque du sol', F.lobe(622, 540, 96, 5, 0.72, 40, 0.4, 0.3)),
    ],
    traits: [ligne([[120, 522], [860, 510]])],
  }),

  scene({
    habillage: 'galeries.veine',
    fichier: 'galeries/veine.svg',
    libelle: 'La veine de quartz',
    description:
      'Le filon qui barre la paroi, la veine claire qui le traverse en serpentant, un bloc de ' +
      'quartz facetté, le marteau, un copeau, la lampe posée et un éclat de quartz.',
    region: 'galeries',
    moteurs: ['grave'],
    zones: [
      z('paroi-de-la-mine', 'la paroi de la mine', ciel(168, 9, 4)),
      z('sol-de-la-mine', 'le sol de la mine', sol(530, 8, 5)),
      z('filon', 'le filon', [[60, 230], [880, 208], [902, 420], [40, 442]]),
      z('veine', 'la veine', F.ruban([[100, 300], [280, 258], [460, 330], [640, 278], [842, 342]], 26)),
      z('quartz', 'le quartz', F.cristal(300, 138, 112, 162)),
      z('marteau', 'le marteau', F.poser('marteau', 700, 118, 122, 172)),
      z('copeau', 'le copeau', [[160, 470], [250, 456], [264, 500], [170, 514]]),
      z('lampe', 'la lampe', F.poser('lanterne', 56, 468, 92, 122)),
      z('eclat-de-quartz', 'l’éclat de quartz', F.cristal(560, 458, 60, 82)),
    ],
    traits: [ligne([[60, 250], [880, 228]])],
  }),

  // ── ENRICHISSEMENT 2/3 et 3/3 : les deux supports de tracé. La région de tracé garde sa
  //    géométrie AU PIXEL — « la prise du geste ne dépend pas du décor » — et cinq régions de
  //    scène l'entourent enfin. Le décor ne s'agite pas : aucune animation dans le champ du
  //    geste (CLAUDE.md, « le décor s'agite, le texte jamais »).
  scene({
    habillage: 'galeries.tracer-cristal',
    fichier: 'galeries/tracer-cristal.svg',
    viewBox: '0 0 800 600',
    libelle: 'Graver la lettre sur l’ardoise de cristal',
    description:
      'Deux pans de paroi, deux cristaux facettés qui les bordent, le sol de la galerie, et ' +
      'au centre l’ardoise de cristal, inchangée, sur laquelle la lettre se grave.',
    region: 'galeries',
    moteurs: ['trace'],
    zones: [
      z('paroi-gauche', 'la paroi de gauche', [[0, 60], [220, 82], [210, 500], [0, 522]]),
      z('paroi-droite', 'la paroi de droite', [[578, 88], [800, 56], [800, 528], [592, 494]]),
      z('cristal-gauche', 'le cristal de gauche', F.cristal(110, 150, 92, 182)),
      z('cristal-droit', 'le cristal de droite', F.cristal(700, 178, 76, 162)),
      z('sol-de-la-galerie', 'le sol de la galerie', F.bandeau(0, 800, 520, 600, 8, 4)),
      z('ardoise', 'l’ardoise de cristal', F.rect(250, 90, 300, 400), { fill: 'none' }),
    ],
    traits: [ligne([[250, 130], [550, 130]]), ligne([[0, 522], [800, 522]])],
  }),

  scene({
    habillage: 'galeries.tracer-paroi',
    fichier: 'galeries/tracer-paroi.svg',
    viewBox: '0 0 800 600',
    libelle: 'Graver la lettre sur la paroi de sable',
    description:
      'Trois strates de sable de trois longueurs, un tas au pied, le sol, et au centre la ' +
      'paroi de sable, inchangée, sur laquelle on grave au doigt.',
    region: 'galeries',
    moteurs: ['trace'],
    zones: [
      z('strate-haute', 'la strate du haut', [[30, 170], [212, 158], [214, 206], [32, 218]]),
      z('strate-basse', 'la strate du bas', [[30, 250], [210, 240], [216, 288], [34, 298]]),
      z('strate-droite', 'la strate de droite', [[600, 190], [772, 178], [776, 230], [604, 242]]),
      z('tas-de-sable', 'le tas de sable', [[318, 522], [400, 468], [482, 522]]),
      z('sol-de-sable', 'le sol de sable', F.bandeau(0, 800, 522, 600, 7, 5)),
      z('paroi', 'la paroi de sable', F.rect(235, 90, 330, 400), { fill: 'none' }),
    ],
    traits: [ligne([[235, 140], [565, 140]]), ligne([[0, 522], [800, 522]])],
  }),
];

// ═══════════════════════════════════════════════════════════════════ LE MARAIS JUMEAU (8)

const MARAIS = [
  scene({
    habillage: 'marais.coquillages',
    fichier: 'marais-jumeau/coquillages.svg',
    libelle: 'Les coquillages jumeaux',
    description:
      'Le sable mouillé bordé d’écume, deux coquillages cannelés de deux tailles, une algue ' +
      'découpée, un galet et une étoile de mer.',
    region: 'marais-jumeau',
    moteurs: ['paires'],
    zones: [
      z('ciel-de-mer', 'le ciel de mer', ciel(158, 10, 3)),
      z('sable-mouille', 'le sable mouillé', sol(380, 12, 4)),
      z('ecume', 'l’écume', F.ruban(F.onde(0, 960, 368, 16, 3, 30), 42)),
      z('coquille-un', 'le premier coquillage', F.poser('coquillage', 178, 378, 182, 172)),
      z('coquille-deux', 'le deuxième coquillage', F.poser('coquillage', 422, 410, 140, 132)),
      z('algue', 'l’algue', F.poser('feuilleDentee', 700, 328, 122, 192)),
      z('galet', 'le galet', F.lobe(846, 500, 60, 4, 0.82, 32, 0.8, 0.66)),
      z('etoile-de-mer', 'l’étoile de mer', F.etoile(620, 500, 54, 24, 5)),
      z('bois-flotte', 'le bois flotté', F.ruban([[60, 500], [220, 486], [320, 508]], 26)),
    ],
    traits: [ligne([[0, 380], [960, 366]])],
  }),

  scene({
    habillage: 'marais.nenuphars',
    fichier: 'marais-jumeau/nenuphars.svg',
    libelle: 'Les nénuphars',
    description:
      'L’eau sombre, la rive au fond, trois nénuphars échancrés de trois tailles pour ' +
      'traverser, une libellule au-dessus, une grenouille posée et des roseaux au bord.',
    region: 'marais-jumeau',
    moteurs: ['chemin'],
    zones: [
      z('ciel-du-marais', 'le ciel du marais', ciel(138, 10, 3)),
      z('rive', 'la rive', [[0, 140], [960, 118], [960, 232], [0, 252]]),
      z('eau-sombre', 'l’eau sombre', F.bandeau(0, 960, 250, 600, 14, 4)),
      z('nenuphar-un', 'le premier nénuphar', F.poser('nenuphar', 148, 330, 192, 152)),
      z('nenuphar-deux', 'le deuxième nénuphar', F.poser('nenuphar', 420, 400, 162, 132)),
      z('nenuphar-trois', 'le troisième nénuphar', F.poser('nenuphar', 680, 340, 140, 116)),
      z('libellule', 'la libellule', F.poser('libellule', 428, 178, 142, 122)),
      z('roseau-du-bord', 'le roseau du bord', F.touffes(762, 950, 300, 112, 5, 18)),
      z('grenouille-posee', 'la grenouille posée', F.poser('grenouille', 198, 288, 92, 72)),
    ],
    traits: [ligne([[0, 252], [960, 232]])],
  }),

  scene({
    habillage: 'marais.orage',
    fichier: 'marais-jumeau/orage.svg',
    libelle: 'L’orage sur le marais',
    description:
      'Un nuage lourd et lobé, l’éclair blanc en zigzag qui en sort, le rideau de pluie ' +
      'oblique, le saule et son tronc, la barque au premier plan, des roseaux courbés.',
    region: 'marais-jumeau',
    moteurs: ['eclair'],
    zones: [
      z('ciel-d-orage', 'le ciel d’orage', ciel(218, 16, 2)),
      z('marais-sombre', 'le marais sombre', F.bandeau(0, 960, 430, 600, 12, 5)),
      z('nuage-lourd', 'le nuage lourd', F.lobe(340, 148, 180, 6, 0.68, 48, 0.3, 0.5)),
      z('eclair-blanc', 'l’éclair blanc', F.foudre(500, 168, 122, 232)),
      z('pluie', 'la pluie', [[642, 190], [900, 178], [830, 430], [570, 442]]),
      z('saule', 'le saule', F.lobe(822, 300, 130, 7, 0.62, 48, 1.2, 0.7)),
      z('tronc-du-saule', 'le tronc du saule', F.ruban([[830, 398], [842, 470], [826, 532]], 28)),
      z('barque', 'la barque', F.poser('barque', 118, 440, 242, 112)),
      z('roseau-courbe', 'le roseau courbé', F.touffes(420, 640, 560, 96, 4, 16)),
    ],
    traits: [ligne([[660, 210], [600, 420]]), ligne([[740, 202], [680, 412]])],
  }),

  scene({
    habillage: 'marais.poissons',
    fichier: 'marais-jumeau/poissons.svg',
    libelle: 'Les poissons du marais',
    description:
      'Deux poissons à queue fourchue — l’un haut de corps, l’autre franchement plat —, la ' +
      'vase au fond, un roseau dressé, un nénuphar, une bulle et le reflet à la surface.',
    region: 'marais-jumeau',
    moteurs: ['attrape'],
    zones: [
      z('ciel-au-dessus', 'le ciel au-dessus', ciel(118, 9, 4)),
      z('reflet', 'le reflet sur l’eau', F.ruban(F.onde(0, 960, 190, 14, 3, 30), 46)),
      z('vase', 'la vase', sol(500, 10, 5)),
      z('poisson-rouge', 'le poisson rouge', F.poser('poisson', 178, 250, 222, 152)),
      z('poisson-plat', 'le poisson plat', F.poser('poissonPlat', 520, 320, 192, 112)),
      z('roseau', 'le roseau', F.touffes(762, 940, 470, 182, 5, 20)),
      z('nenuphar', 'le nénuphar', F.poser('nenuphar', 358, 428, 152, 122)),
      z('bulle', 'la bulle', F.ellipse(700, 220, 30, 30, 16)),
      z('galet-du-fond', 'le galet du fond', F.lobe(120, 540, 56, 4, 0.84, 30, 0.5, 0.55)),
    ],
    traits: [ligne([[0, 192], [960, 186]])],
  }),

  scene({
    habillage: 'marais.ponton',
    fichier: 'marais-jumeau/ponton.svg',
    libelle: 'Le ponton à reconstruire',
    description:
      'Trois planches de trois longueurs à remettre bout à bout, les deux pilotis qui les ' +
      'portent, l’eau calme dessous, la brume au fond et une barque amarrée.',
    region: 'marais-jumeau',
    moteurs: ['assemble'],
    zones: [
      z('ciel-du-ponton', 'le ciel du ponton', ciel(148, 8, 3)),
      z('brume', 'la brume', F.ruban(F.onde(0, 960, 230, 18, 2, 30), 72)),
      z('eau-calme', 'l’eau calme', F.bandeau(0, 960, 400, 600, 7, 6)),
      z('planche-un', 'la première planche', [[120, 380], [420, 366], [426, 412], [124, 426]]),
      z('planche-deux', 'la deuxième planche', [[440, 370], [720, 360], [728, 410], [446, 420]]),
      z('planche-trois', 'la troisième planche', [[740, 364], [930, 356], [938, 404], [746, 412]]),
      z('pilotis', 'le pilotis', [F.rect(190, 412, 32, 122), F.rect(620, 408, 28, 132)]),
      z('roseau-du-ponton', 'le roseau du ponton', F.touffes(38, 180, 430, 82, 3, 16)),
      z('barque-amarree', 'la barque amarrée', F.poser('barque', 760, 442, 182, 92)),
    ],
    traits: [ligne([[0, 402], [960, 396]])],
  }),

  scene({
    habillage: 'marais.grenouilles',
    fichier: 'marais-jumeau/grenouilles.svg',
    libelle: 'Les grenouilles à ranger',
    description:
      'Deux grands nénuphars échancrés servent de réceptacles, à gauche et à droite ; trois ' +
      'grenouilles de trois tailles attendent au-dessus, une libellule regarde.',
    region: 'marais-jumeau',
    moteurs: ['tri'],
    zones: [
      z('rive-de-vase', 'la rive de vase', ciel(218, 10, 3)),
      z('eau-du-marais', 'l’eau du marais', F.bandeau(0, 960, 260, 600, 12, 4)),
      z('roseaux-du-fond', 'les roseaux du fond', F.touffes(0, 320, 240, 122, 4, 18)),
      z('nenuphar-gauche', 'le nénuphar de gauche', F.poser('nenuphar', 108, 330, 292, 222)),
      z('nenuphar-droit', 'le nénuphar de droite', F.poser('nenuphar', 560, 350, 262, 202)),
      z('grenouille-un', 'la première grenouille', F.poser('grenouille', 178, 178, 122, 102)),
      z('grenouille-deux', 'la deuxième grenouille', F.poser('grenouille', 420, 148, 142, 118)),
      z('grenouille-trois', 'la troisième grenouille', F.poser('grenouille', 662, 190, 100, 84)),
      z('libellule-temoin', 'la libellule témoin', F.poser('libellule', 842, 118, 92, 82)),
    ],
    traits: [ligne([[0, 262], [960, 254]])],
  }),

  scene({
    habillage: 'marais.roseaux',
    fichier: 'marais-jumeau/roseaux.svg',
    libelle: 'Les roseaux porteurs de mots',
    description:
      'Trois roseaux de trois hauteurs sortent de l’eau basse ; chacun porte une étiquette ' +
      'rectangulaire où se pose un mot. Une libellule passe au-dessus.',
    region: 'marais-jumeau',
    moteurs: ['phrase'],
    zones: [
      z('ciel-du-soir', 'le ciel du soir', ciel(148, 10, 2)),
      z('rive-molle', 'la rive molle', [[0, 430], [960, 408], [960, 482], [0, 502]]),
      z('eau-basse', 'l’eau basse', F.bandeau(0, 960, 500, 600, 9, 5)),
      z('roseau-un', 'le premier roseau', F.ruban([[180, 470], [170, 330], [188, 218]], 26)),
      z('roseau-deux', 'le deuxième roseau', F.ruban([[400, 470], [414, 320], [396, 198]], 30)),
      z('roseau-trois', 'le troisième roseau', F.ruban([[620, 470], [608, 340], [624, 238]], 22)),
      z('etiquette-un', 'la première étiquette', F.rect(118, 178, 182, 72)),
      z('etiquette-deux', 'la deuxième étiquette', F.rect(338, 148, 202, 78)),
      z('etiquette-trois', 'la troisième étiquette', F.rect(558, 194, 162, 64)),
      z('libellule-du-soir', 'la libellule du soir', F.poser('libellule', 800, 218, 112, 98)),
    ],
    traits: [ligne([[0, 502], [960, 480]])],
  }),

  scene({
    habillage: 'marais.brume',
    fichier: 'marais-jumeau/brume.svg',
    libelle: 'La berge que la brume quitte',
    description:
      'Une berge au bord d’un lac : le saule, son tronc, une barque, un ponton, un nénuphar, ' +
      'un escargot et des cailloux restent nettement reconnaissables sous la brume.',
    region: 'marais-jumeau',
    moteurs: ['colorie'],
    fondIllustre: '/api/contenu/assets/assets/decors/archives-2026-09-05/brume.png',
    masquerGeometrie: true,
    nuancier: ['brun', 'noir', 'rose', 'jaune', 'rouge', 'orange', 'bleu', 'vert'],
    zones: [
      z('ciel-pale', 'le ciel pâle', ciel(72, 8, 2)),
      z('ciel', 'le ciel', [[420, 0], [760, 0], [700, 112], [520, 116]]),
      z('brume-haute', 'la brume du haut', F.ruban(F.onde(0, 960, 250, 20, 2, 30), 82)),
      z('brume-basse', 'la brume du bas', F.ruban(F.onde(0, 960, 360, 14, 3, 30), 58)),
      z('eau-du-fond', 'l’eau du fond', F.bandeau(0, 960, 430, 600, 8, 6)),
      z('berge', 'la berge', [[0, 390], [520, 368], [562, 442], [0, 462]]),
      z('saule-de-la-berge', 'le saule de la berge', [[26, 0], [384, 0], [354, 168], [304, 244], [198, 278], [72, 252]]),
      z('tronc-du-saule', 'le tronc du saule', [[172, 44], [276, 38], [282, 172], [230, 294], [162, 280], [202, 150]]),
      z('poule', 'la poule', F.poser('poule', 350, 292, 122, 112)),
      z('souris', 'la souris', F.poser('souris', 520, 316, 112, 92)),
      z('mouche', 'la mouche', F.poser('mouche', 700, 228, 92, 82)),
      z('barque-echouee', 'la barque échouée', [[94, 286], [352, 300], [332, 402], [190, 430], [118, 386]]),
      z('nenuphar-perdu', 'le nénuphar blanc', F.lobe(750, 472, 42, 8, 0.72, 34, 0.2, 0.78)),
      z('route', 'le ponton', [[522, 302], [830, 310], [824, 364], [600, 350], [522, 332]]),
      z('roue', 'l’escargot', F.ellipse(248, 536, 54, 38, 24)),
      // Gros rocher isolé au bord de l'eau dans le raster : l'ancienne prise (522, 524)
      // tombait dans l'eau et rendait la première consigne impossible au doigt.
      z('caillou', 'le gros caillou au bord de l’eau', F.lobe(430, 458, 66, 6, 0.78, 28, 0.7, 0.72)),
    ],
    traits: [ligne([[0, 462], [560, 442]])],
  }),
];

// ═══════════════════════════════════════════════════════════════════ LA FORÊT MUETTE (8)

const FORET = [
  scene({
    habillage: 'foret.bestiaire',
    fichier: 'foret-muette/bestiaire.svg',
    libelle: 'Le bestiaire de la forêt',
    description:
      'Trois animaux qu’on distingue à la silhouette : le renard à museau pointu et queue ' +
      'touffue, le hibou à deux aigrettes, l’écureuil à queue relevée. Un terrier en anneau, ' +
      'du lichen, un champignon, un gland tombé.',
    region: 'foret-muette',
    moteurs: ['paires'],
    zones: [
      z('canopee-du-bestiaire', 'la canopée du bestiaire', ciel(148, 14, 3)),
      z('sous-bois', 'le sous-bois', sol(430, 12, 4)),
      z('lichen', 'le lichen', F.lobe(120, 238, 82, 7, 0.6, 44, 0.2, 0.6)),
      z('terrier', 'le terrier', [F.arche(762, 470, 222, 152), F.arche(762, 470, 122, 92)]),
      z('renard', 'le renard', F.poser('renard', 168, 262, 246, 176)),
      z('hibou', 'le hibou', F.poser('hibou', 424, 186, 146, 186)),
      z('ecureuil', 'l’écureuil', F.poser('ecureuil', 566, 258, 146, 168)),
      z('champignon-du-sous-bois', 'le champignon du sous-bois', F.poser('champignon', 56, 438, 112, 112)),
      z('gland-tombe', 'le gland tombé', F.poser('gland', 348, 468, 72, 102)),
    ],
    traits: [ligne([[0, 432], [960, 424]])],
  }),

  scene({
    habillage: 'foret.buee',
    fichier: 'foret-muette/buee.svg',
    libelle: 'La buée sur la vitre',
    description:
      'Une fenêtre : le cadre en anneau, la vitre embuée à l’intérieur, le tracé qu’un doigt y ' +
      'a laissé, un rideau sur le côté, le rebord et un pot posé dessus. Dehors, la forêt.',
    region: 'foret-muette',
    moteurs: ['grave'],
    zones: [
      z('foret-dehors', 'la forêt dehors', ciel(238, 16, 3)),
      z('arbre-dehors', 'l’arbre dehors', F.lobe(118, 190, 96, 6, 0.74, 44, 0.4, 0.72)),
      z('rebord', 'le rebord', [[60, 470], [900, 456], [912, 516], [52, 530]]),
      z('cadre', 'le cadre', [F.rect(250, 90, 650, 380), F.rect(290, 130, 570, 300)]),
      z('vitre-embuee', 'la vitre embuée', F.rect(290, 130, 570, 300)),
      z('doigt-trace', 'le tracé du doigt', F.ruban([[360, 200], [480, 300], [400, 380], [532, 412]], 20)),
      z('rideau-fin', 'le rideau fin', [[790, 118], [866, 108], [882, 460], [806, 470]]),
      z('goutte-de-buee', 'la goutte de buée', F.goutte(690, 218, 20, 82)),
      z('pot-sur-le-rebord', 'le pot sur le rebord', F.trapeze(180, 400, 72, 52, 68)),
    ],
    traits: [ligne([[52, 530], [912, 516]])],
  }),

  scene({
    habillage: 'foret.message',
    fichier: 'foret-muette/message.svg',
    libelle: 'Le message dans l’écorce',
    description:
      'Un tronc large occupe le centre ; l’entaille y est creusée en amande. Un rayon de ' +
      'lumière traverse la canopée, la mousse verte couvre le sol, une racine part sur le côté.',
    region: 'foret-muette',
    moteurs: ['phrase'],
    zones: [
      z('canopee', 'la canopée', ciel(168, 13, 3)),
      z('rayon', 'le rayon de lumière', [[380, 0], [520, 0], [762, 600], [560, 600]]),
      z('mousse-verte', 'la mousse verte', sol(490, 10, 5)),
      z('ecorce', 'l’écorce', [[300, 120], [620, 108], [652, 520], [278, 532]]),
      z('entaille', 'l’entaille', [[370, 258], [560, 244], [568, 306], [376, 320]]),
      z('racine', 'la racine', F.ruban([[300, 500], [220, 540], [118, 558]], 34)),
      z('houppier-gauche', 'le houppier de gauche', F.lobe(140, 178, 112, 6, 0.66, 44, 0.9, 0.7)),
      z('champignon-au-pied', 'le champignon au pied', F.poser('champignon', 678, 448, 102, 102)),
      z('feuille-tombee', 'la feuille tombée', F.poser('feuilleDentee', 818, 498, 112, 92)),
    ],
    traits: [ligne([[330, 180], [340, 500]]), ligne([[600, 180], [612, 500]])],
  }),

  scene({
    habillage: 'foret.pas-japonais',
    fichier: 'foret-muette/pas-japonais.svg',
    libelle: 'Les pas japonais',
    description:
      'Un ruisseau large serpente ; trois pierres de trois tailles permettent de le franchir. ' +
      'Une fougère découpée à gauche, un tronc couché en travers, une souche creuse au fond.',
    region: 'foret-muette',
    moteurs: ['chemin'],
    zones: [
      z('canopee-basse', 'la canopée basse', ciel(128, 10, 4)),
      z('ruisseau', 'le ruisseau', F.ruban(F.onde(0, 960, 380, 30, 2, 26), 152)),
      z('fougere', 'la fougère', F.poser('feuilleDentee', 56, 178, 182, 242)),
      z('tronc-couche', 'le tronc couché', F.ruban([[80, 520], [420, 498], [762, 516], [930, 496]], 46)),
      z('pierre-un', 'la première pierre', F.lobe(240, 380, 68, 4, 0.84, 28, 0.4, 0.5)),
      z('pierre-deux', 'la deuxième pierre', F.lobe(480, 350, 84, 4, 0.8, 28, 1.3, 0.46)),
      z('pierre-trois', 'la troisième pierre', F.lobe(720, 396, 60, 4, 0.86, 28, 2.2, 0.52)),
      z('souche-du-bord', 'la souche du bord', F.poser('souche', 778, 178, 152, 122)),
      z('champignon-humide', 'le champignon humide', F.poser('champignon', 378, 188, 92, 92)),
    ],
    traits: [ligne([[80, 520], [930, 496]])],
  }),

  scene({
    habillage: 'foret.feuilles',
    fichier: 'foret-muette/feuilles.svg',
    libelle: 'Les feuilles qui tombent',
    description:
      'Une branche traverse le haut ; quatre feuilles dentelées de quatre tailles descendent, ' +
      'un gland tombe avec elles, une souche creuse attend en bas.',
    region: 'foret-muette',
    moteurs: ['attrape'],
    zones: [
      z('ciel-d-automne', 'le ciel d’automne', ciel(138, 11, 3)),
      z('tapis-du-sol', 'le tapis du sol', sol(490, 12, 4)),
      z('branche-haute', 'la branche du haut', F.ruban([[0, 150], [300, 118], [640, 146], [960, 108]], 28)),
      z('feuille-un', 'la première feuille', F.poser('feuilleDentee', 138, 218, 122, 112)),
      z('feuille-deux', 'la deuxième feuille', F.poser('feuilleDentee', 338, 300, 102, 92)),
      z('feuille-trois', 'la troisième feuille', F.poser('feuilleDentee', 538, 238, 142, 128)),
      z('feuille-quatre', 'la quatrième feuille', F.poser('feuilleDentee', 742, 318, 88, 80)),
      z('gland-qui-tombe', 'le gland qui tombe', F.poser('gland', 418, 178, 68, 94)),
      z('souche-au-sol', 'la souche au sol', F.poser('souche', 56, 428, 162, 132)),
    ],
    traits: [ligne([[0, 492], [960, 484]])],
  }),

  scene({
    habillage: 'foret.souche',
    fichier: 'foret-muette/souche.svg',
    libelle: 'Les deux souches creuses',
    description:
      'Deux souches creuses de deux tailles, ouvertes en leur milieu, servent de réceptacles ; ' +
      'trois glands de trois tailles attendent au-dessus.',
    region: 'foret-muette',
    moteurs: ['tri'],
    zones: [
      z('canopee-sombre', 'la canopée sombre', ciel(158, 12, 3)),
      z('sol-de-feuilles', 'le sol de feuilles', sol(450, 10, 5)),
      z('souche-gauche', 'la souche de gauche', F.poser('souche', 108, 258, 282, 242)),
      z('souche-droite', 'la souche de droite', F.poser('souche', 540, 288, 242, 212)),
      z('gland-un', 'le premier gland', F.poser('gland', 418, 178, 72, 102)),
      z('gland-deux', 'le deuxième gland', F.poser('gland', 560, 158, 58, 84)),
      z('gland-trois', 'le troisième gland', F.poser('gland', 700, 188, 86, 118)),
      z('champignon-entre-deux', 'le champignon entre les deux', F.poser('champignon', 420, 418, 112, 112)),
      z('feuille-au-sol', 'la feuille au sol', F.poser('feuilleDentee', 818, 468, 122, 102)),
    ],
    traits: [ligne([[0, 452], [960, 442]])],
  }),

  scene({
    habillage: 'foret.veillee-automne',
    fichier: 'foret-muette/veillee-automne.svg',
    libelle: 'La veillée sous les arbres roux',
    description:
      'Deux arbres roux à tronc et houppier lobé encadrent un feu de veillée ; Plume, le hibou ' +
      'à deux aigrettes, est assise à côté. Une bûche, la lune, la nuit.',
    region: 'foret-muette',
    moteurs: ['histoire'],
    zones: [
      z('ciel-de-nuit', 'le ciel de nuit', ciel(228, 12, 2)),
      z('clairiere-rousse', 'la clairière rousse', sol(470, 10, 4)),
      z('arbre-roux-gauche', 'l’arbre roux de gauche', F.lobe(170, 178, 132, 6, 0.66, 44, 0.3, 0.72)),
      z('arbre-roux-droit', 'l’arbre roux de droite', F.lobe(790, 198, 112, 5, 0.7, 44, 1.1, 0.68)),
      z('tronc-gauche', 'le tronc de gauche', F.ruban([[176, 250], [166, 470]], 36)),
      z('tronc-droit', 'le tronc de droite', F.ruban([[792, 252], [802, 470]], 28)),
      z('feu-de-veillee', 'le feu de veillée', F.flammes(422, 558, 470, 118, 5, 20)),
      z('plume-assise', 'Plume assise', F.poser('hibou', 598, 328, 132, 162)),
      z('buche-de-veillee', 'la bûche de veillée', [[398, 486], [576, 470], [586, 510], [404, 526]]),
      z('lune-rousse', 'la lune rousse', F.ellipse(862, 108, 48, 48, 20)),
    ],
    traits: [ligne([[0, 472], [960, 464]])],
  }),

  scene({
    habillage: 'foret.tapis',
    fichier: 'foret-muette/tapis.svg',
    libelle: 'Le tapis de feuilles',
    description:
      'Un grand tapis forestier : son centre uni et six motifs de feuilles bien visibles ' +
      'sur la bordure servent de cibles au coloriage.',
    region: 'foret-muette',
    moteurs: ['colorie'],
    fondIllustre: '/api/contenu/assets/assets/decors/archives-2026-09-05/tapis.png',
    masquerGeometrie: true,
    nuancier: ['brun', 'noir', 'violet', 'vert', 'rouge', 'jaune', 'orange', 'rose'],
    zones: [
      z('ciel-entre-troncs', 'le ciel entre les troncs', ciel(64, 7, 4)),
      z('ciel', 'le ciel', F.bandeau(0, 960, 64, 180, 9, 3)),
      z('sol-nu', 'le sol nu', sol(500, 8, 5)),
      z('tronc-un', 'le premier tronc', F.rect(18, 180, 58, 330)),
      z('tronc-deux', 'le deuxième tronc', F.rect(430, 190, 72, 320)),
      z('tronc-trois', 'le troisième tronc', F.rect(890, 176, 52, 334)),
      z('arbre', 'l’arbre', F.poser('arbre', 560, 150, 192, 242)),
      z('chat', 'le chat', F.poser('chat', 250, 250, 142, 172)),
      z('rat', 'le rat', F.poser('souris', 110, 330, 122, 94)),
      z('nid', 'le nid', F.poser('nid', 770, 250, 112, 82)),
      // Coordonnées mesurées sur le PNG publié, après son cadrage xMidYMid slice en 960×600.
      // Le précédent jeu de zones décrivait un gland absent et plusieurs feuilles posées sur
      // la partie unie du tapis : le moteur fonctionnait, mais l'enfant ne pouvait rien viser.
      // Les identifiants historiques restent stables pour ne pas invalider une sortie en cours.
      z('gland-du-tapis', 'le centre du tapis', [[310, 360], [480, 350], [650, 360], [704, 420], [480, 432], [256, 420]]),
      z('feuille-du-tapis-un', 'la feuille en haut à gauche', F.lobe(310, 324, 32, 6, 0.74, 36, 0, 0.72)),
      z('feuille-du-tapis-deux', 'la feuille en haut, au milieu', F.lobe(500, 324, 33, 7, 0.72, 38, 0.08, 0.72)),
      z('feuille-du-tapis-trois', 'la feuille en haut à droite', F.lobe(700, 324, 34, 5, 0.7, 34, 0.14, 0.7)),
      z('feuille-haute', 'la feuille de gauche', F.lobe(252, 386, 33, 6, 0.76, 36, 0.18, 0.74)),
      z('feuille-basse', 'la feuille du bas, au milieu', F.lobe(490, 463, 35, 7, 0.7, 40, 0.05, 0.7)),
      z('feuille-du-tapis-quatre', 'la feuille de droite', F.lobe(755, 386, 34, 5, 0.78, 32, 0.22, 0.72)),
    ],
    traits: [ligne([[0, 502], [960, 494]])],
  }),
];

// ══════════════════════════════════════════════════════════════════════════ LE VOLCAN (8)

const VOLCAN = [
  scene({
    habillage: 'volcan.etoiles-filantes',
    fichier: 'volcan/etoiles-filantes.svg',
    libelle: 'Les étoiles filantes du volcan',
    description:
      'Le cône du cratère fume ; une coulée descend sur le flanc. Deux étoiles filantes de ' +
      'deux tailles traversent le ciel rouge, une braise brille au sol.',
    region: 'volcan',
    moteurs: ['attrape'],
    zones: [
      z('ciel-rouge', 'le ciel rouge', ciel(318, 16, 2)),
      z('pente-de-cendre', 'la pente de cendre', sol(430, 10, 4)),
      z('cratere', 'le cratère', [[240, 432], [420, 248], [542, 248], [722, 432]]),
      z('coulee', 'la coulée', F.ruban([[420, 340], [378, 430], [442, 520], [400, 600]], 58)),
      z('fumee', 'la fumée', F.lobe(480, 138, 122, 6, 0.66, 44, 0.5, 0.6)),
      z('etoile-vive', 'l’étoile vive', F.etoile(178, 148, 52, 22, 5)),
      z('etoile-lente', 'l’étoile lente', F.etoile(800, 198, 36, 15, 5)),
      z('braise-au-sol', 'la braise au sol', F.lobe(138, 540, 54, 5, 0.74, 32, 0.8, 0.6)),
      z('eclat-de-lave', 'l’éclat de lave', F.cristal(862, 428, 66, 102)),
    ],
    traits: [ligne([[420, 248], [542, 248]])],
  }),

  scene({
    habillage: 'volcan.fresque',
    fichier: 'volcan/fresque.svg',
    libelle: 'La fresque du volcan',
    description:
      'Une bordure en anneau encadre trois panneaux de trois tailles à lire dans l’ordre ; une ' +
      'torche les éclaire, une lueur monte du sol, un éclat de roche traîne.',
    region: 'volcan',
    moteurs: ['chrono'],
    zones: [
      z('roche-noire', 'la roche noire', ciel(148, 10, 3)),
      z('lueur', 'la lueur', F.lobe(480, 542, 222, 5, 0.72, 44, 0.2, 0.28)),
      z('bordure', 'la bordure', [F.rect(70, 180, 830, 320), F.rect(110, 220, 750, 240)]),
      z('panneau-un', 'le premier panneau', F.rect(130, 240, 222, 202)),
      z('panneau-deux', 'le deuxième panneau', F.rect(370, 230, 242, 222)),
      z('panneau-trois', 'le troisième panneau', F.rect(632, 250, 202, 182)),
      z('socle-de-la-fresque', 'le socle de la fresque', [[60, 500], [900, 486], [914, 540], [52, 554]]),
      z('torche-de-la-fresque', 'la torche de la fresque', F.poser('torche', 16, 300, 64, 142)),
      z('eclat-de-roche', 'l’éclat de roche', F.cristal(902, 300, 60, 92)),
    ],
    traits: [ligne([[130, 300], [340, 300]]), ligne([[380, 290], [600, 290]]), ligne([[640, 310], [820, 310]])],
  }),

  scene({
    habillage: 'volcan.sable',
    fichier: 'volcan/sable.svg',
    libelle: 'Le sable noir',
    description:
      'Une falaise à gauche, la mer sombre au fond, la plage noire devant. Le doigt y a laissé ' +
      'un tracé ; un galet chaud fume, une coquille noire et un rocher complètent la plage.',
    region: 'volcan',
    moteurs: ['grave'],
    zones: [
      z('ciel-de-cendre', 'le ciel de cendre', ciel(138, 9, 3)),
      z('mer-sombre', 'la mer sombre', F.bandeau(0, 960, 240, 340, 10, 5)),
      z('plage-noire', 'la plage noire', sol(340, 8, 6)),
      z('falaise', 'la falaise', [[0, 110], [222, 88], [282, 300], [0, 322]]),
      z('trace-doigt', 'la trace du doigt', F.ruban([[260, 430], [420, 398], [560, 450], [722, 410]], 22)),
      z('galet-chaud', 'le galet chaud', F.lobe(822, 470, 62, 4, 0.82, 32, 0.9, 0.62)),
      z('vapeur', 'la vapeur', F.lobe(622, 218, 92, 6, 0.66, 44, 1.3, 0.5)),
      z('rocher-de-la-plage', 'le rocher de la plage', F.lobe(158, 470, 86, 5, 0.76, 36, 0.4, 0.6)),
      z('coquille-noire', 'la coquille noire', F.poser('coquillage', 378, 498, 112, 102)),
    ],
    traits: [ligne([[0, 342], [960, 334]])],
  }),

  scene({
    habillage: 'volcan.train',
    fichier: 'volcan/train.svg',
    libelle: 'Le train de pierre',
    description:
      'Une locomotive à cheminée tire deux wagons de deux tailles sur une voie ; un tunnel en ' +
      'anneau attend à droite, la lave coule en bas, la fumée monte.',
    region: 'volcan',
    moteurs: ['assemble'],
    zones: [
      z('ciel-cendre', 'le ciel de cendre', ciel(168, 10, 3)),
      z('lave', 'la lave', F.bandeau(0, 960, 470, 600, 12, 4)),
      z('voie', 'la voie', F.ruban([[0, 440], [960, 418]], 26)),
      z('locomotive', 'la locomotive', F.poser('locomotive', 88, 248, 282, 182)),
      z('wagon-avant', 'le wagon avant', F.poser('wagon', 420, 288, 202, 142)),
      z('wagon-arriere', 'le wagon arrière', F.poser('wagon', 660, 298, 172, 132)),
      z('tunnel', 'le tunnel', [F.arche(880, 442, 222, 242), F.arche(880, 442, 142, 172)]),
      z('fumee-du-train', 'la fumée du train', F.lobe(178, 148, 86, 6, 0.68, 40, 0.7, 0.6)),
      z('braise-sur-la-voie', 'la braise sur la voie', F.lobe(560, 498, 48, 5, 0.76, 32, 1.4, 0.55)),
    ],
    traits: [ligne([[0, 452], [960, 430]])],
  }),

  scene({
    habillage: 'volcan.wagons',
    fichier: 'volcan/wagons.svg',
    libelle: 'Les wagons de la mine',
    description:
      'Trois wagons de trois tailles sur un rail, deux étais qui soutiennent la paroi, une ' +
      'lampe de mine accrochée, un tas de charbon et la braise qui rougeoie au sol.',
    region: 'volcan',
    moteurs: ['tri'],
    zones: [
      z('paroi', 'la paroi', ciel(188, 10, 3)),
      z('braise', 'la braise', F.lobe(500, 546, 122, 5, 0.72, 40, 0.3, 0.34)),
      z('rail', 'le rail', F.ruban([[0, 470], [960, 452]], 24)),
      z('wagon-un', 'le premier wagon', F.poser('wagon', 78, 288, 242, 162)),
      z('wagon-deux', 'le deuxième wagon', F.poser('wagon', 378, 308, 202, 142)),
      z('wagon-trois', 'le troisième wagon', F.poser('wagon', 640, 298, 222, 152)),
      z('lampe-de-la-mine', 'la lampe de la mine', F.poser('lanterne', 878, 118, 72, 112)),
      z('tas-de-charbon', 'le tas de charbon', F.lobe(178, 500, 74, 5, 0.76, 32, 0.9, 0.55)),
      z('etai', 'l’étai', [F.rect(38, 198, 36, 272), F.rect(918, 188, 34, 282)]),
    ],
    traits: [ligne([[0, 484], [960, 466]])],
  }),

  scene({
    habillage: 'volcan.forge',
    fichier: 'volcan/forge.svg',
    libelle: 'La forge et son enclume',
    description:
      'Dans une forge creusée dans la roche, une enclume sur son billot, un marteau, un foyer ' +
      'plein de braises, un seau, une lanterne et des cristaux.',
    region: 'volcan',
    moteurs: ['colorie'],
    fondIllustre: '/api/contenu/assets/assets/decors/archives-2026-09-05/forge.png',
    masquerGeometrie: true,
    nuancier: ['bleu', 'noir', 'rouge', 'brun', 'violet', 'jaune', 'rose', 'orange'],
    zones: [
      z('mur-de-la-forge', 'le mur de la forge', ciel(150, 9, 3)),
      z('sol-de-la-forge', 'le sol de la forge', sol(478, 8, 5)),
      z('rideau', 'le grand cristal violet', F.cristal(874, 450, 126, 150)),
      z('tableau', 'la lanterne', F.poser('lanterne', 62, 112, 94, 136)),
      z('drapeau', 'le cristal rose', F.cristal(112, 92, 76, 132)),
      z('oiseau', 'l’oiseau', F.poser('oiseau', 580, 100, 162, 112)),
      z('chapeau', 'le chapeau', F.poser('chapeau', 790, 110, 132, 102)),
      z('enclume', 'l’enclume', [[288, 214], [548, 220], [574, 258], [526, 302], [482, 340], [330, 334], [352, 286], [292, 260]]),
      z('billot', 'le billot', [[340, 320], [500, 324], [526, 422], [318, 420]]),
      z('marteau-de-forge', 'le marteau de forge', [[486, 354], [548, 342], [596, 392], [572, 430], [510, 438], [480, 404]]),
      z('etincelle', 'l’étincelle', F.etoile(520, 300, 42, 18, 6)),
      z('foyer', 'le foyer', [F.arche(700, 470, 300, 250), F.arche(700, 470, 200, 166)]),
      z('braises-du-foyer', 'les braises du foyer', F.lobe(700, 438, 62, 5, 0.74, 36, 0.7, 0.5)),
      z('feu', 'le feu du foyer', F.lobe(642, 484, 102, 7, 0.7, 38, 0.4, 0.72)),
      z('seau', 'le seau', F.trapeze(876, 356, 94, 72, 112)),
      z('seau-d-eau', 'le seau d’eau', F.trapeze(500, 470, 96, 76, 86)),
    ],
    traits: [ligne([[0, 472], [960, 464]])],
  }),

  scene({
    habillage: 'volcan.coulee',
    fichier: 'volcan/coulee.svg',
    libelle: 'Les pierres à sauter sur la coulée',
    description:
      'Une coulée de lave large serpente ; quatre pierres de quatre tailles permettent de la ' +
      'franchir. Au fond, le cône du volcan et sa fumée.',
    region: 'volcan',
    moteurs: ['chemin'],
    zones: [
      z('ciel-de-braise', 'le ciel de braise', ciel(148, 11, 2)),
      z('cone-du-volcan', 'le cône du volcan', [[540, 210], [660, 58], [762, 58], [900, 210]]),
      z('fumee-du-cone', 'la fumée du cône', F.lobe(710, 38, 70, 6, 0.68, 40, 0.3, 0.6)),
      z('coulee-de-lave', 'la coulée de lave', F.ruban(F.onde(0, 960, 380, 34, 2, 26), 162)),
      z('rive-de-roche', 'la rive de roche', sol(500, 9, 5)),
      z('pierre-a-sauter-un', 'la première pierre à sauter', F.lobe(200, 380, 70, 4, 0.84, 28, 0.5, 0.5)),
      z('pierre-a-sauter-deux', 'la deuxième pierre à sauter', F.lobe(430, 350, 86, 4, 0.8, 28, 1.4, 0.46)),
      z('pierre-a-sauter-trois', 'la troisième pierre à sauter', F.lobe(660, 390, 62, 4, 0.86, 28, 2.3, 0.54)),
      z('pierre-a-sauter-quatre', 'la quatrième pierre à sauter', F.lobe(846, 344, 52, 4, 0.82, 28, 0.2, 0.6)),
    ],
    traits: [ligne([[540, 210], [900, 210]])],
  }),

  scene({
    habillage: 'volcan.geodes',
    fichier: 'volcan/geodes.svg',
    libelle: 'Les géodes à ouvrir',
    description:
      'Quatre géodes de quatre tailles, chacune creuse en son milieu — c’est ce vide qui les ' +
      'désigne comme géodes. Le marteau du mineur, la lampe, un éclat détaché.',
    region: 'volcan',
    moteurs: ['paires'],
    zones: [
      z('paroi-de-la-mine', 'la paroi de la mine', ciel(158, 10, 3)),
      z('sol-de-cendre', 'le sol de cendre', sol(480, 9, 5)),
      z('geode-un', 'la première géode', F.poser('geode', 108, 218, 202, 192)),
      z('geode-deux', 'la deuxième géode', F.poser('geode', 358, 248, 172, 162)),
      z('geode-trois', 'la troisième géode', F.poser('geode', 600, 228, 192, 182)),
      z('geode-quatre', 'la quatrième géode', F.poser('geode', 812, 268, 132, 126)),
      z('marteau-du-mineur', 'le marteau du mineur', F.poser('marteau', 118, 468, 112, 122)),
      z('lampe-de-geode', 'la lampe de la géode', F.poser('lanterne', 700, 468, 92, 112)),
      z('eclat-de-geode', 'l’éclat de géode', F.cristal(450, 468, 64, 92)),
    ],
    traits: [ligne([[0, 482], [960, 474]])],
  }),
];

// ═════════════════════════════════════════════════════════════ LA CITÉ DES HISTOIRES (10)

const CITE = [
  scene({
    habillage: 'cite.banniere',
    fichier: 'cite-des-histoires/banniere.svg',
    libelle: 'La bannière de la cité',
    description:
      'Un toit de tuiles, un balcon en anneau, un mât dressé, et deux bannières à queue ' +
      'fourchue de deux tailles. Une fenêtre en arc, une lanterne sur la place.',
    region: 'cite-des-histoires',
    moteurs: ['phrase'],
    zones: [
      z('ciel-de-la-cite', 'le ciel de la cité', ciel(128, 9, 3)),
      z('place', 'la place', sol(470, 8, 5)),
      z('toit-tuile', 'le toit de tuiles', [[180, 180], [480, 88], [780, 180], [762, 222], [200, 222]]),
      z('balcon', 'le balcon', [F.rect(300, 300, 360, 92), F.rect(340, 330, 280, 42)]),
      z('mat', 'le mât', F.rect(118, 118, 28, 362)),
      z('banniere-haute', 'la bannière du haut', F.poser('banniere', 378, 220, 202, 162)),
      z('banniere-basse', 'la bannière du bas', F.poser('banniere', 600, 258, 162, 132)),
      z('fenetre-de-la-tour', 'la fenêtre de la tour', F.arche(250, 300, 92, 122)),
      z('lanterne-de-la-place', 'la lanterne de la place', F.poser('lanterne', 830, 298, 102, 142)),
    ],
    traits: [ligne([[200, 222], [762, 222]])],
  }),

  scene({
    habillage: 'cite.bibliotheque',
    fichier: 'cite-des-histoires/bibliotheque.svg',
    libelle: 'La bibliothèque',
    description:
      'Deux étagères en anneau, l’une plus haute que l’autre, une échelle à barreaux, un ' +
      'pupitre incliné, une fenêtre à carreaux, un livre ouvert sur le parquet.',
    region: 'cite-des-histoires',
    moteurs: ['histoire'],
    zones: [
      z('mur-du-fond', 'le mur du fond', ciel(118, 8, 3)),
      z('parquet', 'le parquet', sol(490, 7, 6)),
      z('etagere-haute', 'l’étagère du haut', [F.rect(80, 150, 560, 152), F.rect(110, 180, 500, 92)]),
      z('etagere-basse', 'l’étagère du bas', [F.rect(80, 320, 560, 142), F.rect(110, 348, 500, 86)]),
      z('pupitre', 'le pupitre', F.poser('pupitre', 678, 328, 242, 162)),
      z('echelle', 'l’échelle', F.poser('echelle', 640, 118, 92, 342)),
      z('vitre', 'la vitre', [F.rect(760, 118, 172, 182), F.rect(790, 148, 112, 122)]),
      z('livre-ouvert', 'le livre ouvert', F.poser('livre', 328, 468, 182, 112)),
      z('lampe-de-lecture', 'la lampe de lecture', F.poser('lanterne', 56, 358, 82, 112)),
    ],
    traits: [ligne([[110, 226], [610, 226]]), ligne([[110, 390], [610, 390]])],
  }),

  scene({
    habillage: 'cite.cartes',
    fichier: 'cite-des-histoires/cartes.svg',
    libelle: 'Les cartes de la cité',
    description:
      'Deux cartes rectangulaires de deux tailles posées sur un tapis, une colonne à gauche, ' +
      'une fresque murale en anneau, une lanterne, un coussin, un livre posé.',
    region: 'cite-des-histoires',
    moteurs: ['paires'],
    zones: [
      z('mur-de-la-salle', 'le mur de la salle', ciel(138, 10, 3)),
      z('tapis', 'le tapis', [[80, 430], [880, 412], [922, 546], [38, 562]]),
      z('colonne', 'la colonne', F.rect(58, 118, 72, 332)),
      z('fresque-murale', 'la fresque murale', [F.rect(200, 118, 520, 202), F.rect(240, 154, 440, 130)]),
      z('carte-un', 'la première carte', F.rect(238, 330, 162, 222)),
      z('carte-deux', 'la deuxième carte', F.rect(458, 350, 142, 202)),
      z('lanterne', 'la lanterne', F.poser('lanterne', 778, 148, 112, 152)),
      z('coussin', 'le coussin', F.lobe(700, 480, 84, 4, 0.8, 32, 0.5, 0.55)),
      z('livre-pose', 'le livre posé', F.poser('livre', 58, 468, 152, 92)),
    ],
    traits: [ligne([[38, 562], [922, 546]])],
  }),

  scene({
    habillage: 'cite.pellicule',
    fichier: 'cite-des-histoires/pellicule.svg',
    libelle: 'La pellicule',
    description:
      'Une bande de pellicule perforée traverse la scène ; trois images de trois tailles s’y ' +
      'suivent. Une loupe en anneau et une bobine en anneau sur la table de montage.',
    region: 'cite-des-histoires',
    moteurs: ['chrono'],
    zones: [
      z('mur-blanc', 'le mur blanc', ciel(178, 8, 3)),
      z('bande', 'la bande', [[40, 200], [920, 188], [932, 470], [28, 482]]),
      z('perforation', 'la perforation', [
        F.rect(90, 214, 42, 30), F.rect(290, 212, 42, 30), F.rect(490, 210, 42, 30), F.rect(690, 208, 42, 30),
      ]),
      z('image-un', 'la première image', F.rect(110, 260, 222, 172)),
      z('image-deux', 'la deuxième image', F.rect(368, 254, 242, 182)),
      z('image-trois', 'la troisième image', F.rect(650, 264, 202, 162)),
      z('table-de-montage', 'la table de montage', [[0, 500], [960, 484], [960, 600], [0, 600]]),
      z('loupe', 'la loupe', [F.ellipse(140, 530, 52, 52, 20), F.ellipse(140, 530, 34, 34, 18)]),
      z('bobine', 'la bobine', [F.ellipse(842, 540, 56, 56, 20), F.ellipse(842, 540, 20, 20, 14)]),
    ],
    traits: [ligne([[0, 500], [960, 484]])],
  }),

  scene({
    habillage: 'cite.theatre-ombres',
    fichier: 'cite-des-histoires/theatre-ombres.svg',
    libelle: 'Le théâtre d’ombres',
    description:
      'Un drap tendu, la silhouette d’un enfant qui s’y projette, une bougie allumée sur le ' +
      'côté, l’estrade, les deux pans de rideau, le gradin devant.',
    region: 'cite-des-histoires',
    moteurs: ['histoire'],
    zones: [
      z('fond-de-salle', 'le fond de salle', ciel(108, 8, 3)),
      z('gradin', 'le gradin', [[60, 470], [900, 456], [932, 560], [28, 572]]),
      z('estrade', 'l’estrade', [[180, 400], [780, 386], [802, 470], [158, 480]]),
      z('drap', 'le drap', F.rect(260, 118, 440, 272)),
      z('silhouette', 'la silhouette', F.poser('silhouetteEnfant', 398, 158, 152, 212)),
      z('rideau', 'le rideau', [
        [[0, 60], [200, 38], [190, 520], [0, 542]],
        [[770, 38], [960, 60], [960, 542], [780, 520]],
      ]),
      z('bougie', 'la bougie', F.poser('bougie', 700, 248, 72, 142)),
      z('lanterne-de-scene', 'la lanterne de scène', F.poser('lanterne', 216, 178, 92, 122)),
      z('coussin-du-gradin', 'le coussin du gradin', F.lobe(500, 520, 70, 4, 0.8, 32, 0.4, 0.5)),
    ],
    traits: [ligne([[158, 480], [802, 470]])],
  }),

  scene({
    habillage: 'cite.vitrail',
    fichier: 'cite-des-histoires/vitrail.svg',
    libelle: 'Le vitrail',
    description:
      'La nef, le plomb en anneau qui cerne la baie, une rosace en anneau au sommet, et trois ' +
      'losanges de trois tailles à lire dans l’ordre. Un cierge, un banc.',
    region: 'cite-des-histoires',
    moteurs: ['chrono'],
    zones: [
      z('nef', 'la nef', [[60, 138], [900, 138], [862, 520], [98, 520]]),
      z('sol-de-la-nef', 'le sol de la nef', sol(530, 7, 6)),
      z('plomb', 'le plomb', [F.arche(480, 470, 560, 420), F.arche(480, 470, 470, 360)]),
      z('rosace', 'la rosace', [F.ellipse(480, 180, 112, 112, 24), F.ellipse(480, 180, 60, 60, 18)]),
      z('losange-un', 'le premier losange', F.losange(320, 330, 70, 112)),
      z('losange-deux', 'le deuxième losange', F.losange(480, 360, 86, 132)),
      z('losange-trois', 'le troisième losange', F.losange(640, 330, 60, 96)),
      z('cierge', 'le cierge', F.poser('bougie', 118, 378, 62, 132)),
      z('banc-de-la-nef', 'le banc de la nef', [[700, 440], [900, 428], [908, 478], [706, 490]]),
    ],
    traits: [ligne([[98, 520], [862, 520]])],
  }),

  scene({
    habillage: 'cite.ponts',
    fichier: 'cite-des-histoires/ponts.svg',
    libelle: 'Les ponts de livres',
    description:
      'Deux tours crénelées de deux hauteurs ; entre elles, deux ponts en arc de deux ' +
      'portées, faits de livres. Deux livres posés en bas, une lanterne au milieu.',
    region: 'cite-des-histoires',
    moteurs: ['chemin'],
    zones: [
      z('ciel-de-la-cite', 'le ciel de la cité', ciel(148, 10, 3)),
      z('place-du-bas', 'la place du bas', sol(500, 8, 5)),
      z('tour-gauche', 'la tour de gauche', F.poser('tour', 78, 118, 182, 382)),
      z('tour-droite', 'la tour de droite', F.poser('tour', 700, 148, 172, 352)),
      z('pont-un', 'le premier pont', F.poser('pont', 248, 228, 222, 112)),
      z('pont-deux', 'le deuxième pont', F.poser('pont', 428, 328, 242, 122)),
      z('livre-pose-un', 'le premier livre posé', F.poser('livre', 318, 428, 142, 92)),
      z('livre-pose-deux', 'le deuxième livre posé', F.poser('livre', 520, 448, 122, 80)),
      z('lanterne-du-pont', 'la lanterne du pont', F.poser('lanterne', 558, 178, 92, 122)),
    ],
    traits: [ligne([[0, 502], [960, 494]])],
  }),

  scene({
    habillage: 'cite.rayonnages',
    fichier: 'cite-des-histoires/rayonnages.svg',
    libelle: 'Les deux rayonnages',
    description:
      'Deux rayonnages en anneau, à gauche et à droite, servent de réceptacles ; deux livres ' +
      'de deux tailles attendent au milieu. Une échelle, un pupitre, une lampe.',
    region: 'cite-des-histoires',
    moteurs: ['tri'],
    zones: [
      z('mur-de-la-salle', 'le mur de la salle', ciel(128, 8, 3)),
      z('parquet-cire', 'le parquet ciré', sol(500, 7, 6)),
      z('rayonnage-gauche', 'le rayonnage de gauche', [F.rect(70, 160, 340, 322), F.rect(100, 190, 280, 262)]),
      z('rayonnage-droit', 'le rayonnage de droite', [F.rect(550, 180, 322, 302), F.rect(578, 208, 266, 246)]),
      z('livre-a-ranger-un', 'le premier livre à ranger', F.poser('livre', 438, 218, 112, 142)),
      z('livre-a-ranger-deux', 'le deuxième livre à ranger', F.poser('livre', 438, 378, 96, 122)),
      z('echelle-de-la-salle', 'l’échelle de la salle', F.poser('echelle', 898, 178, 58, 302)),
      z('pupitre-du-milieu', 'le pupitre du milieu', F.poser('pupitre', 178, 488, 222, 102)),
      z('lampe-du-rayonnage', 'la lampe du rayonnage', F.poser('lanterne', 478, 118, 82, 102)),
    ],
    traits: [ligne([[100, 320], [380, 320]]), ligne([[578, 330], [844, 330]])],
  }),

  scene({
    habillage: 'cite.enseigne',
    fichier: 'cite-des-histoires/enseigne.svg',
    libelle: 'L’enseigne à composer',
    description:
      'Une enseigne suspendue à sa potence, vide, et quatre plaques carrées de quatre tailles ' +
      'posées en bas — les lettres viennent s’y poser une à une.',
    region: 'cite-des-histoires',
    moteurs: ['assemble'],
    zones: [
      z('facade', 'la façade', ciel(138, 8, 3)),
      z('rue', 'la rue', sol(490, 8, 5)),
      z('enseigne-cadre', 'le cadre de l’enseigne', F.poser('enseigne', 258, 178, 442, 222)),
      z('potence', 'la potence', F.ruban([[180, 118], [180, 240], [262, 248]], 22)),
      z('lettre-a-poser-un', 'la première plaque', F.rect(138, 418, 92, 92)),
      z('lettre-a-poser-deux', 'la deuxième plaque', F.rect(278, 428, 82, 82)),
      z('lettre-a-poser-trois', 'la troisième plaque', F.rect(408, 412, 102, 102)),
      z('lettre-a-poser-quatre', 'la quatrième plaque', F.rect(560, 434, 72, 72)),
      z('lanterne-de-l-enseigne', 'la lanterne de l’enseigne', F.poser('lanterne', 758, 418, 92, 122)),
    ],
    traits: [ligne([[0, 492], [960, 484]])],
  }),

  scene({
    habillage: 'cite.fresque-murale',
    fichier: 'cite-des-histoires/fresque-murale.svg',
    libelle: 'La fresque du mur de la Cité',
    description:
      'Une grande fresque en trois arches anime le mur de la Cité ; fleurs, feuillage, fanions, ' +
      'pots de peinture, arbre, porte et ciel restent faciles à montrer du doigt.',
    region: 'cite-des-histoires',
    moteurs: ['colorie'],
    fondIllustre: '/api/contenu/assets/assets/decors/archives-2026-09-05/fresque-murale.png',
    masquerGeometrie: true,
    nuancier: ['rouge', 'vert', 'jaune', 'brun', 'rose', 'orange', 'violet', 'bleu'],
    zones: [
      z('mur-de-pierre', 'le mur de pierre', ciel(60, 6, 3)),
      z('pave-de-la-rue', 'le pavé de la rue', sol(500, 7, 6)),
      z('cadre-de-la-fresque', 'le cadre de la fresque', [F.rect(60, 70, 840, 400), F.rect(100, 110, 760, 320)]),
      z('ciel', 'le ciel', [[384, 0], [684, 0], [676, 94], [420, 92]]),
      z('soleil', 'le médaillon', F.ellipse(480, 80, 46, 46, 24)),
      z('arbre', 'l’arbre', [[422, 146], [530, 142], [548, 260], [504, 322], [428, 300], [400, 224]]),
      z('feuille', 'la grande feuille', [[28, 480], [94, 454], [146, 488], [130, 552], [62, 572], [8, 536]]),
      z('scene-du-haut', 'la scène du haut', F.rect(250, 232, 122, 74)),
      z('scene-du-bas', 'la scène du bas', F.rect(250, 336, 122, 66)),
      z('scene-de-droite', 'la scène de droite', F.rect(392, 210, 118, 152)),
      z('mur', 'le mur', [[572, 330], [740, 330], [724, 430], [566, 424]]),
      z('porte', 'la porte de droite', F.arche(932, 374, 54, 126)),
      z('fleur', 'la grande fleur blanche', F.lobe(58, 500, 54, 9, 0.6, 42, 0.3, 0.8)),
      z('echafaudage', 'l’échafaudage', [F.rect(890, 100, 52, 380), F.rect(18, 100, 44, 380)]),
      z('pot-de-couleur', 'le pot de couleur', F.trapeze(300, 508, 84, 64, 74)),
      z('pot', 'le pot de peinture brun', F.trapeze(824, 520, 68, 50, 70)),
      z('pinceau', 'le pinceau', F.ruban([[600, 522], [702, 468]], 26)),
    ],
    traits: [ligne([[0, 502], [960, 494]])],
  }),
];

export const DECORS = [...CLAIRIERE, ...GALERIES, ...MARAIS, ...FORET, ...VOLCAN, ...CITE];
