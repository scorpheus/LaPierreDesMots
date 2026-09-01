/**
 * Les recettes du banc de mutation — lot Q5.
 *
 * Chaque recette casse le code de production d'UNE façon précise, nommée, et réversible. Le
 * banc (`banc-de-mutation.mjs`) les applique une par une, lance la suite, et regarde si elle
 * hurle. C'est la seule mesure honnête de la valeur d'une suite de tests : *une QA qu'on ne
 * teste pas est une QA qu'on croit sur parole.*
 *
 * Origine : `Docs/audit-qa.md` (2026-08-02) a injecté 27 mutations à la main et mesuré
 * 11 survivantes. Ce fichier rend ce chiffre PERMANENT — sans quoi la QA se dégradera sans que
 * personne ne le voie.
 *
 * ── LES QUATRE RÈGLES DE FORME, ET POURQUOI ─────────────────────────────────────────────
 *
 * 1. **L'ancrage est UNIQUE, ou le banc refuse de démarrer.** Pas de « remplace la première
 *    occurrence » : une recette qui vise deux endroits ne mesure plus rien. C'est ainsi que
 *    l'audit a découvert que `d-panse` et `q-panse` portent le même `chemin` (même famille
 *    gestuelle, D33) — d'où l'ancrage par expression régulière de M1.
 *
 * 2. **L'ancrage tient sur UNE ligne**, ou il est une expression régulière qui traverse les
 *    fins de ligne par `[\s\S]`. Le dépôt est sur Windows et git normalise LF ↔ CRLF : un
 *    ancrage littéral multi-ligne casserait au premier `git checkout`.
 *
 * 3. **`attendu` est le verdict de RÉFÉRENCE, mesuré, jamais supposé.** `DETECTEE` veut dire
 *    « la suite doit rougir ». `SURVIT` veut dire « la suite reste verte, et voici pourquoi
 *    c'est accepté ». Le banc échoue quand l'observé contredit l'attendu dans le mauvais sens.
 *
 * 4. **Un `SURVIT` porte TOUJOURS son `pourquoi`.** Un survivant sans justification écrite est
 *    un trou de QA qu'on a maquillé en décision.
 *
 * ── CE QUE `attendu: 'SURVIT'` NE VEUT PAS DIRE ─────────────────────────────────────────
 *
 * Il ne veut pas dire « ce défaut est sans importance ». Il veut dire « la suite exécutée par
 * ce banc ne le voit pas ». Trois familles :
 *
 *   • `couvertPar: 'e2e'`  — un test Playwright nommé l'attraperait, mais il exige un build
 *     (`playwright.config.ts` sert `node serveur/dist/index.js`) et la compilation appartient à
 *     l'orchestrateur (D10). Le champ `assertionE2E` NOMME le fichier et l'assertion : c'est ce
 *     qui distingue « couvert ailleurs » de « pas couvert du tout ».
 *   • `couvertPar: 'equivalent'` — la mutation ne change AUCUN comportement observable. Elle
 *     n'est pas un trou ; elle prouve une défense en profondeur.
 *   • `couvertPar: null` — **personne ne le voit. C'est un vrai trou**, et il est écrit comme
 *     tel dans le tableau de bord.
 */

/**
 * Les 27 mutations. `id` reprend la numérotation de `Docs/audit-qa.md` § 2 pour qu'un lecteur
 * puisse croiser les deux documents ligne à ligne.
 *
 * @typedef {object} Recette
 * @property {string}  id            `M1`…`M26`, `N1`…`N5`.
 * @property {string}  titre         Le défaut, en français, à hauteur d'enfant quand c'est possible.
 * @property {string}  fichier       Chemin POSIX depuis la racine du dépôt.
 * @property {string|RegExp} ancrage Littéral (une ligne) ou expression régulière. UNIQUE.
 * @property {string}  remplacement  Le texte fautif.
 * @property {'DETECTEE'|'SURVIT'} attendu  Verdict de référence, mesuré.
 * @property {'e2e'|'equivalent'|null} [couvertPar]  Pourquoi un `SURVIT` est accepté.
 * @property {string}  [assertionE2E] Fichier + assertion qui l'attraperait hors de ce banc.
 * @property {string}  [pourquoi]    Obligatoire pour tout `SURVIT`.
 * @property {string}  [regle]       La règle du projet que la mutation enfreint (D…, R…).
 * @property {boolean} [negatif]     Contrôle négatif : ne change rien, DOIT rester vert.
 */

/** @type {readonly Recette[]} */
export const MUTATIONS = [
  {
    id: 'M1',
    titre: 'Le trait `d-panse` est parcouru à l’envers — le bug D47, ré-injecté',
    regle: 'D33 · D47',
    fichier: 'contenu/modeles-lettres/minuscules.json',
    // `chemin` seul n'est pas ancrable : `d-panse` et `q-panse` portent le MÊME (D33, même
    // famille gestuelle). L'expression régulière remonte donc jusqu'à l'`id`.
    ancrage:
      /("id": "d-panse",[\s\S]{0,80}?"chemin": ")M 70\.0 60\.0 L 57\.67 60\.0 L 45\.76 62\.84 L 35\.76 69\.62 L 30\.0 80\.0 L 35\.76 90\.38 L 45\.76 97\.16 L 57\.67 100\.0 L 70\.0 100\.0"/,
    remplacement:
      '$1M 70.0 100.0 L 57.67 100.0 L 45.76 97.16 L 35.76 90.38 L 30.0 80.0 L 35.76 69.62 L 45.76 62.84 L 57.67 60.0 L 70.0 60.0"',
    attendu: 'DETECTEE'
  },
  {
    id: 'M2',
    titre: 'Le bouton « La carte » disparaît de l’écran du nœud — un écran sans issue',
    regle: 'D48 — le défaut n° 1 du père',
    fichier: 'client/src/ecrans/EcranNoeud.tsx',
    ancrage: '          data-vers="carte"',
    remplacement: '          data-vers="carte-disparue"',
    // ── CLIQUET RESSERRÉ LE 2026-08-02 À L'INTÉGRATION. « Pas avant » est arrivé.
    //
    // Le commentaire précédent, gardé ici parce qu'il vaut plus que la ligne qu'il explique,
    // disait : « le resserrement redeviendra juste le jour où ce test sera commité — pas
    // avant ». Le test est commité (6107861), donc l'invariant 3 ne l'exclut plus.
    //
    // Resserré sur TROIS mesures, pas une — la règle que M2 elle-même avait écrite après
    // s'être fait desserrer le même jour :
    //   1. banc complet ......................... 🎉 DETECTEE
    //   2. `--seulement=M2,M25` (second banc) ... 🎉 DETECTEE
    //   3. attribution différentielle ........... ANCIENNE=SURVIT · NOUVELLE=DETECTEE
    //      par `tests/composants/exploration-modele.test.tsx` — l'explorateur du lot Q2,
    //      qui énumère les transitions au lieu de compter les éléments interactifs (D48).
    //
    // C'est le défaut n° 1 du père, et il est désormais gardé AU COMPOSANT, sans build.
    attendu: 'DETECTEE',
    assertionE2E:
      'tests/e2e/parcours-audit-tout-le-site.spec.ts — « noeud/<id> » a au moins une sortie'
  },
  {
    id: 'M3',
    titre: '`journaliserEtapes` rend le bon compte et n’insère rien — la perte silencieuse',
    regle: 'annexe T § T2 — aucune tentative perdue',
    fichier: 'partage/src/base/depots/etapes.ts',
    ancrage: '  let inserees = 0;',
    remplacement: '  let inserees = etapes.length;\n  if (inserees >= 0) return inserees;',
    attendu: 'DETECTEE'
  },
  {
    id: 'M4',
    titre: '`recalculerRecoloration` rend la région telle quelle — la carte se fige',
    regle: 'défaut n° 5 du père — le logiciel VÉCU',
    fichier: 'partage/src/monde/carte.ts',
    ancrage:
      '  return { ...region, pourcentageColorie: Math.max(region.pourcentageColorie, taux) };',
    remplacement: '  return region;',
    attendu: 'DETECTEE'
  },
  {
    id: 'M5',
    titre: 'Les étoiles s’écrasent au lieu de prendre le MAX — un acquis est repris',
    regle: 'R14 — un acquis n’est jamais repris',
    fichier: 'partage/src/base/depots/progression.ts',
    ancrage: '       etoiles       = MAX(progression_noeud.etoiles, excluded.etoiles),',
    remplacement: '       etoiles       = excluded.etoiles,',
    attendu: 'DETECTEE'
  },
  {
    id: 'M6',
    titre: '`data-etat="echec"` est émis sur un refus — l’écran d’échec interdit',
    regle: 'R14 — aucun écran d’échec, jamais',
    fichier: 'client/src/moteurs/attrape/MoteurAttrape.tsx',
    ancrage: "                  data-refusee={refusee ? 'oui' : 'non'}",
    remplacement:
      "                  data-refusee={refusee ? 'oui' : 'non'}\n" +
      "                  data-etat={refusee ? 'echec' : undefined}",
    attendu: 'DETECTEE'
  },
  {
    id: 'M7a',
    titre: 'Les cibles du moteur `attrape` passent de 64 à 40 px — le doigt de l’enfant rate',
    regle: 'R16 — toute cible ≥ 64 px',
    fichier: 'client/src/moteurs/attrape/MoteurAttrape.tsx',
    ancrage:
      /[ ]{10}const largeur = Math\.max\(CIBLE_MIN, cible\.taille\[0\] \* t\.echelle\);\r?\n[ ]{10}const hauteur = Math\.max\(CIBLE_MIN, cible\.taille\[1\] \* t\.echelle\);/,
    remplacement:
      '          const largeur = Math.max(40, cible.taille[0] * t.echelle);\n' +
      '          const hauteur = Math.max(40, cible.taille[1] * t.echelle);',
    attendu: 'SURVIT',
    couvertPar: 'e2e',
    assertionE2E:
      'tests/e2e/qa-outils.ts:471 — `ciblesTropPetites()` mesure `getBoundingClientRect()`',
    pourquoi:
      'Une taille RENDUE ne se mesure pas sans mise en page : happy-dom ne calcule aucune boîte. ' +
      'Seul le navigateur réel peut le voir. C’est une zone aveugle par nature, pas par oubli.'
  },
  {
    id: 'M7b',
    titre: 'Le jeton `--cible-min` passe de 64px à 40px — TOUTES les cibles du client rétrécissent',
    regle: 'R16',
    fichier: 'client/src/styles/global.css',
    ancrage: '  --cible-min: 64px;',
    remplacement: '  --cible-min: 40px;',
    attendu: 'SURVIT',
    couvertPar: 'e2e',
    assertionE2E: 'tests/e2e/qa-outils.ts:471 — `ciblesTropPetites()`',
    pourquoi:
      'Aucune suite unitaire ne charge `global.css`. Un jeton CSS n’a de valeur qu’une fois ' +
      'appliqué par un moteur de rendu. Même zone aveugle que M7a, un cran plus grave : le ' +
      'jeton porte les cibles de TOUT le client, pas d’un seul moteur.'
  },
  {
    id: 'M8',
    titre: 'L’habillage `clairiere.luciole` ne déclare plus le moteur `eclair` qui l’utilise',
    regle: 'R13 — variété des habillages',
    fichier: 'contenu/habillages/clairiere/luciole.habillage.json',
    ancrage: '    "eclair"',
    remplacement: '    "colorie"',
    attendu: 'DETECTEE'
  },
  {
    id: 'M9',
    titre: '`erreursAvantIndice` passe de 2 à 99 — l’indice n’arrive jamais',
    regle: 'D49',
    fichier: 'partage/src/moteurs/commun/delais.ts',
    ancrage: '  erreursAvantIndice: 2,',
    remplacement: '  erreursAvantIndice: 99,',
    attendu: 'DETECTEE'
  },
  {
    id: 'M10',
    titre: '`p_devinette` est forcée à 0 dans le BKT — un QCM chanceux vaut une maîtrise',
    regle: 'D13 — les QUATRE conditions, pas trois',
    fichier: 'partage/src/pedagogie/bkt.ts',
    ancrage: '  const devinette = pDevinette(params, observation);',
    remplacement: '  const devinette = 0;',
    attendu: 'DETECTEE'
  },
  {
    id: 'M11',
    titre: 'Le bouton « écouter » se rend alors qu’aucun clip ne peut être joué — D42',
    regle: 'D42 · R15 — aucune consigne uniquement à l’écrit',
    fichier: 'client/src/composants/BoutonEcouter.tsx',
    ancrage: '  if (!services.voix.aUnClip(cle) || !reglagesFoyer.boutonEcouter) {',
    remplacement: '  if (!reglagesFoyer.boutonEcouter) {',
    attendu: 'DETECTEE'
  },
  {
    // ── Recette AJOUTÉE par le lot Q5, absente de l'audit. Elle est née d'une erreur.
    //
    // J'avais d'abord écrit M11 en retirant `data-clip`, croyant reproduire le défaut de
    // l'audit. Le banc a rendu SURVIT là où l'audit annonçait « détectée » — et la première
    // réaction, la mauvaise, était de conclure que l'audit s'était trompé. Il ne s'était pas
    // trompé : je n'avais pas injecté le même défaut que lui. Sa mutation à lui rendait le
    // bouton SANS clip (c'est M11 ci-dessus, bien détectée) ; la mienne retirait la MARQUE
    // que les tests lisent.
    //
    // La mesure ratée valait mieux que la mesure réussie : elle a montré qu'aucun test
    // unitaire ne lit `data-clip`, et que le seul qui le lit en E2E le fait NÉGATIVEMENT
    // (`toHaveCount(0)` sur `[data-clip="null"]`) — une assertion qui reste verte quand
    // l'attribut disparaît tout entier. Le commentaire du composant promet pourtant : « un
    // test n'a donc pas à croire le composant sur parole — il lit l'attribut ».
    id: 'M11b',
    titre: 'La marque `data-clip` disparaît — la preuve mécanique de D42 devient invérifiable',
    regle: 'D42',
    fichier: 'client/src/composants/BoutonEcouter.tsx',
    ancrage: '      data-clip={String(cle)}',
    remplacement: '      data-clip={undefined}',
    attendu: 'SURVIT',
    couvertPar: null,
    pourquoi:
      'RIEN, NULLE PART. `tests/e2e/parcours-variete.spec.ts:229` exige ZÉRO élément ' +
      '`[data-action="ecouter"][data-clip="null"]` : l’assertion reste verte quand l’attribut ' +
      'n’existe plus du tout — un sélecteur qui ne peut plus rien désigner ne peut plus rien ' +
      'refuser. Le garde de D42 s’auto-désarme. Remède : un test de composant qui exige la ' +
      'PRÉSENCE de `data-clip` avec la bonne clé quand `aUnClip` rend `true`.'
  },
  {
    id: 'M12',
    titre: 'Le court-circuit d’idempotence est coupé — la ceinture, sans les bretelles',
    fichier: 'partage/src/base/depots/tentatives.ts',
    ancrage: '    if (dejaLa !== null) {',
    remplacement: '    if (dejaLa !== null && false) {',
    attendu: 'SURVIT',
    couvertPar: 'equivalent',
    pourquoi:
      'MUTANT ÉQUIVALENT, et c’est une bonne nouvelle. L’insertion part quand même, la ' +
      'contrainte UNIQUE la refuse, le `catch` relit par clé et rend le MÊME objet à la même ' +
      'place. Le fichier revendique lui-même sa « ceinture et bretelles » : on a coupé la ' +
      'ceinture, les bretelles ont tenu. Ce n’est pas un trou de QA, c’est une défense en ' +
      'profondeur qui fonctionne. Compté hors du dénominateur (audit § 3, arbitrage A-1).'
  },
  {
    id: 'M13',
    titre: '`ouvrirCeQuiDoitLEtre` ignore le parallélisme — les six régions s’ouvrent d’un coup',
    regle: 'D38',
    fichier: 'partage/src/monde/carte.ts',
    ancrage: '    if (nbEnCours >= parallele) {',
    remplacement: '    if (nbEnCours >= 99) {',
    attendu: 'DETECTEE'
  },
  {
    id: 'M14',
    titre: 'La région `porte-ecole` perd son `Z` — le remplissage fuit sur toute l’image',
    regle: 'annexe P § 2 — régions fermées, vérification bloquante',
    fichier: 'contenu/habillages/clairiere/ecole.svg',
    ancrage: 'L233.5,420 Z',
    remplacement: 'L233.5,420',
    attendu: 'DETECTEE'
  },
  {
    id: 'M15',
    titre: 'Le repli « viewBox illisible » lève au lieu de replier — au milieu d’un geste',
    fichier: 'partage/src/moteurs/trace/validation.ts',
    ancrage: '  if (bornes === null || largeurRenduPx <= 0) return TOLERANCE_TRACE_PX;',
    remplacement:
      "  if (bornes === null || largeurRenduPx <= 0) throw new Error('viewBox illisible');",
    attendu: 'DETECTEE'
  },
  {
    id: 'M16',
    titre: '`promouvoir` ne fait plus monter la boîte Leitner — invisible avant J+3',
    regle: 'annexe T § T2 — le rejeu, filet contre les régressions silencieuses',
    fichier: 'partage/src/pedagogie/leitner.ts',
    ancrage: '  const boite = bornerBoite(item.boite + 1);',
    remplacement: '  const boite = bornerBoite(item.boite);',
    attendu: 'DETECTEE'
  },
  {
    id: 'M17',
    titre: 'Le client poste sur une route absente — l’enfant termine, rien n’est sauvé',
    regle: 'défaut n° 4 du père, côté CLIENT',
    fichier: 'client/src/api/port-http.ts',
    ancrage:
      '  return demander<ReponseTentative>(CHEMINS_API.tentatives, corpsJson(tentative));',
    remplacement:
      "  return demander<ReponseTentative>(CHEMINS_API.tentatives + '-absent', corpsJson(tentative));",
    attendu: 'SURVIT',
    couvertPar: 'e2e',
    assertionE2E:
      'tests/e2e/parcours-nominal.spec.ts:269-273 — « la progression du nœud joué doit persister »',
    pourquoi:
      'Le défaut n° 4 est fermé côté SERVEUR (22 cas d’API). Côté client, `EcranRecompense` ' +
      'avale l’échec du POST et aucun test de composant ne monte cet écran. Lot QA-2.'
  },
  {
    id: 'M18',
    titre: 'La flèche du guidage du ductus pointe à l’envers — on enseigne le faux, on valide le juste',
    regle: 'D33 — « un moteur qui enseigne un mauvais sens détruit le mécanisme pour lequel il existe »',
    fichier: 'client/src/moteurs/trace/GuidageLettre.tsx',
    ancrage: '  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;',
    remplacement: '  const angle = (Math.atan2(a[1] - b[1], a[0] - b[0]) * 180) / Math.PI;',
    attendu: 'SURVIT',
    couvertPar: null,
    pourquoi:
      'RIEN, NULLE PART. `grep -rn "data-guide" tests/` rend une seule ligne, et elle vérifie ' +
      'la flèche PRÉSENTE, jamais ORIENTÉE. C’est le défaut n° 3 du père déplacé d’un cran, et ' +
      'il est pire : l’enfant obéit à ce qu’il voit et le moteur le punit. Lot QA-1a.'
  },
  {
    id: 'M19',
    titre: '`onPointerMove` est débranché sur le tracé — le doigt glisse, rien ne suit',
    fichier: 'client/src/moteurs/trace/MoteurTrace.tsx',
    ancrage: '        onPointerMove={auDeplacement}',
    remplacement: '        onPointerMove={undefined}',
    attendu: 'DETECTEE'
  },
  {
    id: 'M20',
    titre: 'La clé d’idempotence oublie le nœud — deux nœuds, une seule tentative gardée',
    regle: 'contrat § 6.3',
    fichier: 'partage/src/base/depots/tentatives.ts',
    ancrage: '  return hacherSha256Hex(`${profilId}|${noeudId}|${demarreLe}|${String(graine)}`);',
    remplacement: '  return hacherSha256Hex(`${profilId}|${demarreLe}|${String(graine)}`);',
    attendu: 'SURVIT',
    couvertPar: null,
    pourquoi:
      'RIEN, NULLE PART. `grep -rn "deriverCleIdempotence" tests/` ne rend aucun résultat : la ' +
      'fonction qui décide si une tentative est un doublon n’est appelée par aucun test. ' +
      'Sévérité faible en exploitation, coût du test : dix lignes. Lot QA-1c.'
  },
  {
    id: 'M21',
    titre: 'La Clairière cite `clairiere-07`, qu’aucun contenu ne livre — un nœud fantôme',
    regle: 'défaut n° 5 — migration de contenu',
    fichier: 'contenu/monde/regions.json',
    ancrage: '        "clairiere-06"',
    remplacement: '        "clairiere-06",\n        "clairiere-07"',
    attendu: 'DETECTEE'
  },
  {
    id: 'M22',
    titre: 'La 3ᵉ étoile est donnée avec une erreur — inflation de note, rien ne « casse »',
    fichier: 'partage/src/etoiles.ts',
    ancrage: '  const sansErreur = !bareme.sansErreur || resume.nbErreurs === 0;',
    remplacement: '  const sansErreur = !bareme.sansErreur || resume.nbErreurs <= 1;',
    attendu: 'DETECTEE'
  },
  {
    id: 'M23',
    titre: 'La pastille de région passe de 46 à 20 de rayon — la carte devient intapable',
    regle: 'R16',
    fichier: 'client/src/ecrans/EcranCarte.tsx',
    ancrage: 'const RAYON_PRISE = 46;',
    remplacement: 'const RAYON_PRISE = 20;',
    attendu: 'SURVIT',
    couvertPar: 'e2e',
    assertionE2E: 'tests/e2e/qa-outils.ts:471 — `ciblesTropPetites()` sur `SELECTEUR_INTERACTIF`',
    pourquoi: 'Écran non couvert au composant (2 écrans sur 12 le sont). Lot QA-2.'
  },
  {
    id: 'M24',
    titre: 'L’écran de récompense affiche TOUJOURS trois étoiles — la note ne veut plus rien dire',
    fichier: 'client/src/ecrans/EcranRecompense.tsx',
    ancrage: '  const nombreEtoiles = etoiles ?? 1;',
    remplacement: '  const nombreEtoiles = 3;',
    attendu: 'SURVIT',
    couvertPar: 'e2e',
    assertionE2E: 'tests/e2e/cassecou.spec.ts:195-198 — `data-etoile="1"` acquise, "2" et "3" non',
    pourquoi: 'Écran non couvert au composant. Lot QA-2.'
  },
  {
    id: 'M25',
    titre: 'La carte de profil ne répond plus au tap — le jeu devient inaccessible',
    regle: 'D48 — le pire bug possible sur une appli d’enfant',
    fichier: 'client/src/ecrans/EcranProfils.tsx',
    ancrage: '      onClick={() => surChoix(profil)}',
    remplacement: '      onClick={undefined}',
    // CLIQUET RESSERRÉ le 2026-08-02, aux mêmes trois mesures que M2 : banc complet, second
    // banc `--seulement=M2,M25`, puis attribution différentielle ANCIENNE=SURVIT /
    // NOUVELLE=DETECTEE par `tests/composants/exploration-modele.test.tsx`. L'écran d'accueil
    // — la porte du jeu — n'exige plus un build pour être gardé.
    attendu: 'DETECTEE',
    assertionE2E:
      'tests/e2e/qa-outils.ts — toutes les recettes commencent par `choisirLeProfil(page)`'
  },
  {
    id: 'M26',
    titre: 'Une animation entre dans le champ de lecture — le texte bouge sous les yeux de l’enfant',
    regle: 'CLAUDE.md, règle non négociable : « le décor s’agite, le texte jamais »',
    fichier: 'client/src/lecture/ZoneDeLecture.tsx',
    ancrage: '              className="ligne-lecture"',
    remplacement:
      '              className="ligne-lecture"\n' +
      "              style={{ animation: 'clignote 1s infinite' }}",
    attendu: 'SURVIT',
    couvertPar: null,
    pourquoi:
      'RIEN, NULLE PART. `grep -rn "texte jamais\\|champ de lecture" tests/` ne rend aucun ' +
      'résultat. `ZoneDeLecture.test.tsx` porte 24 cas, aucun sur l’animation. C’est la règle ' +
      'la plus directement liée au trouble de l’enfant, et elle n’a AUCUNE traduction ' +
      'mécanique. Une règle non négociable sans test est une intention, pas une contrainte. ' +
      'Lot QA-1b.'
  }
];

/**
 * Les cinq contrôles négatifs — **la partie du banc qu'on est tenté de sauter, et qui décide
 * de tout.**
 *
 * Ils ne changent AUCUN comportement : un commentaire, une variable renommée, un espace. Une
 * suite saine doit rester **verte** dessus. Si l'un rougit, ce n'est pas la QA qu'on mesure,
 * c'est le bruit — une campagne parallèle qui écrit dans `tests/`, une base déjà rouge, un
 * fichier à moitié écrit.
 *
 * L'audit du 2026-08-02 a rendu **23 détectées sur 23** au premier passage. Résultat flatteur,
 * donc suspect. Les cinq contrôles ont tous rougi : une autre campagne écrivait ses tests
 * pendant la mesure, et le banc comptait SA rougeur comme SA détection. Sans ces cinq lignes,
 * le document aurait publié « 0 survivant » et le père aurait cru sa QA parfaite.
 *
 * > Un banc de mutation sans contrôle négatif ne mesure pas la QA, il mesure le bruit.
 */
/** @type {readonly Recette[]} */
export const CONTROLES_NEGATIFS = [
  {
    id: 'N1',
    negatif: true,
    titre: 'Un commentaire ajouté dans `carte.ts`',
    fichier: 'partage/src/monde/carte.ts',
    ancrage: 'export function ouvrirCeQuiDoitLEtre(carte: EtatCarte): EtatCarte {',
    remplacement:
      '// controle negatif du banc de mutation — ne change rien\n' +
      'export function ouvrirCeQuiDoitLEtre(carte: EtatCarte): EtatCarte {',
    attendu: 'SURVIT',
    couvertPar: 'equivalent',
    pourquoi: 'Contrôle négatif : un commentaire ne change aucun comportement.'
  },
  {
    id: 'N2',
    negatif: true,
    titre: 'Une variable locale dédoublée dans `etoiles.ts`',
    fichier: 'partage/src/etoiles.ts',
    ancrage: "  const sansAide = !bareme.sansAide || resume.aideUtilisee === 'aucune';",
    remplacement:
      "  const critereAide = !bareme.sansAide || resume.aideUtilisee === 'aucune';\n" +
      '  const sansAide = critereAide;',
    attendu: 'SURVIT',
    couvertPar: 'equivalent',
    pourquoi: 'Contrôle négatif : même valeur, un nom de plus.'
  },
  {
    id: 'N3',
    negatif: true,
    titre: 'Un espace ajouté dans le `$commentaire` de `regions.json`',
    fichier: 'contenu/monde/regions.json',
    ancrage: '  "$commentaire": "Les six régions',
    remplacement: '  "$commentaire": "Les  six régions',
    attendu: 'SURVIT',
    couvertPar: 'equivalent',
    pourquoi: 'Contrôle négatif : un commentaire de données, jamais lu par le code.'
  },
  {
    id: 'N4',
    negatif: true,
    titre: 'Un commentaire ajouté dans `depots/tentatives.ts`',
    fichier: 'partage/src/base/depots/tentatives.ts',
    ancrage: 'export async function deriverCleIdempotence(',
    remplacement:
      '// controle negatif du banc de mutation — ne change rien\n' +
      'export async function deriverCleIdempotence(',
    attendu: 'SURVIT',
    couvertPar: 'equivalent',
    pourquoi: 'Contrôle négatif.'
  },
  {
    id: 'N5',
    negatif: true,
    titre: 'Un commentaire ajouté dans `MoteurTrace.tsx`',
    fichier: 'client/src/moteurs/trace/MoteurTrace.tsx',
    ancrage: '        onPointerDown={auContact}',
    remplacement:
      '        /* controle negatif du banc de mutation — ne change rien */\n' +
      '        onPointerDown={auContact}',
    attendu: 'SURVIT',
    couvertPar: 'equivalent',
    pourquoi: 'Contrôle négatif.'
  }
];

/** Tout ce que le banc joue, contrôles négatifs compris. */
export const TOUTES_LES_RECETTES = [...MUTATIONS, ...CONTROLES_NEGATIFS];

/**
 * Le dénominateur honnête : les mutations qui VALENT.
 *
 * Un mutant équivalent ne peut pas être « raté » par une QA — il ne change rien à rater. Le
 * compter comme un trou gonflerait le problème ; le taire le cacherait. Il est donc retiré du
 * dénominateur ET nommé (audit § 3, arbitrage A-1).
 */
export const MUTATIONS_QUI_VALENT = MUTATIONS.filter((r) => r.couvertPar !== 'equivalent');

/**
 * Les défauts qu'AUCUN test du dépôt ne verrait. C'est LE chiffre de la campagne : tout le
 * reste est du contexte.
 */
export const TROUS_REELS = MUTATIONS.filter(
  (r) => r.attendu === 'SURVIT' && r.couvertPar === null
);
