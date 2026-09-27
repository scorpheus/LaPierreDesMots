import { useRef, useState, type ReactElement } from 'react';
import type { EtatManipulationMaths, GesteMaths, InstanceJardin } from '@pierre/partage/mathematiques';
import './ateliers-jardin.css';
import { DisqueDeParts } from './PartsEgales.js';

export interface ProprietesAtelierJardin {
  readonly instance: InstanceJardin;
  readonly etat: EtatManipulationMaths;
  readonly attente: boolean;
  readonly surGeste: (geste: GesteMaths) => void;
}
const nombre = (etat: EtatManipulationMaths, cle: string): number => {
  const n = etat.objets[cle]; return typeof n === 'number' && Number.isSafeInteger(n) ? n : 0;
};
const placer = (objetId: string): GesteMaths => ({ type: 'placer', objetId, position: 0 });
const retirer = (objetId: string): GesteMaths => ({ type: 'retirer', objetId });

function GroupeDeDix({ unite }: { readonly unite: string }): ReactElement {
  return <span className="jardin-dix" aria-label={`Dix ${unite}s`}>
    {Array.from({ length: 10 }, (_, index) => <i key={index} aria-hidden="true">●</i>)}
  </span>;
}

function PictogrammeGroupe({ valeur, unite }: { readonly valeur: 1 | 10 | 100;
  readonly unite: string }): ReactElement {
  return <span className="jardin-pictogramme" role="img" aria-label={`${valeur} ${unite}${valeur > 1 ? 's' : ''}`}>
    {valeur === 1 ? <i aria-hidden="true">●</i> : valeur === 10 ?
      <GroupeDeDix unite={unite} /> :
      <span className="jardin-cent" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <GroupeDeDix key={index} unite={unite} />)}
      </span>}
  </span>;
}

function BarreRecolte({ categorie, quantite, attente, surGeste }: {
  readonly categorie: string; readonly quantite: number; readonly attente: boolean;
  readonly surGeste: (geste: GesteMaths) => void;
}): ReactElement {
  const [brouillon, fixerBrouillon] = useState(quantite);
  const dernierEnvoi = useRef<number | null>(null);
  const valider = (): void => {
    if (!attente && brouillon !== quantite && dernierEnvoi.current !== brouillon) {
      dernierEnvoi.current = brouillon;
      surGeste({ type: 'placer', objetId: `barre:${categorie}`, position: brouillon, destination: 'valeur' });
    }
  };
  return <div className="jardin-barre-controle">
    <div className="jardin-barre" role="img" aria-label={`Barre ${categorie} : ${quantite} cases sur 20`}>
      {Array.from({ length: 20 }, (_, index) => <span key={index}
        className={index < brouillon ? 'jardin-barre-case jardin-barre-case-pleine' : 'jardin-barre-case'} />)}
    </div>
    <div className="jardin-barre-reperes" aria-hidden="true"><span>0</span><span>5</span><span>10</span><span>15</span><span>20</span></div>
    <label className="jardin-echelle">
      Choisis la hauteur de 0 à 20 : <output>{brouillon}</output>
      <input type="range" min={0} max={20} step={1} disabled={attente}
        aria-label={`Choisir hauteur barre ${categorie}`}
        value={brouillon}
        onChange={(evenement) => {
          dernierEnvoi.current = null;
          fixerBrouillon(Number(evenement.currentTarget.value));
        }}
        onPointerUp={valider} onKeyUp={valider} onBlur={valider} />
    </label>
  </div>;
}

export function AteliersJardin({ instance, etat, attente, surGeste }: ProprietesAtelierJardin): ReactElement {
  if (instance.famille === 'MAT-JAR-01') {
    const fruits = instance.parametres.uniteObjet === 'fruit';
    const ressources = [
      { id: 'unite', cle: 'unites', nom: fruits ? 'fruit' : 'graine', pluriel: fruits ? 'fruits' : 'graines', valeur: 1, stock: instance.parametres.stock.unites },
      { id: 'dizaine', cle: 'dizaines', nom: fruits ? 'caisse de dix fruits' : 'botte de dix', pluriel: fruits ? 'caisses de dix fruits' : 'bottes de dix', valeur: 10, stock: instance.parametres.stock.dizaines },
      { id: 'centaine', cle: 'centaines', nom: fruits ? 'réserve de cent fruits' : 'sac de cent', pluriel: fruits ? 'réserves de cent fruits' : 'sacs de cent', valeur: 100, stock: instance.parametres.stock.centaines },
    ] as const;
    const total = ressources.reduce((s, r) => s + nombre(etat, r.cle) * r.valeur, 0);
    return <section className="jardin-atelier" aria-label={fruits ? 'Plateau des fruits' : 'Plateau des graines'}>
      <h2>{fruits ? 'Plateau des fruits' : 'Plateau des graines'}</h2>
      <p>{fruits ? 'Range les fruits dans les caisses de dix.' : 'Pose des graines, regroupe-les ou défais ton dernier geste.'}</p>
      <div className="jardin-plateau" aria-live="polite">
        <strong>Sur le plateau : {total} {fruits ? 'fruits' : 'graines'}</strong>
        <div className="jardin-groupes">{ressources.map((r) =>
          <div className="jardin-groupe" key={r.id}>
            <PictogrammeGroupe valeur={r.valeur} unite={fruits ? 'fruit' : 'graine'} />
            <span>{nombre(etat, r.cle)} {nombre(etat, r.cle) > 1 ? r.pluriel : r.nom}</span>
            {r.valeur === 10 && nombre(etat, r.cle) > 0 && <div className="jardin-caisses"
              aria-label={`${nombre(etat, r.cle)} ${fruits ? 'caisses de dix fruits' : 'bottes de dix graines'}`}>
              {Array.from({ length: nombre(etat, r.cle) }, (_, index) => <span className="jardin-caisse" key={index}
                aria-label={fruits ? 'Une caisse contient dix fruits' : 'Une botte contient dix graines'}>
                {Array.from({ length: 10 }, (_, fruit) => <i key={fruit} aria-hidden="true">●</i>)}
              </span>)}
            </div>}
            <small>Stock : {r.stock - nombre(etat, r.cle)}</small>
            <div className="jardin-actions">
              <button type="button" disabled={attente || nombre(etat, r.cle) >= r.stock}
                onClick={() => surGeste(placer(r.id))} aria-label={`Ajouter ${r.nom}`}>Ajouter</button>
              <button type="button" disabled={attente || nombre(etat, r.cle) === 0}
                onClick={() => surGeste(retirer(r.id))} aria-label={`Retirer ${r.nom}`}>Retirer</button>
            </div>
          </div>)}</div>
      </div>
      {(instance.niveau !== 'decouverte' || fruits) && <div className="jardin-actions jardin-echanges">
        <button type="button" disabled={attente || nombre(etat, 'unites') < 10}
          onClick={() => surGeste({ type: 'choisir', objetId: 'echanger-unites' })}>
          {fruits ? 'Échanger 10 fruits contre une caisse' : 'Échanger 10 graines contre une botte'}</button>
        <button type="button" disabled={attente || nombre(etat, 'dizaines') < 10}
          onClick={() => surGeste({ type: 'choisir', objetId: 'echanger-dizaines' })}>
          {fruits ? 'Échanger 10 caisses contre une réserve' : 'Échanger 10 bottes contre un sac'}</button>
        <button type="button" disabled={attente || nombre(etat, 'dizaines') === 0 ||
          nombre(etat, 'unites') + 10 > instance.parametres.stock.unites}
          onClick={() => surGeste({ type: 'choisir', objetId: 'defaire-dizaine' })}>
          {fruits ? 'Défaire une caisse en 10 fruits' : 'Défaire une botte en 10 graines'}</button>
        <button type="button" disabled={attente || nombre(etat, 'centaines') === 0 ||
          nombre(etat, 'dizaines') + 10 > instance.parametres.stock.dizaines}
          onClick={() => surGeste({ type: 'choisir', objetId: 'defaire-centaine' })}>
          {fruits ? 'Défaire une réserve en 10 caisses' : 'Défaire un sac en 10 bottes'}</button>
      </div>}
      {instance.parametres.decompositionsRequises === 2 && <div className="jardin-groupe">
        <p>Première façon {typeof etat.objets.premiere === 'string' ? 'gardée. Construis une autre façon.' : 'à garder avant de changer les groupes.'}</p>
        <button type="button" disabled={attente || typeof etat.objets.premiere === 'string' || total !== instance.parametres.cible ||
          (instance.parametres.caissesRequises !== null && nombre(etat, 'dizaines') === instance.parametres.caissesRequises &&
            nombre(etat, 'centaines') === 0 && nombre(etat, 'unites') === 0)}
          onClick={() => surGeste({ type: 'choisir', objetId: 'garder-decomposition' })}>Garder cette façon</button>
      </div>}
      <button className="jardin-annuler" type="button" disabled={attente || etat.historique.length === 0}
        onClick={() => surGeste({ type: 'annuler' })}>Annuler mon geste</button>
    </section>;
  }
  if (instance.famille === 'MAT-JAR-02') {
    const p = instance.parametres;
    const partitions = [
      { id: 'part-a', cle: 'partsA', nom: 'Première plate-bande', denominateur: p.denominateur },
      ...(p.denominateurAlternative === null ? [] :
        [{ id: 'part-b', cle: 'partsB', nom: 'Même tout, autre découpage', denominateur: p.denominateurAlternative }]),
    ];
    return <section className="jardin-atelier" aria-label="Plate-bande à partager">
      <h2>Partager la plate-bande</h2>
      <p>Chaque case d’un même dessin a la même taille. Ajoute ou retire des parts.</p>
      {partitions.map((partition) => <fieldset className="jardin-groupe" key={partition.id}>
        <legend>{partition.nom}</legend>
        <div className={p.representation === 'disque' ? undefined : 'jardin-parts'} role="img" aria-label={`${nombre(etat, partition.cle)} parts couvertes sur ${partition.denominateur}`}>
          {p.representation === 'disque' ? <DisqueDeParts total={partition.denominateur} couvertes={nombre(etat, partition.cle)} couleur="#90b96f" /> : Array.from({ length: partition.denominateur }, (_, index) =>
            <span key={index} className={index < nombre(etat, partition.cle) ? 'jardin-part jardin-part-pleine' : 'jardin-part'} />)}
        </div>
        <output>{nombre(etat, partition.cle)} sur {partition.denominateur}</output>
        <div className="jardin-actions">
          <button type="button" disabled={attente || nombre(etat, partition.cle) >= partition.denominateur}
            onClick={() => surGeste(placer(partition.id))} aria-label={`Couvrir une part de ${partition.nom}`}>Couvrir une part</button>
          <button type="button" disabled={attente || nombre(etat, partition.cle) === 0}
            onClick={() => surGeste(retirer(partition.id))} aria-label={`Retirer une part de ${partition.nom}`}>Retirer une part</button>
        </div>
      </fieldset>)}
      <button className="jardin-annuler" type="button" disabled={attente || etat.historique.length === 0}
        onClick={() => surGeste({ type: 'annuler' })}>Annuler mon geste</button>
    </section>;
  }
  const categories = instance.parametres.categories;
  const unite = instance.parametres.fruitsParUnite === 1 ? 'fruit' : 'caisse de dix fruits';
  const unites = instance.parametres.fruitsParUnite === 1 ? 'fruits' : 'caisses de dix fruits';
  return <section className="jardin-atelier" aria-label="Carnet des récoltes">
    <h2>Carnet des récoltes</h2>
    <p>Observe les paniers. Marque une case du tableau et une graduation de la barre pour chaque {unite}.</p>
    {categories.map((categorie) => <fieldset className="jardin-groupe" key={categorie.id}>
      <legend>{categorie.id}</legend>
      <div className="jardin-inventaire">
        <div><strong>Panier : {nombre(etat, `panier:${categorie.id}`)} {nombre(etat, `panier:${categorie.id}`) > 1 ? unites : unite}</strong>
          <div className="jardin-jetons" aria-hidden="true">{Array.from({ length: nombre(etat, `panier:${categorie.id}`) }, (_, index) => <span key={index}>●</span>)}</div></div>
        {(['table', 'barre'] as const).map((colonne) => <div key={colonne}>
          <strong>{colonne === 'table' ? 'Tableau' : 'Barre'} : {nombre(etat, `${colonne}:${categorie.id}`)}</strong>
          {colonne === 'table' ? <div className="jardin-tableau" role="group"
            aria-label={`Cases du tableau ${categorie.id}`}>
            {Array.from({ length: 20 }, (_, index) => {
              const valeur = index + 1;
              const marque = index < nombre(etat, `table:${categorie.id}`);
              return <button key={valeur} type="button" className={marque ? 'jardin-case jardin-case-marquee' : 'jardin-case'}
                disabled={attente} aria-pressed={marque} aria-label={`Case ${valeur} du tableau ${categorie.id}`}
                onClick={() => surGeste({ type: 'placer', objetId: `table:${categorie.id}`,
                  position: marque ? index : valeur, destination: 'valeur' })}>{valeur}</button>;
            })}
          </div> : <BarreRecolte key={`${categorie.id}:${nombre(etat, `barre:${categorie.id}`)}`}
            categorie={categorie.id} quantite={nombre(etat, `barre:${categorie.id}`)}
            attente={attente} surGeste={surGeste} />}
          <div className="jardin-actions">
            <button type="button" disabled={attente || nombre(etat, `${colonne}:${categorie.id}`) >= nombre(etat, `panier:${categorie.id}`)}
              onClick={() => surGeste(placer(`${colonne}:${categorie.id}`))}
              aria-label={`Ajouter une unité ${colonne} ${categorie.id}`}>+ 1</button>
            <button type="button" disabled={attente || nombre(etat, `${colonne}:${categorie.id}`) === 0}
              onClick={() => surGeste(retirer(`${colonne}:${categorie.id}`))}
              aria-label={`Retirer une unité ${colonne} ${categorie.id}`}>− 1</button>
          </div>
        </div>)}</div>
      {instance.parametres.transfertRequis && <div className="jardin-transferts">
        <p>Déplacer {instance.parametres.fruitsParUnite === 1 ? 'un fruit' : 'une caisse de dix fruits'} de ce panier :</p>
        {categories.filter((autre) => autre.id !== categorie.id).map((autre) =>
          <button type="button" key={autre.id} disabled={attente || nombre(etat, `panier:${categorie.id}`) === 0}
            onClick={() => surGeste({ type: 'placer', objetId: `fruit:${categorie.id}`, position: 0, destination: autre.id })}>
            Vers {autre.id}
          </button>)}
      </div>}
      {instance.parametres.lectureRequise && <button type="button" disabled={attente}
        aria-pressed={etat.objets.lecture === categorie.id}
        onClick={() => surGeste({ type: 'choisir', objetId: `lecture:${categorie.id}` })}>
        Choisir {categorie.id} comme panier le plus rempli
      </button>}
    </fieldset>)}
    <button className="jardin-annuler" type="button" disabled={attente || etat.historique.length === 0}
      onClick={() => surGeste({ type: 'annuler' })}>Annuler mon geste</button>
  </section>;
}
