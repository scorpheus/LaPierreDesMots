import { useState } from 'react';
import type { ReactElement } from 'react';
import type { GainCascade, RecompenseObtenue } from '@pierre/partage';
import { appliquerEtoiles, ETAT_CASCADE_VIDE, lireSeuilsCascade } from '@pierre/partage/recompenses';
import { formesDuDocument } from '@pierre/partage/monde';
import parametres from '../../../contenu/referentiel/parametres-recompenses.json' with { type: 'json' };
import documentGobi from '../../../contenu/monde/gobi-stades.json' with { type: 'json' };
import { CascadeRecompense } from '../composants/CascadeRecompense.js';

const seuils = lireSeuilsCascade(parametres);
const instantSimulation = '2026-09-09T00:00:00.000Z';
const formes = formesDuDocument(documentGobi);

function avecForme(gain: GainCascade): GainCascade {
  const forme = formes[(gain.etat.intermediairesTotal - 1) % formes.length];
  if (forme === undefined) return gain;
  return {
    ...gain,
    recompenses: gain.recompenses.map((recompense) => recompense.nature === 'forme-gobi'
      ? { ...recompense, reference: forme.grapheme, asset: forme.cristal }
      : recompense),
  };
}

/** Exemples de présentation, distincts de l'attribution simulée et de ses compteurs. */
function avecTousLesCadeaux(gain: GainCascade): GainCascade {
  const forme = formes.find((candidate) => candidate.grapheme === 'er') ?? formes[0];
  const intermediaire: RecompenseObtenue = {
    palier: 'intermediaire', nature: seuils.natureIntermediaire,
    reference: null, asset: null, region: null,
  };
  return {
    ...gain,
    recompenses: [
      { palier: 'etoile', nature: 'etoile', reference: null, asset: null, region: null },
      intermediaire,
      { palier: 'rare', nature: seuils.natureRare, reference: null, asset: null, region: null },
      ...(forme === undefined ? [] : [{ ...intermediaire, reference: forme.grapheme, asset: forme.cristal }]),
    ],
  };
}

function gainInitial(exercices: number): GainCascade {
  const nombre = Number.isFinite(exercices) ? Math.max(0, Math.min(10000, Math.trunc(exercices))) : 23;
  let gain = appliquerEtoiles(ETAT_CASCADE_VIDE, 0, seuils, instantSimulation);
  for (let rang = 0; rang < nombre; rang += 1) {
    gain = appliquerEtoiles(gain.etat, 1, seuils, instantSimulation);
  }
  return appliquerEtoiles(gain.etat, 0, seuils, instantSimulation);
}

/** Banc adulte en mémoire : aucun service de profil ni écriture dans le journal. */
export function EcranDebugRecompenses({ exercicesInitiaux = 23 }: {
  readonly exercicesInitiaux?: number;
}): ReactElement {
  const [gain, changerGain] = useState(() => gainInitial(exercicesInitiaux));
  const [tousLesCadeaux, montrerTousLesCadeaux] = useState(() =>
    new URLSearchParams(window.location.search).get('cadeaux') === '1');
  const [message, changerMessage] = useState('Choisissez une action pour vérifier le décompte.');
  return (
    <main data-ecran="dashboard" data-debug="recompenses"
      style={{ padding: '2rem', maxWidth: '60rem', margin: 'auto' }}>
      <h1>Test des compteurs de récompenses</h1>
      <p>Simulation : aucun enregistrement et aucune modification du profil Ezekiel.</p>
      <p>{gain.etat.etoilesTotal} nouveaux exercices réussis simulés.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBlock: '1rem' }}>
        <button className="cible" type="button" onClick={() => {
          montrerTousLesCadeaux(false);
          changerGain((precedent) => avecForme(appliquerEtoiles(precedent.etat, 1, seuils, instantSimulation)));
          changerMessage('Nouvel exercice réussi : les compteurs avancent de un.');
        }}>+1 nouvel exercice réussi</button>
        <button className="cible" type="button" onClick={() => {
          montrerTousLesCadeaux(false);
          changerGain((precedent) => appliquerEtoiles(precedent.etat, 0, seuils, instantSimulation));
          changerMessage('Exercice déjà acquis : aucun crédit supplémentaire.');
        }}>Rejouer un exercice déjà acquis</button>
        <button className="cible" type="button" onClick={() => {
          montrerTousLesCadeaux(false);
          changerGain(gainInitial(exercicesInitiaux));
          changerMessage('Simulation réinitialisée.');
        }}>Réinitialiser</button>
        <button className="cible" type="button" onClick={() => montrerTousLesCadeaux(true)}>
          Voir toutes les récompenses
        </button>
      </div>
      <p role="status">{message}</p>
      {tousLesCadeaux && <p>Exemples de cadeaux : touchez chaque carte pour la voir en grand.</p>}
      <CascadeRecompense gain={tousLesCadeaux ? avecTousLesCadeaux(gain) : gain} />
      <p><a className="cible" href={import.meta.env.BASE_URL}>Retour au jeu</a></p>
    </main>
  );
}
