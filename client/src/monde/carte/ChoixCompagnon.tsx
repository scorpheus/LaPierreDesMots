import type { ReactElement } from 'react';
import type { CodeCompagnon, CodeStadeGobi, Compagnon } from '@pierre/partage';
import { urlAsset } from '../../api/client.js';
import { assetDeStadeGobi } from '../../composants/Gobi.js';
import { SpriteCompagnon } from '../../composants/SpriteCompagnon.js';

export interface ProprietesChoixCompagnon {
  readonly destination: string;
  readonly codeDestination: string;
  readonly stadeGobi: CodeStadeGobi;
  readonly compagnons: readonly Compagnon[];
  readonly choisi: CodeCompagnon | null;
  readonly enChargement: boolean;
  readonly animationsDesactivees: boolean;
  readonly surChoisir: (compagnon: CodeCompagnon | null) => void;
  readonly surRetour: () => void;
  readonly surPartir: () => void;
}

export function ChoixCompagnon({ destination, codeDestination, stadeGobi, compagnons, choisi, enChargement, animationsDesactivees, surChoisir, surRetour, surPartir }: ProprietesChoixCompagnon): ReactElement {
  return <section className="choix-compagnon" data-choix-compagnon={codeDestination} role="dialog" aria-modal="true" aria-labelledby="titre-choix-compagnon">
    <div className="choix-compagnon__carte">
      <button type="button" className="cible choix-compagnon__fermer" aria-label="Fermer le choix d’accompagnant" onClick={surRetour}>Retour</button>
      <div className="choix-compagnon__entete"><p className="choix-compagnon__destination">Départ pour {destination}</p><h2 id="titre-choix-compagnon" className="titre">Avec qui pars-tu ?</h2><p>Choisis ton compagnon. Il donnera sa couleur à cette sortie.</p></div>
      <div className="choix-compagnon__liste">
        <button type="button" className="cible choix-compagnon__tuile" data-choisir-compagnon="gobi" data-selectionne={choisi === null ? 'oui' : 'non'} aria-pressed={choisi === null} onClick={() => surChoisir(null)}><span className="choix-compagnon__portrait" aria-hidden="true"><img src={urlAsset(assetDeStadeGobi(stadeGobi))} alt="" draggable={false} /></span><strong>Gobi</strong><span>Ton guide fidèle</span></button>
        {compagnons.map((compagnon) => <button key={String(compagnon.code)} type="button" className="cible choix-compagnon__tuile" data-choisir-compagnon={String(compagnon.code)} data-selectionne={choisi === compagnon.code ? 'oui' : 'non'} data-animation-compagnon={animationsDesactivees ? 'calme' : String(compagnon.code)} aria-pressed={choisi === compagnon.code} onClick={() => surChoisir(compagnon.code)}><span className="choix-compagnon__portrait" aria-hidden="true"><SpriteCompagnon code={compagnon.code} assetStatique={String(compagnon.asset)} /></span><strong>{compagnon.libelle}</strong><span>{compagnon.valeur}</span></button>)}
      </div>
      <button type="button" className="cible cible-appel choix-compagnon__partir" data-confirmer-depart disabled={enChargement} onClick={surPartir}>{enChargement ? 'On prépare les sacs…' : 'Partir à l’aventure'}</button>
    </div>
  </section>;
}
