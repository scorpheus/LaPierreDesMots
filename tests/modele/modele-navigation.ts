/**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE MODÈLE DE NAVIGATION — lot Q2. Une machine à états, EN DONNÉES.
 *
 * Quels écrans existent, quelles actions y sont possibles, où chacune mène. Rien d'autre.
 * Ce fichier ne teste rien ; il DÉCLARE. Deux consommateurs le confrontent au réel :
 *
 *   • `tests/composants/exploration-modele.test.tsx` — l'explorateur parcourt l'application
 *     réelle et compare le graphe observé à celui-ci ;
 *   • `tests/unitaires/modele-navigation-coherence.test.ts` — compare ce modèle à la SOURCE
 *     (les `data-ecran` de `client/src/**`, la table de routes de `client/src/routeur.tsx`).
 *
 * ── POURQUOI UN MODÈLE, ALORS QUE LA QA COMPTE DÉJÀ LES ÉCRANS ────────────────────────────
 * `tests/e2e/parcours-audit-tout-le-site.spec.ts` fait bien ce qu'il annonce : il énumère les
 * écrans depuis la source et exige de chacun une sortie. Il ne dit RIEN de la destination :
 * un bouton « Le campement » qui mènerait au coffre le laisserait vert, puisqu'il mène bien
 * ailleurs. Quatre défauts lui échappent par construction, et ce sont ceux que le modèle
 * attrape :
 *
 *   1. **un écran atteignable que personne n'a prévu** — observé mais absent du modèle ;
 *   2. **une action qui mène ailleurs que prévu** — observée vers un écran ≠ déclaré ;
 *   3. **un écran déclaré et inatteignable** — c'est le défaut des Galeries, retourné ;
 *   4. **une transition manquante** — le bouton retour absent : déclarée, jamais observée.
 *
 * ── LA RÈGLE D'ÉCRITURE DE CE FICHIER ─────────────────────────────────────────────────────
 * L'INVENTAIRE ne s'écrit pas à la main : `ecransDeclaresDuSource()` lit les `data-ecran` du
 * client, et la cohérence du modèle avec cette liste est une assertion, pas une intention
 * (D48 : on audite les objets qui devraient porter la propriété, jamais les occurrences).
 * Les TRANSITIONS, elles, s'écrivent à la main — « où ce bouton doit-il mener » n'est écrit
 * nulle part dans le code, et c'est précisément ce qu'un modèle apporte. Un oubli ne peut pas
 * passer inaperçu : une transition observée qu'aucune ligne d'ici ne déclare fait échouer la
 * comparaison, en la nommant.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { RACINE_DEPOT, lireTexte } from '../configuration/preparation.js';

// ─────────────────────────────────────────────────────────────────────────────── les formes

/** Une prise : un sélecteur CSS, précisé au besoin par le libellé exact du contrôle. */
export interface Prise {
  readonly selecteur: string;
  readonly libelle?: string;
}

/**
 * La nature d'un état, et ce qu'on est en droit d'en exiger.
 *
 *   `jouable`  — l'enfant peut s'y arrêter. L'exploration DOIT l'atteindre, et il DOIT avoir
 *                au moins une sortie.
 *   `defensif` — l'application sait le rendre, mais aucune interaction ne peut s'y arrêter
 *                (les deux branches qui le rendent sont court-circuitées au montage). Il doit
 *                alors être couvert par un test de composant, et c'est VÉRIFIÉ.
 */
export type NatureEtat = 'jouable' | 'defensif' | 'hors-portee';

export interface EtatModele {
  /** La valeur de `data-ecran`. C'est l'identité de l'état, et la seule. */
  readonly code: string;
  readonly nature: NatureEtat;
  /** Ce que l'enfant y fait, en une ligne. */
  readonly role: string;
  /**
   * Pour un état `defensif` ou `hors-portee` : les fichiers de test qui le couvrent à la
   * place de l'exploration. Ils sont VÉRIFIÉS — le fichier doit exister et nommer l'écran.
   * Une dérogation qu'on ne vérifie pas est une exemption, et une couverture qui s'accorde
   * des exemptions ne prouve plus rien.
   */
  readonly couvertPar?: readonly string[];
  /** Pourquoi l'exploration ne peut pas s'y arrêter. Obligatoire hors de `jouable`. */
  readonly motifDeLaDerogation?: string;
}

export interface TransitionModele {
  readonly depuis: string;
  readonly vers: string;
  /**
   * La prise à taper. `null` quand la transition ne s'obtient pas par un tap unique — une
   * recette la porte alors, ou l'observation seule.
   */
  readonly prise: Prise | null;
  readonly motif: string;
  /**
   * Renseigné quand l'application fait CELA aujourd'hui et que ce n'est pas ce qu'elle
   * devrait faire. La transition reste dans le modèle — sinon la comparaison la signalerait
   * comme « non déclarée » et on la classerait par erreur en défaut de modèle — mais elle est
   * MARQUÉE, et `modele-navigation-coherence.test.ts` exige que la liste des marquées soit
   * exactement celle-ci. Un défaut ne peut donc ni s'ajouter ni se corriger en silence.
   */
  readonly defaut?: string;
  /**
   * Renseigné quand l'explorateur ne peut pas exercer la transition, avec les fichiers qui la
   * vérifient à sa place. Comme ci-dessus, la liste est exacte et vérifiée.
   */
  readonly horsPorteeExplorateur?: { readonly motif: string; readonly verifiePar: readonly string[] };
}

export interface RecetteModele {
  readonly nom: string;
  readonly depuis: string;
  readonly vers: string;
  readonly gestes: readonly Prise[];
  readonly motif: string;
}

// ────────────────────────────────────────────────────────────────────────────── LES ÉTATS

/**
 * Les treize écrans du jeu. La liste est confrontée aux `data-ecran` de la source par
 * `modele-navigation-coherence.test.ts` : elle ne peut pas prendre du retard en silence.
 */
export const ETATS: readonly EtatModele[] = [
  {
    code: 'chargement',
    nature: 'defensif',
    role: 'l’attente avant le premier rendu',
    motifDeLaDerogation:
      'les deux branches qui le rendent sont court-circuitées au montage ' +
      '(`Application.tsx` en sort dans un effet) : aucune interaction ne peut s’y arrêter',
    couvertPar: ['tests/composants/EcranChargement.test.tsx']
  },
  { code: 'profils', nature: 'jouable', role: 'qui joue — la racine' },
  { code: 'carte', nature: 'jouable', role: 'la carte du monde' },
  { code: 'noeud', nature: 'jouable', role: 'un exercice' },
  {
    code: 'recompense',
    nature: 'hors-portee',
    role: 'les étoiles du nœud clos',
    motifDeLaDerogation:
      'on n’y entre qu’en TERMINANT un exercice. Aucune suite de taps aveugles ne clôt ' +
      '`colorie` — mesuré : les huit godets sont rendus APRÈS les trente-et-une régions ' +
      '(`#1..#31` régions, `#32..#39` couleurs), donc un balayage dans l’ordre du DOM peint ' +
      'toujours avec la même couleur. Reproduire la logique des quatorze moteurs dans ' +
      'l’explorateur reviendrait à tester le modèle contre lui-même. C’est le travail des ' +
      'parcours E2E, et ils le font',
    couvertPar: [
      'tests/e2e/parcours-nominal.spec.ts',
      'tests/e2e/parcours-cascade.spec.ts',
      'tests/e2e/cassecou.spec.ts',
      'tests/e2e/parcours-trace.spec.ts'
    ]
  },
  { code: 'campement', nature: 'jouable', role: 'le campement de Gobi' },
  { code: 'coffre', nature: 'jouable', role: 'les collections' },
  { code: 'ouverture', nature: 'jouable', role: 'la séquence d’ouverture (D35)' },
  { code: 'reglages-lecture', nature: 'jouable', role: 'comment je lis (D19)' },
  { code: 'code-parent', nature: 'jouable', role: 'la porte de la zone parent' },
  { code: 'choix-profil-parent', nature: 'jouable', role: 'quel joueur le parent suit' },
  { code: 'dashboard', nature: 'jouable', role: 'le suivi parent' },
  { code: 'galerie-parent', nature: 'jouable', role: 'le catalogue d’exercices (D34)' },
  /**
   * AJOUT V1 — R38, `Docs/feuille-de-route-debug.md` § 1.4 : « Tranché par le père le
   * 2026-08-07 : une « Visite des écrans » dans la zone parent, plutôt qu'une planche de
   * captures — une planche périme au premier commit et ne montre aucune interaction. »
   * Le quatorzième `data-ecran` de la source, et le premier que ce lot ajoute au modèle.
   */
  {
    code: 'visite-parent',
    nature: 'jouable',
    role: 'la visite des 13 écrans et des 76 exercices, sans jouer (R38)'
  }
];

/** L'état d'entrée. C'est de là que part toute exploration. */
export const ETAT_RACINE = 'profils';

// ───────────────────────────────────────────────────────────────────────── LES TRANSITIONS

export const TRANSITIONS: readonly TransitionModele[] = [
  // ── depuis « qui joue ? » ──────────────────────────────────────────────────────────────
  {
    depuis: 'profils',
    vers: 'carte',
    prise: { selecteur: '[data-profil]' },
    motif: 'la carte de l’enfant ouvre le monde (v2 § 11 : un tap, aucun mot de passe)'
  },
  {
    depuis: 'profils',
    vers: 'noeud',
    prise: { selecteur: '[data-pastille-sortie]' },
    motif: 'D46 — partir en sortie en UN tap depuis l’ouverture de l’application'
  },
  {
    depuis: 'profils',
    vers: 'reglages-lecture',
    prise: { selecteur: '[data-reglages-lecture]' },
    motif: 'D19 — les réglages sont PAR PROFIL, donc l’accès part de la carte de l’enfant'
  },
  {
    depuis: 'profils',
    vers: 'code-parent',
    prise: { selecteur: '[data-acces-parent="oui"]' },
    motif: 'la porte de la zone parent, en pied de page'
  },

  // ── depuis les réglages de lecture ────────────────────────────────────────────────────
  {
    depuis: 'reglages-lecture',
    vers: 'profils',
    prise: { selecteur: 'button', libelle: 'Retour' },
    motif: 'aucun état sans issue — la sortie est un bouton de 64 px'
  },

  // ── depuis la porte parent ────────────────────────────────────────────────────────────
  {
    depuis: 'code-parent',
    vers: 'profils',
    prise: { selecteur: 'button', libelle: 'Retour au jeu' },
    motif: 'la sortie existe TOUJOURS, même pendant l’envoi'
  },
  {
    // Aucun profil n'est choisi quand le parent passe par le pied de l'écran d'accueil : la
    // zone parent demande donc QUEL joueur suivre. C'est la « seconde impasse » refermée.
    depuis: 'code-parent',
    vers: 'choix-profil-parent',
    prise: null,
    motif: 'quatre chiffres puis « poser ce code » — la recette du même nom la porte'
  },

  // ── depuis le choix du joueur à suivre ────────────────────────────────────────────────
  {
    depuis: 'choix-profil-parent',
    vers: 'dashboard',
    prise: { selecteur: '[data-suivre-profil]' },
    motif: 'le parent choisit l’enfant qu’il suit — la seconde impasse du père, refermée'
  },
  {
    depuis: 'choix-profil-parent',
    vers: 'profils',
    prise: { selecteur: 'button', libelle: 'Retour au jeu' },
    motif: 'la sortie existe dans les trois branches (chargement, erreur, liste vide)'
  },

  // ── depuis le suivi parent ────────────────────────────────────────────────────────────
  {
    depuis: 'dashboard',
    vers: 'profils',
    prise: { selecteur: 'button', libelle: 'Fermer l’espace parent' },
    motif: 'le parent rend la main au jeu'
  },
  {
    // AJOUT V1 — la porte d'entrée de la visite depuis le dashboard.
    depuis: 'dashboard',
    vers: 'visite-parent',
    prise: { selecteur: 'button', libelle: 'Visite des écrans' },
    motif: 'R38 — le père : « me donner des pages en mode parent juste pour faire des retours »'
  },
  {
    // La porte du plein écran vit DANS l'onglet « Les exercices » : elle n'existe pas tant
    // que l'onglet n'est pas actif. Mesuré par l'explorateur, qui a rendu `[data-vers=
    // "galerie-parent"] INTROUVABLE` sur le dashboard fraîchement ouvert. Ce n'était pas un
    // défaut de l'application : c'était le modèle qui décrivait un raccourci qui n'existe pas.
    depuis: 'dashboard',
    vers: 'galerie-parent',
    prise: null,
    motif: 'D34 — la galerie en plein écran, derrière l’onglet « Les exercices »'
  },
  /**
   * ⚠ CORRIGÉ PAR LE LOT V1, ET C'EST LA MARQUE `defaut` QUI A ATTRAPÉ LE CHANGEMENT.
   *
   * Cette transition visait `choix-profil-parent`, marquée `defaut` : « elle DEVRAIT ramener
   * au `dashboard` du même enfant, et elle redemande quel joueur suivre » (Q2-2 —
   * `HoteDashboard` et `HoteGalerieParent` tenaient chacun leur PROPRE `profilSuivi` en état
   * local). Le lot V1 a dû corriger EXACTEMENT ce défaut pour que sa propre visite survive à la
   * navigation entre les trois hôtes de la zone parent (`FournisseurZoneParent`,
   * `client/src/routeur.tsx`) : `profilSuivi` est maintenant PARTAGÉ. Mesuré après correction :
   * `[data-galerie-retour="oui"]` mène désormais à `dashboard`, directement, sans redemander.
   *
   * Ce fichier documente lui-même la règle qui s'applique ici : « le jour où le profil suivi
   * sera partagé, ce cas rougira et demandera qu'on retire la marque » — c'est fait. La marque
   * `defaut` disparaît ; `tests/unitaires/modele-navigation-coherence.test.ts` en a été averti
   * (son cas « les transitions marquées DÉFAUT » attendait cette entrée nommément).
   */
  {
    depuis: 'galerie-parent',
    vers: 'dashboard',
    prise: { selecteur: '[data-galerie-retour="oui"]' },
    motif:
      'la sortie est dans l’en-tête, visible sans défiler ; le profil suivi étant partagé ' +
      '(lot V1), elle ramène directement au dashboard du même enfant'
  },

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════
   * AJOUT V1 — depuis la visite des écrans (R38).
   *
   * Onze sauts DIRECTS, un par écran nommé de `VisiteDesEcrans.tsx`, plus le lancement d'un
   * exercice — chacun est un point de navigation RÉEL câblé par `HoteVisiteDesEcrans`
   * (`client/src/routeur.tsx`), jamais une recette inventée pour ce fichier. `recompense` n'a
   * volontairement PAS de transition directe depuis `visite-parent` : elle s'atteint en
   * TERMINANT un exercice, pas en le lançant — même dérogation que `noeud → recompense`
   * plus bas, pour le même motif.
   *
   * ⚠ `visite-parent → noeud` A D'ABORD ÉTÉ LAISSÉE NON DÉCLARÉE, ET C'EST DEVENU LE
   * SIGNALEMENT, PAS LA DÉCISION.
   *
   * `tests/modele/serveur-double.ts` construisait ses entrées de catalogue SANS poser
   * `EntreeGalerie.noeud` — mesuré, `entree.noeud` y valait `undefined` à l'exécution. Sur le
   * VRAI serveur, chaque exercice porte un nœud (mesuré : bijection exacte entre les 76
   * fichiers de `contenu/noeuds/` et les 76 de `contenu/exercices/`), et le lancement mène bien
   * à `noeud` — mais rien, dans le double d'ALORS, ne pouvait l'exercer, et aucun fichier
   * n'existait pour justifier une dérogation `horsPorteeExplorateur` honnête. Signalé plutôt
   * que masqué par une fausse citation, comme demandé.
   *
   * L'agent QA a mesuré l'écart, complété le double (`exercice → nœud`, DÉRIVÉ de
   * `contenu/noeuds/`, jamais écrit à la main — voir l'en-tête de `noeudParExercice` dans
   * `serveur-double.ts`), puis rendu le fichier sans trancher la déclaration : « compléter le
   * double sans déclarer la transition rend l'exploration rouge sur une surprise ; la
   * déclaration appartient au fichier que V1 possède. » C'est cette moitié-ci.
   * ══════════════════════════════════════════════════════════════════════════════════════
   */
  {
    depuis: 'visite-parent',
    vers: 'noeud',
    prise: { selecteur: '[data-galerie-lancer]' },
    motif:
      'R38/R30 — lancer n’importe quel exercice du catalogue affiché sur la visite ; ' +
      '`data-galerie-lancer` porte un exercice différent par tuile, la prise en désigne ' +
      'une, représentative des 76'
  },
  {
    depuis: 'visite-parent',
    vers: 'profils',
    prise: { selecteur: '[data-visite-ecran="profils"]' },
    motif: 'R38 — le saut direct vers l’accueil, sans jouer'
  },
  {
    depuis: 'visite-parent',
    vers: 'carte',
    prise: { selecteur: '[data-visite-ecran="carte"]' },
    motif: 'R38 — le saut direct vers la carte'
  },
  {
    depuis: 'visite-parent',
    vers: 'ouverture',
    prise: { selecteur: '[data-visite-ecran="ouverture"]' },
    motif: 'R38 — le saut direct vers la séquence d’ouverture'
  },
  {
    depuis: 'visite-parent',
    vers: 'campement',
    prise: { selecteur: '[data-visite-ecran="campement"]' },
    motif: 'R38 — le saut direct vers le campement'
  },
  {
    depuis: 'visite-parent',
    vers: 'coffre',
    prise: { selecteur: '[data-visite-ecran="coffre"]' },
    motif: 'R38 — le saut direct vers le coffre'
  },
  {
    depuis: 'visite-parent',
    vers: 'reglages-lecture',
    prise: { selecteur: '[data-visite-ecran="reglages-lecture"]' },
    motif: 'R38 — le saut direct vers les réglages de lecture'
  },
  {
    depuis: 'visite-parent',
    vers: 'code-parent',
    prise: { selecteur: '[data-visite-ecran="code-parent"]' },
    motif: 'R38 — le saut direct vers la porte de la zone parent'
  },
  {
    depuis: 'visite-parent',
    vers: 'choix-profil-parent',
    prise: { selecteur: '[data-visite-ecran="choix-profil-parent"]' },
    motif: 'R38 — la prévisualisation, sur sa route dédiée (`parentVisiteApercuProfil`)'
  },
  {
    depuis: 'visite-parent',
    vers: 'dashboard',
    prise: { selecteur: '[data-visite-ecran="dashboard"]' },
    motif: 'R38 — le saut direct vers le suivi parent'
  },
  {
    depuis: 'visite-parent',
    vers: 'galerie-parent',
    prise: { selecteur: '[data-visite-ecran="galerie-parent"]' },
    motif: 'R38 — le saut direct vers la galerie plein écran'
  },

  // ── depuis la carte ───────────────────────────────────────────────────────────────────
  {
    depuis: 'carte',
    vers: 'campement',
    prise: { selecteur: '[data-vers="campement"]' },
    motif: 'le campement est le second lieu du monde'
  },
  {
    depuis: 'carte',
    vers: 'ouverture',
    prise: { selecteur: '[data-vers="ouverture"]' },
    motif: 'D35 — le récit est REJOUABLE, son entrée est en haut de la carte'
  },
  {
    depuis: 'carte',
    vers: 'profils',
    prise: { selecteur: 'button', libelle: 'Changer de joueur' },
    motif: 'deux frères partagent la tablette'
  },
  {
    depuis: 'carte',
    vers: 'noeud',
    prise: { selecteur: '[data-depart]' },
    motif: 'entrer dans une région ouverte — la reprise au premier nœud non terminé'
  },

  // ── depuis le campement ───────────────────────────────────────────────────────────────
  {
    depuis: 'campement',
    vers: 'carte',
    prise: { selecteur: '[data-vers="carte"]' },
    motif: 'retour à la carte'
  },
  {
    depuis: 'campement',
    vers: 'coffre',
    prise: { selecteur: '[data-vers="coffre"]' },
    motif: 'le coffre aux collections'
  },
  {
    depuis: 'campement',
    vers: 'ouverture',
    prise: { selecteur: '[data-vers="ouverture"]' },
    motif: 'D35, point 3 — le campement rejoue l’ouverture'
  },
  {
    // La pastille de sortie est POSÉE PARTOUT où l'enfant peut vouloir repartir : l'écran
    // d'accueil et le campement. D46 — « aucun écran intermédiaire obligatoire, nulle part ».
    depuis: 'campement',
    vers: 'noeud',
    prise: { selecteur: '[data-pastille-sortie]' },
    motif: 'D46 — repartir en sortie depuis le campement, sans repasser par la carte'
  },

  // ── depuis le coffre ──────────────────────────────────────────────────────────────────
  {
    depuis: 'coffre',
    vers: 'campement',
    prise: { selecteur: '[data-vers="campement"]' },
    motif: 'le défaut n° 1 du père : un aller sans retour est le pire bug possible ici'
  },

  // ── depuis la séquence d'ouverture ────────────────────────────────────────────────────
  {
    depuis: 'ouverture',
    vers: 'carte',
    prise: { selecteur: '[data-passer="ouverture"]' },
    motif: 'D46 — la sortie immédiate, sans condition et sans « es-tu sûr ? »'
  },
  /**
   * R19 — LES DEUX PRISES DU RÉCIT, déclarées depuis que le minuteur a été retiré.
   *
   * L'enchaînement automatique avançait le récit tout seul toutes les six secondes ; le père
   * l'a fait retirer (« on n'a pas le temps de lire, ça passe directement »). L'explorateur
   * n'avait donc PLUS AUCUN moyen d'avancer dans l'histoire, et sept écrans sur onze sont
   * devenus inatteignables d'un coup — ce que ce fichier a signalé immédiatement, et c'est
   * exactement son travail.
   *
   * Les deux prises restent sur `ouverture` : le récit se parcourt tableau par tableau, et
   * seule la dernière page fait sortir. Une transition sur soi-même n'est pas un artifice —
   * c'est ce qu'est un livre qu'on feuillette.
   */
  {
    depuis: 'ouverture',
    vers: 'ouverture',
    prise: { selecteur: '[data-suite="ouverture"]' },
    motif: 'R19 — on avance au tap, jamais au chronomètre',
    horsPorteeExplorateur: {
      motif:
        'L’explorateur compare des ÉCRANS ; une transition sur soi-même ne change pas d’écran, ' +
        'donc il ne peut ni la distinguer d’un tap sans effet, ni voir que le TABLEAU a changé.',
      verifiePar: ['tests/composants/EcranOuverture.test.tsx']
    }
  },
  {
    depuis: 'ouverture',
    vers: 'ouverture',
    prise: { selecteur: '[data-retour="ouverture"]' },
    motif: 'R19 — « un tout petit bouton pour revenir en arrière au cas où »',
    horsPorteeExplorateur: {
      motif:
        'Prise CONDITIONNELLE : absente du premier tableau, parce qu’un retour qui ne mène ' +
        'nulle part est un bouton qui ment. L’explorateur exige qu’une prise déclarée existe ' +
        'sur son écran — il a raison en général, et cette exception se vérifie ailleurs, plus ' +
        'finement : présence, absence au premier tableau, et retour effectif au précédent.',
      verifiePar: ['tests/composants/EcranOuverture.test.tsx']
    }
  },

  // ── depuis un exercice ────────────────────────────────────────────────────────────────
  {
    depuis: 'noeud',
    vers: 'carte',
    prise: { selecteur: '[data-vers="carte"]' },
    motif: 'LA SORTIE. Elle a déjà manqué une fois — c’est le défaut n° 1 du père'
  },
  {
    depuis: 'noeud',
    vers: 'recompense',
    prise: null,
    motif: 'la clôture de l’exercice — aucune prise unique, elle s’obtient en JOUANT',
    horsPorteeExplorateur: {
      motif:
        'terminer un exercice demande la logique du moteur, pas une suite de taps. Voir le ' +
        'motif de dérogation de l’état `recompense`',
      verifiePar: [
        'tests/e2e/parcours-nominal.spec.ts',
        'tests/e2e/parcours-cascade.spec.ts',
        'tests/e2e/cassecou.spec.ts',
        'tests/e2e/parcours-trace.spec.ts'
      ]
    }
  },

  // ── depuis la récompense ──────────────────────────────────────────────────────────────
  {
    depuis: 'recompense',
    vers: 'carte',
    prise: { selecteur: 'button', libelle: 'Retour à la carte' },
    motif: 'retour au monde',
    horsPorteeExplorateur: {
      motif: 'l’explorateur n’atteint pas `recompense` — voir la dérogation de cet état',
      verifiePar: ['tests/e2e/parcours-nominal.spec.ts', 'tests/e2e/parcours-cascade.spec.ts']
    }
  },
  {
    depuis: 'recompense',
    vers: 'noeud',
    prise: { selecteur: 'button', libelle: 'Rejouer' },
    motif: 'v2 § 6.2 — rejouer un nœud déjà à trois étoiles reste possible',
    horsPorteeExplorateur: {
      motif: 'l’explorateur n’atteint pas `recompense` — voir la dérogation de cet état',
      verifiePar: ['tests/e2e/parcours-nominal.spec.ts', 'tests/e2e/cassecou.spec.ts']
    }
  }
];

/**
 * Les recettes composites : ce qu'un seul tap ne franchit pas.
 *
 * Il n'y en a qu'une, et son existence est justifiée : la porte parent demande QUATRE chiffres
 * puis une validation. Aucune énumération d'éléments un par un ne la franchit — non par
 * faiblesse de l'explorateur, mais parce que c'est le but de la porte.
 */
export const RECETTES: readonly RecetteModele[] = [
  {
    nom: 'poser le code du foyer et entrer',
    depuis: 'code-parent',
    // Aucun profil n'est choisi quand le parent passe par le pied de l'écran d'accueil : le
    // routeur demande alors QUEL joueur suivre. C'est la correction de la « seconde impasse ».
    vers: 'choix-profil-parent',
    gestes: [
      { selecteur: '[data-touche="1"]' },
      { selecteur: '[data-touche="2"]' },
      { selecteur: '[data-touche="3"]' },
      { selecteur: '[data-touche="4"]' },
      { selecteur: '[data-valider="code-parent"]' }
    ],
    motif: 'la porte à quatre chiffres — v2 § 11 et contrat de finition v3 § 1.8'
  },
  /**
   * ⚠ RACCOURCIE PAR LE LOT V1. Le troisième geste (`[data-suivre-profil]`) existait pour
   * contourner Q2-2 — `profilSuivi` n'étant PAS partagé, arriver en plein écran redemandait le
   * joueur. Le lot V1 a partagé `profilSuivi` (`FournisseurZoneParent`, `client/src/
   * routeur.tsx`) pour que sa propre visite tienne d'une route à l'autre ; cette recette en
   * bénéficie sans rien y faire de spécial. Mesuré : `[data-suivre-profil]` n'apparaît plus sur
   * `galerie-parent` une fois qu'un profil est déjà suivi — deux gestes suffisent désormais.
   */
  {
    nom: 'ouvrir la galerie en plein écran',
    depuis: 'dashboard',
    vers: 'galerie-parent',
    gestes: [
      { selecteur: '[data-onglet-parent="galerie"]' },
      { selecteur: '[data-vers="galerie-parent"]' }
    ],
    motif: 'D34 — l’onglet, puis la porte du plein écran'
  }
];

// ───────────────────────────────────────────────────────────── ce que la SOURCE déclare

const EXTENSIONS_SOURCE = ['.ts', '.tsx'];

function fichiersSous(dossier: string): readonly string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const complet = join(dossier, entree);
    if (statSync(complet).isDirectory()) {
      trouves.push(...fichiersSous(complet));
    } else if (EXTENSIONS_SOURCE.some((extension) => entree.endsWith(extension))) {
      trouves.push(complet);
    }
  }
  return trouves;
}

/**
 * Les `data-ecran="…"` écrits dans `client/src/**`. C'est l'INVENTAIRE qui fait foi.
 *
 * Lève si le motif ne trouve rien : sans ce garde, une couverture vide serait vraie par
 * vacuité, et c'est exactement le mensonge que ce lot existe pour rendre impossible.
 */
export function ecransDeclaresDuSource(): readonly string[] {
  const vus = new Set<string>();
  for (const fichier of fichiersSous(join(RACINE_DEPOT, 'client', 'src'))) {
    const source = lireTexte(fichier.slice(RACINE_DEPOT.length).split('\\').join('/'));
    for (const trouve of source.matchAll(/data-ecran="([a-z-]+)"/gu)) {
      vus.add(trouve[1] as string);
    }
  }
  if (vus.size === 0) {
    throw new Error(
      'Modèle Q2 : aucun `data-ecran="…"` dans client/src. L’inventaire serait vide, donc la ' +
        'comparaison serait vraie par vacuité — on refuse de continuer.'
    );
  }
  return [...vus].sort();
}

export interface TableDesRoutes {
  /** Les chemins montés par `createRoute({ path: … })`. */
  readonly declarees: readonly string[];
  /** Les chemins cibles d'un `naviguer({ to: … })`, plus la racine du montage. */
  readonly naviguees: readonly string[];
  /**
   * Les chemins que le MIROIR du magasin pousse tout seul.
   *
   * `Routeur` s'abonne à `EtatMagasin.ecran` et fait `routeur.history.push(CHEMIN_PAR_ECRAN[
   * ecran])` : les cinq chemins de cette table sont donc atteints sans qu'aucun `naviguer`
   * ne les vise. Les compter comme orphelins serait faux — `/noeud` et `/recompense` sont
   * atteints à chaque partie.
   */
  readonly pousseesParLeMiroir: readonly string[];
}

/**
 * La table des routes de `client/src/routeur.tsx`, lue dans la source.
 *
 * Deux populations, et c'est tout l'intérêt de les séparer : une route MONTÉE qu'aucune
 * navigation ne vise est un écran que l'application sait rendre et où personne ne peut aller.
 * C'est la forme statique du défaut des Galeries.
 */
export function tableDesRoutes(): TableDesRoutes {
  const source = lireTexte('client/src/routeur.tsx');

  /** Les constantes de chemin : `campement: '/campement'` dans `CHEMINS` et `CHEMIN_PAR_ECRAN`. */
  const constantes = new Map<string, string>();
  for (const trouve of source.matchAll(/^\s{2}([A-Za-zÀ-ÿ]+):\s*'(\/[^']*)'/gmu)) {
    constantes.set(trouve[1] as string, trouve[2] as string);
  }

  const resoudre = (expression: string): string | null => {
    const litteral = /^'(\/[^']*)'$/u.exec(expression.trim());
    if (litteral !== null) return litteral[1] as string;
    const membre = /^(?:CHEMINS|CHEMIN_PAR_ECRAN)\.([A-Za-zÀ-ÿ]+)$/u.exec(expression.trim());
    if (membre === null) return null;
    return constantes.get(membre[1] as string) ?? null;
  };

  const declarees = new Set<string>();
  for (const trouve of source.matchAll(/path:\s*([^,\n]+)/gu)) {
    const chemin = resoudre(trouve[1] as string);
    if (chemin !== null) declarees.add(chemin);
  }

  const naviguees = new Set<string>();
  for (const trouve of source.matchAll(/naviguer\(\{\s*to:\s*([^}]+?)\s*\}\)/gu)) {
    const chemin = resoudre(trouve[1] as string);
    if (chemin !== null) naviguees.add(chemin);
  }
  // La racine est atteinte au montage (`createMemoryHistory({ initialEntries: ['/'] })`),
  // jamais par un `naviguer`. Elle est donc naviguée par construction.
  naviguees.add('/');

  const bloc = /CHEMIN_PAR_ECRAN[^=]*=\s*\{([^}]*)\}/u.exec(source);
  const pousseesParLeMiroir = new Set<string>();
  for (const trouve of (bloc?.[1] ?? '').matchAll(/'(\/[^']*)'/gu)) {
    pousseesParLeMiroir.add(trouve[1] as string);
  }

  if (declarees.size === 0) {
    throw new Error('Modèle Q2 : aucune route lue dans client/src/routeur.tsx.');
  }
  if (pousseesParLeMiroir.size === 0) {
    throw new Error('Modèle Q2 : `CHEMIN_PAR_ECRAN` illisible dans client/src/routeur.tsx.');
  }
  return {
    declarees: [...declarees].sort(),
    naviguees: [...naviguees].sort(),
    pousseesParLeMiroir: [...pousseesParLeMiroir].sort()
  };
}

/**
 * Les routes MONTÉES qu'aucune navigation ne vise et que le miroir du magasin ne pousse pas.
 *
 * C'est la forme STATIQUE du défaut des Galeries : un écran que l'application sait rendre et
 * où personne ne peut aller. Pure, pour qu'on puisse lui soumettre une table fautive et
 * exiger qu'elle le dise.
 */
export function routesOrphelines(table: TableDesRoutes): readonly string[] {
  const atteintes = new Set([...table.naviguees, ...table.pousseesParLeMiroir]);
  return table.declarees.filter((route) => !atteintes.has(route)).sort();
}

/**
 * Les routes orphelines CONNUES au 2026-08-02, avec leur raison.
 *
 * `modele-navigation-coherence.test.ts` exige l'égalité STRICTE avec la mesure, dans les deux
 * sens : une nouvelle orpheline fait rougir, et une orpheline réparée AUSSI — parce qu'il
 * faudra alors la retirer d'ici. Ce n'est pas une exemption, c'est une dette datée.
 *
 * ⚠ `/reglages-lecture` EN EST RETIRÉE PAR LE LOT V1 — dette réparée, pas oubliée. Elle était
 * orpheline parce qu'AUCUN `naviguer` ne visait la route montée. `HoteVisiteDesEcrans` en pose
 * un désormais (`surAllerReglagesLecture`, `client/src/routeur.tsx:717`) : mesuré,
 * `grep -n "reglagesLecture" client/src/routeur.tsx` rend maintenant sa déclaration, SON
 * `naviguer`, et son `createRoute` — trois lignes, plus une seule. La route a une entrée ; la
 * seconde moitié de la question Q2-1 (« lui donner une entrée, ou la retirer ? ») est tranchée
 * par le fait, pas par un arbitrage écrit.
 */
export const ROUTES_ORPHELINES_CONNUES: Readonly<Record<string, string>> = {};

// ──────────────────────────────────────────────────── l'audit du modèle, en fonction PURE

/**
 * Les règles du modèle. Nommées, pour qu'un échec dise LAQUELLE a cédé — un compte
 * d'anomalies n'apprend rien à qui doit corriger.
 */
export const REGLES_MODELE = {
  POPULATION_VIDE: 'population vide — la vérification serait vraie par vacuité',
  ETAT_INCONNU: 'une transition cite un état que le modèle ne déclare pas',
  ECRAN_SOURCE_NON_MODELISE: 'un `data-ecran` de la source ne figure pas dans le modèle',
  ETAT_ABSENT_DE_LA_SOURCE: 'un état du modèle ne correspond à aucun `data-ecran` de la source',
  ETAT_SANS_SORTIE: 'un état jouable dont aucune transition ne part — un état sans issue',
  ETAT_INATTEIGNABLE: 'un état jouable qu’aucun chemin du modèle n’atteint depuis la racine',
  DEROGATION_SANS_MOTIF: 'un état non jouable sans motif de dérogation',
  DEROGATION_SANS_COUVERTURE: 'un état non jouable qu’aucun fichier de test ne couvre'
} as const;

export interface AnomalieModele {
  readonly regle: string;
  readonly ou: string;
}

export interface EntreeAudit {
  readonly etats: readonly EtatModele[];
  readonly transitions: readonly TransitionModele[];
  readonly ecransDeLaSource: readonly string[];
  readonly racine: string;
}

/**
 * Confronte le modèle à lui-même ET à la source. PURE : c'est ce qui permet de lui soumettre
 * un modèle volontairement fautif et d'exiger qu'il le refuse — sans quoi « aucune anomalie »
 * pourrait aussi bien vouloir dire « cette fonction ne trouve jamais rien ».
 */
export function auditerModele(entree: EntreeAudit): readonly AnomalieModele[] {
  const anomalies: AnomalieModele[] = [];
  const ajouter = (regle: string, ou: string): void => {
    anomalies.push({ regle, ou });
  };

  if (entree.etats.length === 0 || entree.ecransDeLaSource.length === 0) {
    ajouter(REGLES_MODELE.POPULATION_VIDE, 'états ou écrans de la source');
    return anomalies;
  }

  const codes = new Set(entree.etats.map((etat) => etat.code));

  for (const transition of entree.transitions) {
    if (!codes.has(transition.depuis)) ajouter(REGLES_MODELE.ETAT_INCONNU, transition.depuis);
    if (!codes.has(transition.vers)) ajouter(REGLES_MODELE.ETAT_INCONNU, transition.vers);
  }

  for (const ecran of entree.ecransDeLaSource) {
    if (!codes.has(ecran)) ajouter(REGLES_MODELE.ECRAN_SOURCE_NON_MODELISE, ecran);
  }
  const deLaSource = new Set(entree.ecransDeLaSource);
  for (const etat of entree.etats) {
    if (!deLaSource.has(etat.code)) ajouter(REGLES_MODELE.ETAT_ABSENT_DE_LA_SOURCE, etat.code);
  }

  for (const etat of entree.etats) {
    if (etat.nature === 'jouable') continue;
    if ((etat.motifDeLaDerogation ?? '').trim() === '') {
      ajouter(REGLES_MODELE.DEROGATION_SANS_MOTIF, etat.code);
    }
    if ((etat.couvertPar ?? []).length === 0) {
      ajouter(REGLES_MODELE.DEROGATION_SANS_COUVERTURE, etat.code);
    }
  }

  // ── aucune issue, et aucun état qu'on ne peut pas atteindre ─────────────────────────
  const sortants = new Map<string, string[]>();
  for (const transition of entree.transitions) {
    if (transition.vers === transition.depuis) continue;
    sortants.set(transition.depuis, [...(sortants.get(transition.depuis) ?? []), transition.vers]);
  }
  for (const etat of entree.etats) {
    if (etat.nature !== 'jouable') continue;
    if ((sortants.get(etat.code) ?? []).length === 0) {
      ajouter(REGLES_MODELE.ETAT_SANS_SORTIE, etat.code);
    }
  }

  const atteints = new Set<string>([entree.racine]);
  const aVoir = [entree.racine];
  while (aVoir.length > 0) {
    const courant = aVoir.shift() as string;
    for (const suivant of sortants.get(courant) ?? []) {
      if (atteints.has(suivant)) continue;
      atteints.add(suivant);
      aVoir.push(suivant);
    }
  }
  for (const etat of entree.etats) {
    if (etat.nature !== 'jouable') continue;
    if (!atteints.has(etat.code)) ajouter(REGLES_MODELE.ETAT_INATTEIGNABLE, etat.code);
  }

  return anomalies;
}

/** Résumé chiffré du modèle, imprimé même quand tout passe : c'est ce qu'on lit le jour où il baisse. */
export function resumerModele(entree: EntreeAudit): string {
  return (
    `[q2] ${String(entree.etats.length)} état(s) · ` +
    `${String(entree.transitions.length)} transition(s) · ` +
    `${String(entree.ecransDeLaSource.length)} data-ecran dans la source`
  );
}

// ────────────────────────────────────────────────────────────────── petits accès au modèle

export const CODES_ETATS: readonly string[] = ETATS.map((etat) => etat.code).sort();

export const ETATS_JOUABLES: readonly string[] = ETATS.filter(
  (etat) => etat.nature === 'jouable'
)
  .map((etat) => etat.code)
  .sort();

export const ETATS_DEFENSIFS: readonly string[] = ETATS.filter(
  (etat) => etat.nature === 'defensif'
)
  .map((etat) => etat.code)
  .sort();

/** Clé canonique d'une transition, pour comparer deux ensembles sans ambiguïté. */
export function cle(depuis: string, vers: string): string {
  return `${depuis} → ${vers}`;
}
