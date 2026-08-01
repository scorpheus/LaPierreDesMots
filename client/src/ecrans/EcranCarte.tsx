// Carte minimale — un seul nœud jouable (décision D1, contrat technique v1 § 1.4).
//
// Ce n'est PAS la carte au trésor de la v2 § 9.4 : c'est son emplacement, tenu par un unique
// nœud. La vraie carte arrive au lot L1. Ce qui est déjà vrai ici et ne changera pas :
//   — le nœud porte ses étoiles acquises, en creux quand elles manquent (v2 § 6.2) ;
//   — un acquis n'est jamais repris : la progression vient du serveur, qui prend le maximum ;
//   — un tap suffit pour entrer.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IdNoeud } from '@pierre/partage';
import { lirePaquetNoeud, lireProgression } from '../api/client.js';
import { Etoiles } from '../composants/Etoiles.js';
import { useEtatJeu, useMagasin } from '../etat/services.js';

/** Le seul nœud de la v1 (contrat § 9.6). Une constante nommée, pas un littéral égaré. */
export const NOEUD_V1 = 'clairiere-01' as unknown as IdNoeud;

/** Lit les étoiles d'un nœud dans la projection de progression, sans supposer ses noms. */
function etoilesDuNoeud(progression: readonly unknown[] | undefined, noeud: string): number {
  if (progression === undefined) {
    return 0;
  }
  for (const entree of progression) {
    if (typeof entree !== 'object' || entree === null) {
      continue;
    }
    const champs = entree as Record<string, unknown>;
    const identifiant = champs['noeudId'] ?? champs['noeud'] ?? champs['noeud_id'];
    if (String(identifiant) === noeud) {
      const etoiles = champs['etoiles'];
      return typeof etoiles === 'number' ? etoiles : 0;
    }
  }
  return 0;
}

export function EcranCarte(): ReactElement {
  const magasin = useMagasin();
  const profil = useEtatJeu((etat) => etat.profil);

  const progression = useQuery({
    queryKey: ['progression', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Progression demandée sans profil choisi.');
      }
      return lireProgression(profil.id);
    },
    enabled: profil !== null
  });

  const paquet = useQuery({
    queryKey: ['noeud', String(NOEUD_V1)],
    queryFn: () => lirePaquetNoeud(NOEUD_V1)
  });

  const entrer = useCallback((): void => {
    if (paquet.data === undefined) {
      return;
    }
    magasin.getState().demarrerNoeud(paquet.data);
  }, [magasin, paquet.data]);

  const acquises = etoilesDuNoeud(progression.data, String(NOEUD_V1));
  const titre = paquet.data?.exercice.titre ?? 'La cour de l’école';
  const pret = paquet.data !== undefined;

  return (
    <main
      data-ecran="carte"
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        alignItems: 'flex-start'
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <h1 className="titre" style={{ fontSize: '2.5rem', margin: 0 }}>
          La Clairière
        </h1>
        <button
          type="button"
          className="cible"
          onClick={() => magasin.getState().quitterProfil()}
          aria-label="Changer de joueur"
        >
          Changer de joueur
        </button>
      </header>

      {profil === null ? null : (
        <p style={{ margin: 0, fontSize: '1.25rem' }}>
          Bonjour {String(profil.prenom)}&nbsp;! Le monde t’attend en gris.
        </p>
      )}

      <button
        type="button"
        className="cible cible-appel noeud-carte"
        onClick={entrer}
        disabled={!pret}
        aria-label={`Jouer : ${titre}`}
        style={{
          flexDirection: 'column',
          gap: '1rem',
          padding: '2rem',
          inlineSize: 'min(28rem, 100%)'
        }}
      >
        <span className="titre" style={{ fontSize: '1.75rem' }}>
          {titre}
        </span>
        <Etoiles acquises={acquises} taille={48} />
        <span style={{ fontSize: '1.125rem' }}>
          {pret ? 'Tape pour entrer' : 'On prépare le décor…'}
        </span>
      </button>

      {paquet.isError ? (
        <div className="zone-lecture" style={{ padding: '1rem' }}>
          <p>Le décor n’arrive pas. Demande à un adulte de vérifier la Pierre.</p>
          <button type="button" className="cible" onClick={() => void paquet.refetch()}>
            Réessayer
          </button>
        </div>
      ) : null}
    </main>
  );
}
