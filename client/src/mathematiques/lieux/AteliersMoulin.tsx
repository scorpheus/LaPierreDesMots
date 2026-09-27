import type { ReactElement } from 'react';
import type { EtatManipulationMaths, GesteMaths, InstanceMoulin } from '@pierre/partage/mathematiques';
import './ateliers-moulin.css';
import { DisqueDeParts } from './PartsEgales.js';

export interface ProprietesAtelierMoulin {
  readonly instance: InstanceMoulin;
  readonly etat: EtatManipulationMaths;
  readonly attente: boolean;
  readonly surGeste: (geste: GesteMaths) => void;
}
const nombre = (etat: EtatManipulationMaths, cle: string): number => {
  const n = etat.objets[cle]; return typeof n === 'number' && Number.isSafeInteger(n) ? n : 0;
};
const poser = (objetId: string): GesteMaths => ({ type: 'placer', objetId, position: 0 });
const retirer = (objetId: string): GesteMaths => ({ type: 'retirer', objetId });

function MesuresMoulin({ quantite, nom }: { readonly quantite: number; readonly nom: string }): ReactElement {
  return <div className="moulin-mesures" role="img" aria-label={`${nom} : ${quantite} mesure${quantite === 1 ? '' : 's'}`}>
    {quantite === 0 ? <span className="moulin-vide">{nom === 'Stock' ? 'Réserve vide' : 'Sac vide'}</span> :
      Array.from({ length: Math.ceil(quantite / 10) }, (_, dizaine) =>
        <span className="moulin-dizaine" key={dizaine} aria-hidden="true">
          {Array.from({ length: Math.min(10, quantite - dizaine * 10) }, (_, mesure) =>
            <i className="moulin-mesure" key={mesure} />)}
        </span>)}
  </div>;
}

export function AteliersMoulin({ instance, etat, attente, surGeste }: ProprietesAtelierMoulin): ReactElement {
  if (instance.famille === 'MAT-MOU-01') {
    const montages = [
      { cote: 'a', nom: 'Premier montage', maximum: instance.parametres.premier.roues,
        palesMax: instance.parametres.premier.pales },
      ...(!instance.parametres.secondRequis ? [] :
        [{ cote: 'b', nom: 'Autre montage', maximum: 6, palesMax: 8 }]),
    ];
    return <section className="moulin-atelier" aria-label="Roues du moulin">
      <h2>Monter les roues</h2>
      <p>Pose les roues, puis ajoute une pale à la fois sur chaque roue.</p>
      {montages.map((m) => <fieldset className="moulin-groupe" key={m.cote}>
        <legend>{m.nom}</legend>
        <div className="moulin-actions">
          <button type="button" disabled={attente || nombre(etat, `roues:${m.cote}`) >= m.maximum}
            onClick={() => surGeste({ type: 'choisir', objetId: `roue:${m.cote}` })}
            aria-label={`Ajouter une roue, ${m.nom}`}>Ajouter une roue</button>
          <button type="button" disabled={attente || nombre(etat, `roues:${m.cote}`) === 0}
            onClick={() => surGeste(retirer(`roue:${m.cote}`))}
            aria-label={`Retirer la dernière roue, ${m.nom}`}>Retirer une roue</button>
        </div>
        <div className="moulin-roues">{Array.from({ length: nombre(etat, `roues:${m.cote}`) }, (_, index) => {
          const cle = `pale:${m.cote}:${index}`;
          const pales = nombre(etat, cle);
          return <div className="moulin-roue" key={index}>
            <strong>Roue {index + 1} · {pales} pales</strong>
            <div className="moulin-pales" aria-hidden="true">{Array.from({ length: pales }, (_, n) => <span key={n}>◆</span>)}</div>
            <div className="moulin-actions">
              <button type="button" disabled={attente || pales >= m.palesMax}
                onClick={() => surGeste(poser(cle))} aria-label={`Ajouter une pale, ${m.nom}, roue ${index + 1}`}>+ pale</button>
              <button type="button" disabled={attente || pales === 0}
                onClick={() => surGeste(retirer(cle))} aria-label={`Retirer une pale, ${m.nom}, roue ${index + 1}`}>− pale</button>
            </div>
          </div>;
        })}</div>
        {nombre(etat, `roues:${m.cote}`) > 0 && <p className="moulin-addition">
          Addition des roues : {Array.from({ length: nombre(etat, `roues:${m.cote}`) },
            (_, index) => nombre(etat, `pale:${m.cote}:${index}`)).join(' + ')}
        </p>}
      </fieldset>)}
      <button type="button" disabled={attente || etat.historique.length === 0}
        onClick={() => surGeste({ type: 'annuler' })}>Annuler mon geste</button>
    </section>;
  }
  if (instance.famille === 'MAT-MOU-02') {
    const p = instance.parametres;
    const repartitions = [
      { cote: 'a', nom: 'Première distribution', sacs: p.sacs },
      ...(p.autreNombreDeSacs === null ? [] :
        [{ cote: 'b', nom: 'Autre distribution du même stock', sacs: p.autreNombreDeSacs }]),
    ];
    return <section className="moulin-atelier" aria-label="Sacs de farine">
      <h2>Remplir les sacs</h2>
      <p>Verse une mesure à la fois. Une mesure reprise retourne au stock.</p>
      {repartitions.map((repartition) => <fieldset className="moulin-groupe" key={repartition.cote}>
        <legend>{repartition.nom}</legend>
        <div className="moulin-reserve">
          <p aria-live="polite">Stock : {nombre(etat, `stock:${repartition.cote}`)} mesure{nombre(etat, `stock:${repartition.cote}`) === 1 ? '' : 's'}</p>
          <MesuresMoulin quantite={nombre(etat, `stock:${repartition.cote}`)} nom="Stock" />
        </div>
        {p.nombreSacsInconnu && repartition.cote === 'a' && <div className="moulin-actions">
          <button type="button" disabled={attente || nombre(etat, 'nombreSacs:a') >= 6}
            onClick={() => surGeste({ type: 'choisir', objetId: 'ajouter-sac' })}>Ajouter un sac</button>
          <button type="button" disabled={attente || nombre(etat, 'nombreSacs:a') === 0 ||
            nombre(etat, `sac:a:${nombre(etat, 'nombreSacs:a') - 1}`) > 0}
            onClick={() => surGeste({ type: 'retirer', objetId: 'dernier-sac' })}>Retirer le dernier sac vide</button>
        </div>}
        <div className="moulin-sacs">{Array.from({ length: p.nombreSacsInconnu && repartition.cote === 'a'
          ? nombre(etat, 'nombreSacs:a') : repartition.sacs }, (_, index) => {
          const cle = `sac:${repartition.cote}:${index}`;
          return <div className="moulin-sac" key={index}>
            <strong>Sac {index + 1} : {nombre(etat, cle)} mesure{nombre(etat, cle) === 1 ? '' : 's'}</strong>
            <MesuresMoulin quantite={nombre(etat, cle)} nom={`Sac ${index + 1}`} />
            <div className="moulin-actions">
              <button type="button" disabled={attente || nombre(etat, `stock:${repartition.cote}`) === 0}
                onClick={() => surGeste(poser(cle))}
                aria-label={`Verser une mesure, ${repartition.nom}, sac ${index + 1}`}>Verser 1</button>
              <button type="button" disabled={attente || nombre(etat, cle) === 0}
                onClick={() => surGeste(retirer(cle))}
                aria-label={`Reprendre une mesure, ${repartition.nom}, sac ${index + 1}`}>Reprendre 1</button>
            </div>
          </div>;
        })}</div>
      </fieldset>)}
      <button type="button" disabled={attente || etat.historique.length === 0}
        onClick={() => surGeste({ type: 'annuler' })}>Annuler mon geste</button>
    </section>;
  }
  const p = instance.parametres;
  const reglages = [
    { cle: 'secteursA', id: 'secteur-a', nom: 'Premier réglage', denominateur: p.denominateur },
    ...(p.autreDenominateur === null ? [] :
      [{ cle: 'secteursB', id: 'secteur-b', nom: 'Même réservoir, autre découpage',
        denominateur: p.autreDenominateur }]),
  ];
  return <section className="moulin-atelier" aria-label="Vanne du réservoir">
    <h2>Régler la vanne</h2>
    <p>Chaque morceau représente une part égale du même réservoir.</p>
    {reglages.map((r) => <fieldset className="moulin-groupe" key={r.id}>
      <legend>{r.nom}</legend>
      <div className={p.representation === 'disque' ? undefined : 'moulin-reservoir'} role="img"
        aria-label={`${nombre(etat, r.cle)} parts ouvertes sur ${r.denominateur}`}>
        {p.representation === 'disque' ? <DisqueDeParts total={r.denominateur} couvertes={nombre(etat, r.cle)} couleur="#7ac6d8" /> : Array.from({ length: r.denominateur }, (_, index) =>
          <span key={index} className={index < nombre(etat, r.cle) ? 'moulin-secteur moulin-secteur-ouvert' : 'moulin-secteur'} />)}
      </div>
      <output>{nombre(etat, r.cle)} sur {r.denominateur}</output>
      <div className="moulin-actions">
        <button type="button" disabled={attente || nombre(etat, r.cle) >= r.denominateur}
          onClick={() => surGeste(poser(r.id))} aria-label={`Ouvrir une part, ${r.nom}`}>Ouvrir une part</button>
        <button type="button" disabled={attente || nombre(etat, r.cle) === 0}
          onClick={() => surGeste(retirer(r.id))} aria-label={`Fermer une part, ${r.nom}`}>Fermer une part</button>
      </div>
    </fieldset>)}
    <button type="button" disabled={attente || etat.historique.length === 0}
      onClick={() => surGeste({ type: 'annuler' })}>Annuler mon geste</button>
  </section>;
}
