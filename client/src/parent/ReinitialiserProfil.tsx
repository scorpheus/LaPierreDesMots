// La remise à zéro d'un profil, depuis la zone parent — lot H2, points 1 et 2.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// TROIS PORTES, ET AUCUNE N'EST DÉCORATIVE
//
// « C'est une action irréversible sur les données d'un enfant, elle ne doit jamais se
// déclencher par un tap distrait. » Le geste se fait donc en trois temps, et chacun apporte
// une information que le précédent n'avait pas :
//
//   1. **choisir la portée** — l'écran dit ce que chacune perd ET ce qu'elle garde ;
//   2. **lire ce qui sera effacé, chiffré** — l'aperçu vient du serveur, table par table, sur
//      les données réelles de cet enfant. Un avertissement qui ne chiffre rien ne se lit plus
//      au troisième passage ;
//   3. **retaper le prénom de l'enfant** — la garde qui NOMME le profil. Un tap ne produit
//      pas un prénom, et retaper « Ezékiel » oblige à avoir lu de quel enfant il s'agit.
//
// Le bouton reste **désactivé** tant que le prénom n'est pas juste, et le serveur le vérifie
// de son côté : une garde qui n'existerait qu'en React ne garderait rien, puisque
// `npm run profil:reinitialiser` passe par la même route et la même vérification.
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// **Aucune couleur d'échec**, ici non plus. Ce n'est pas un écran de danger : c'est un écran
// de décision. Il énonce une perte parce qu'un adulte doit la peser — c'est le seul endroit du
// dépôt où D35 (« le jeu ne dit jamais ce qui manque ») ne s'applique pas, et
// `partage/src/parent/reinitialisation.ts` le dit dans le commentaire de `pertesDeLaPortee`.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { IdProfil } from '@pierre/partage';
import type { PorteeReinitialisation, RapportReinitialisation } from '@pierre/partage/parent';
import {
  confirmationValide,
  conservesParLaPortee,
  libellePortee,
  pertesDeLaPortee
} from '@pierre/partage/parent';

import { apercuReinitialisationProfil, reinitialiserProfilParent } from '../api/client.js';

export interface ProprietesReinitialiserProfil {
  readonly profil: IdProfil;
  readonly prenom: string;
  /** Appelé après une remise à zéro réussie — l'hôte rafraîchit l'état affiché. */
  readonly surTermine?: (rapport: RapportReinitialisation) => void;
}

const PORTEES: readonly PorteeReinitialisation[] = ['progression', 'complete'];

export function ReinitialiserProfil({
  profil,
  prenom,
  surTermine
}: ProprietesReinitialiserProfil): ReactElement {
  const clientRequetes = useQueryClient();
  const [portee, fixerPortee] = useState<PorteeReinitialisation>('progression');
  const [saisie, fixerSaisie] = useState('');
  const [rapport, fixerRapport] = useState<RapportReinitialisation | null>(null);

  // L'aperçu se redemande à chaque changement de portée : les deux portées n'effacent pas le
  // même nombre de lignes, et afficher le compte de l'une sous le nom de l'autre serait pire
  // que de n'en afficher aucun.
  const apercu = useQuery({
    queryKey: ['parent', 'reinitialiser', 'apercu', String(profil), portee],
    queryFn: () => apercuReinitialisationProfil(profil, portee)
  });

  const remise = useMutation({
    mutationFn: () => reinitialiserProfilParent(profil, portee, saisie),
    onSuccess: (resultat) => {
      fixerRapport(resultat);
      fixerSaisie('');
      // Tout ce que la zone parent affiche de ce profil vient de changer.
      void clientRequetes.invalidateQueries({ queryKey: ['parent'] });
      surTermine?.(resultat);
    }
  });

  const prete = confirmationValide(prenom, saisie);
  const lancer = useCallback((): void => {
    if (prete) {
      remise.mutate();
    }
  }, [prete, remise]);

  const lignesNonVides = (apercu.data?.lignes ?? []).filter((ligne) => ligne.lignesEffacees > 0);
  const total = lignesNonVides.reduce((somme, ligne) => somme + ligne.lignesEffacees, 0);

  return (
    <section
      data-parent="reinitialiser-profil"
      style={{
        display: 'grid',
        gap: '1rem',
        padding: '1.25rem',
        border: '3px solid var(--grisaille)',
        borderRadius: '1rem'
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Repartir à zéro</h3>

      {rapport === null ? null : (
        <p data-parent="reinitialisation-faite" className="zone-lecture" style={{ margin: 0, padding: '0.75rem 1rem', borderRadius: '0.75rem' }}>
          C’est fait : {String(rapport.lignesEffaceesTotal)} enregistrements effacés pour{' '}
          {rapport.prenom}. {libellePortee(rapport.portee)}.
          {rapport.tablesConservees.length > 0
            ? ' Les réglages de lecture ont été gardés.'
            : ''}
        </p>
      )}

      {/* ── 1. la portée ── */}
      <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
        <legend style={{ padding: 0, fontWeight: 600 }}>Qu’est-ce qu’on remet à zéro ?</legend>
        {PORTEES.map((code) => (
          <label
            key={code}
            data-portee={code}
            data-portee-choisie={portee === code ? 'oui' : 'non'}
            style={{
              display: 'grid',
              gap: '0.375rem',
              padding: '0.75rem 1rem',
              minBlockSize: '4rem',
              border: portee === code ? '3px solid var(--accent)' : '2px solid var(--grisaille)',
              borderRadius: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <input
                type="radio"
                name="portee-reinitialisation"
                value={code}
                checked={portee === code}
                onChange={() => {
                  fixerPortee(code);
                  // La confirmation ne survit pas au changement de portée : un prénom tapé
                  // pour « garder les réglages » ne doit pas valider « tout effacer ».
                  fixerSaisie('');
                }}
                // R16 — « cibles ≥ 64 px, aucune coordination fine exigée ». Ce bouton radio
                // prenait sa taille par défaut du navigateur et mesurait 13×13 px, mesuré par
                // l'audit QA : `input «  » mesure 13×13 px, minimum 64 px (R16)`.
                //
                // Le `label` porte bien `minBlockSize: 4rem`, mais c'est le BOUTON qu'on vise
                // du doigt, pas son étiquette — `ReglagesParent.tsx` avait déjà payé
                // exactement cette confusion sur ses deux cases à cocher, et sa correction est
                // reprise ici telle quelle. `--cible-min` vaut 64 px (styles/global.css:114).
                style={{ inlineSize: 'var(--cible-min)', blockSize: 'var(--cible-min)' }}
              />
              {libellePortee(code)}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--texte-secondaire)' }}>
              On garde : {conservesParLaPortee(code).join(', ')}.
            </span>
          </label>
        ))}
      </fieldset>

      {/* ── 2. ce qui sera perdu, chiffré ── */}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Ce que {prenom} va perdre :</p>
        <ul style={{ margin: 0, paddingInlineStart: '1.25rem', display: 'grid', gap: '0.125rem' }}>
          {pertesDeLaPortee(portee).map((perte) => (
            <li key={perte}>{perte}</li>
          ))}
        </ul>

        {apercu.isPending ? <p style={{ margin: 0 }}>On compte ce qui sera effacé…</p> : null}
        {apercu.isError ? (
          <p style={{ margin: 0 }}>
            Impossible de compter ce qui serait effacé. Vérifie que la Pierre tourne — tant que
            ce compte manque, rien ne sera effacé.
          </p>
        ) : null}
        {apercu.data === undefined ? null : (
          <p data-apercu-total={String(total)} style={{ margin: 0 }}>
            {total === 0
              ? 'Ce profil n’a encore rien enregistré : il n’y a rien à effacer.'
              : `${String(total)} enregistrements seront effacés, dans ${String(lignesNonVides.length)} tables.`}
          </p>
        )}
      </div>

      {/* ── 3. la confirmation qui nomme le profil ── */}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <label htmlFor="confirmation-prenom" style={{ fontWeight: 600 }}>
          Pour confirmer, retape le prénom de l’enfant : {prenom}
        </label>
        <input
          id="confirmation-prenom"
          data-champ="confirmation-prenom"
          type="text"
          autoComplete="off"
          value={saisie}
          onChange={(evenement) => fixerSaisie(evenement.target.value)}
          style={{
            minBlockSize: '4rem',
            fontSize: '1.25rem',
            padding: '0 1rem',
            border: '2px solid var(--grisaille)',
            borderRadius: '0.75rem'
          }}
        />
        <button
          type="button"
          className="cible"
          data-action="reinitialiser"
          disabled={!prete || remise.isPending}
          aria-disabled={!prete || remise.isPending}
          onClick={lancer}
          style={{ minBlockSize: '4rem' }}
        >
          {remise.isPending ? 'On efface…' : `Effacer — ${libellePortee(portee).toLowerCase()}`}
        </button>
        {prete ? null : (
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--texte-secondaire)' }}>
            Le bouton s’active quand le prénom correspond. Les accents et les majuscules n’ont
            pas d’importance.
          </p>
        )}
        {remise.isError ? (
          <p data-erreur="reinitialisation" style={{ margin: 0 }}>
            La remise à zéro n’a pas eu lieu, et rien n’a été effacé. Réessaie dans un moment.
          </p>
        ) : null}
      </div>
    </section>
  );
}
