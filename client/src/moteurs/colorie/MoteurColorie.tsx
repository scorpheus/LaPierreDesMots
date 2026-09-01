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
import { urlAsset } from '../../api/client.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * Le SVG d'habillage est un asset local du dépôt, servi par `urlAsset()` (`GET
 * /api/contenu/assets/*` en mode LAN, un chemin embarqué en mode autonome — contrat § 3.3) et
 * validé par `test:contenu` avant d'atteindre l'enfant. On en retire tout de même scripts et
 * gestionnaires d'événements avant injection : un asset ne doit jamais pouvoir exécuter du code.
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
    fetch(urlAsset(fichier))
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
      // La scène peut maintenant rétrécir pour tenir dans la tablette : `SceneSvg` sépare le
      // dessin de chaque région de sa prise transparente de 80 unités. R16 ne dépend donc plus
      // de la finesse de l'asset, et R20 n'a plus à payer ce défaut par un long défilement.
      // R20 — colonne souple : la scène prend l'espace restant tandis que la palette garde
      // ses cibles de 64 px. Le débordement local reste un filet de sécurité en très petit
      // portrait ; sur la tablette de référence, la scène et les commandes tiennent ensemble.
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        blockSize: '100%',
        minBlockSize: 0,
        overflowY: 'auto'
      }}
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
