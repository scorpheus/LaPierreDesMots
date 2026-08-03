/**
 * `MoteurColorie` — le composant hôte du moteur `colorie`. Lot L-E.
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurColorie` (paquet `partage`) ;
 * ce composant ne fait que trois choses : traduire un geste en `ActionColorie`, faire
 * battre l'horloge du moteur, et donner à voir l'état qu'on lui rend.
 *
 * Aucun `data-etat="echec"` n'est émis ici, ni ailleurs. C'est la traduction mécanique
 * de R14, et l'assertion centrale de `tests/e2e/cassecou.spec.ts`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { CouleurColoriage, IdRegionSvg } from '@pierre/partage';
import { DELAIS_AIDE } from '@pierre/partage';
import type { ActionColorie, ContenuColorie, EtatColorie } from '@pierre/partage';
import type { ProprietesMoteur } from '../types.js';
import { PaletteConsigne } from './PaletteConsigne.js';
import { SceneSvg } from './SceneSvg.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * Le SVG d'habillage est un asset local du dépôt, servi par
 * `GET /api/contenu/assets/*` (contrat § 3.3) et validé par `test:contenu` avant
 * d'atteindre l'enfant. On en retire tout de même scripts et gestionnaires d'événements
 * avant injection : un asset ne doit jamais pouvoir exécuter du code.
 */
function extraireCorpsSvg(texte: string): string | null {
  const correspondance = /<svg[^>]*>([\s\S]*)<\/svg>/i.exec(texte);
  const corps = correspondance?.[1];
  if (corps === undefined) return null;
  const nettoye = corps
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
  return nettoye.includes('calque-zones') ? nettoye : null;
}

export function MoteurColorie(
  proprietes: ProprietesMoteur<ContenuColorie, EtatColorie, ActionColorie>
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  // --- le décor déclaratif, s'il est là ------------------------------------
  useEffect(() => {
    let annule = false;
    const fichier = habillage.scene.fichier;
    if (typeof fetch !== 'function' || fichier.length === 0) return undefined;
    fetch(`/api/contenu/assets/${fichier}`)
      .then((reponse) => (reponse.ok ? reponse.text() : null))
      .then((texte) => {
        if (annule || texte === null) return;
        const corps = extraireCorpsSvg(texte);
        if (corps !== null) setSvgMarkup(corps);
      })
      .catch(() => {
        // Asset absent : on joue avec le décor bouchon. Le jeu reste jouable —
        // il n'existe aucun état sans issue (test `singe`).
      });
    return () => {
      annule = true;
    };
  }, [habillage]);

  // --- le battement, et la relecture automatique ---------------------------
  const refRelectures = useRef<{ consigne: string; faites: number }>({ consigne: '', faites: 0 });

  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' });
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  const etatConsigne = etat.consignes[etat.indexConsigne];

  useEffect(() => {
    // 20 s sans action sur la consigne active → relecture automatique.
    // RÉÉCOUTE, PAS AIDE (R15) : sans coût en étoiles, et sans borne.
    if (etatConsigne === undefined || etat.termineMs !== null) return;
    if (refRelectures.current.consigne !== etatConsigne.id) {
      refRelectures.current = { consigne: etatConsigne.id, faites: 0 };
    }
    const inactiviteMs = services.horloge.maintenantMs() - etatConsigne.derniereActionMs;
    const dues = Math.floor(inactiviteMs / DELAIS_AIDE.relectureMs);
    if (dues > refRelectures.current.faites) {
      refRelectures.current = { consigne: etatConsigne.id, faites: dues };
      emettre({ type: 'ecouterConsigne' });
    }
  }, [etat, etatConsigne, emettre, services]);

  // --- ce que la démonstration désigne -------------------------------------
  const regionEnDemonstration: IdRegionSvg | null =
    etat.aide !== null && etat.aide.niveau === 'demonstration' ? etat.aide.cible : null;

  const couleurEnDemonstration = useMemo<CouleurColoriage | null>(() => {
    if (regionEnDemonstration === null || etatConsigne === undefined) return null;
    const cible = etatConsigne.ciblesRestantes.find((c) => c.region === regionEnDemonstration);
    return cible === undefined ? null : cible.couleur;
  }, [regionEnDemonstration, etatConsigne]);

  const peindre = useCallback(
    (region: IdRegionSvg) => {
      emettre({ type: 'peindre', region });
    },
    [emettre]
  );

  const choisir = useCallback(
    (couleur: CouleurColoriage) => {
      emettre({ type: 'choisirCouleur', couleur });
    },
    [emettre]
  );

  // Le seul message de refus qui mérite un mot : l'enfant n'a pas pris son pinceau.
  // Ce n'est pas une erreur — `REFUS_COMPTE_ERREUR` le dit — donc pas un reproche.
  const rappel =
    etat.dernierRefus !== null && etat.dernierRefus.motif === 'aucune-couleur-choisie'
      ? 'Choisis d’abord une couleur.'
      : '';

  return (
    <div
      data-moteur="colorie"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      // ── R16 GAGNE SUR R20 ICI, ET C'EST MESURÉ ─────────────────────────────────────────
      //
      // Borner la scène la rétrécit dans les deux dimensions. Sur `colorie`, 21 régions sont
      // aussitôt passées sous le seuil des 64 px — « le tronc du premier arbre » 31 × 91,
      // « l'horloge de l'école » 47 × 47 — et 18 recettes de la QA des invariants ont rougi.
      // Vérifié en remisant le lot : la même recette passait avant, échoue après.
      //
      // Ramener un tronc de 31 px à 64 demanderait une scène 2,06 fois plus grande, soit près
      // de 2 500 px de haut sur une tablette qui en offre 1 200. Aucune mise en page ne peut
      // satisfaire les deux : le défaut est dans l'ASSET, dont les régions sont trop fines.
      //
      // « Cibles ≥ 64 px » est une règle non négociable des specs ; « rien ne défile » est un
      // retour de jeu. La scène garde donc sa taille, l'écran défile — il défilait déjà — et
      // le garde R20 porte la dette chiffrée au lieu de la taire.
      data-scene-non-reductible="oui"
      // R20 — COLONNE SOUPLE, ET NON GRILLE. En grille, la scène n'est la première rangée que
        // pour `colorie` ; `place` la met en deuxième, et une règle qui borne « la première
        // rangée » ne la touchait donc pas. Mesuré : SVG de 1 259 px dans un moteur de 931,
        // cinq cibles coupées hors du cadre.
        //
        // En colonne, la scène est le seul enfant SOUPLE (`flex: 1 1 auto; min-block-size: 0`,
        // posé par `global.css`) : elle prend ce qui reste et rétrécit quand il en manque, pendant
        // que les commandes gardent leur taille. Le style est EN LIGNE parce qu'un style en ligne
        // bat la feuille — c'est précisément ce qui rendait la première correction inerte.
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', blockSize: '100%', minBlockSize: 0 }}
    >
      <SceneSvg
        habillage={habillage}
        remplissages={etat.remplissages}
        regionEnDemonstration={regionEnDemonstration}
        regionEnRefus={etat.dernierRefus === null ? null : etat.dernierRefus.region}
        marqueRefus={etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs}
        animationsDesactivees={animationsDesactivees}
        svgMarkup={svgMarkup}
        onPeindre={peindre}
      />

      <PaletteConsigne
        consignes={contenu.consignes}
        indexConsigne={etat.indexConsigne}
        nuancier={contenu.nuancierAutorise}
        couleurChoisie={etat.couleurChoisie}
        niveauAide={etatConsigne === undefined ? 'aucune' : etatConsigne.niveauAide}
        couleurEnDemonstration={couleurEnDemonstration}
        animationsDesactivees={animationsDesactivees}
        onChoisir={choisir}
      />

      <p role="status" aria-live="polite" data-rappel={rappel === '' ? 'non' : 'oui'}>
        {rappel}
      </p>
    </div>
  );
}
