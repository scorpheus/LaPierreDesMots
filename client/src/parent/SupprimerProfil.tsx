/**
 * SUPPRIMER UN COMPTE JOUEUR — R29, demandé par le père le 2026-08-03.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « tu as créé plein de comptes de joueurs qui s'appellent Mesure, déjà il faudrait les enlever.
 * Et dans l'espace des parents, il faudrait pouvoir les supprimer en fait, supprimer un compte. »
 *
 * Le besoin est né d'un dégât que j'ai causé : six profils « Mesure » écrits dans sa vraie base
 * par des sondes de mise en page qui pointaient sur le serveur de jeu. Sans écran de suppression,
 * il n'avait AUCUN moyen de nettoyer sans ouvrir SQLite — c'est-à-dire aucun moyen.
 *
 * ── POURQUOI CET ÉCRAN RESSEMBLE TANT À `ReinitialiserProfil` ─────────────────────────────────
 * Parce qu'il fait quelque chose de STRICTEMENT PLUS destructeur. La remise à zéro « complète »
 * laisse au moins l'enfant ; ici il ne reste rien. Lui donner moins de précautions qu'à sa
 * petite sœur aurait été absurde.
 *
 * Il en reprend donc les trois, et pas une de moins :
 *   1. **L'aperçu d'abord.** Le parent voit COMBIEN de lignes disparaissent avant de taper quoi
 *      que ce soit. Un écran qui demande de confirmer sans avoir montré l'ampleur ne demande pas
 *      un consentement, il demande un réflexe.
 *   2. **Le prénom retapé.** C'est la garde qui NOMME le compte. Elle est vérifiée au serveur
 *      aussi : une garde qui n'existerait qu'en React ne garderait rien.
 *   3. **Aucune valeur par défaut destructrice.** Le bouton naît désactivé, et rien ne
 *      présélectionne quoi que ce soit.
 *
 * ── LA SEULE DIFFÉRENCE ASSUMÉE ───────────────────────────────────────────────────────────────
 * **Pas de portée.** Supprimer n'a qu'un sens. Une case à cocher de plus sur un écran
 * destructeur est une occasion de plus de se tromper.
 */
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { confirmationValide } from '@pierre/partage/parent';
import type { IdProfil } from '@pierre/partage';
import type { RapportSuppressionProfil } from '@pierre/partage/parent';

import { apercuSuppressionProfil, supprimerProfilParent } from '../api/client.js';

export interface ProprietesSupprimerProfil {
  readonly profil: IdProfil;
  readonly prenom: string;
  /** Appelé après une suppression réussie — l'hôte quitte l'écran du profil disparu. */
  readonly surSupprime?: (rapport: RapportSuppressionProfil) => void;
}

export function SupprimerProfil({
  profil,
  prenom,
  surSupprime
}: ProprietesSupprimerProfil): ReactElement {
  const clientRequetes = useQueryClient();
  const [saisie, fixerSaisie] = useState('');
  const [deplie, fixerDeplie] = useState(false);

  const apercu = useQuery({
    queryKey: ['parent', 'supprimer', 'apercu', String(profil)],
    queryFn: () => apercuSuppressionProfil(profil),
    // On ne compte que si le parent a ouvert le volet : un aperçu chargé d'office ferait une
    // requête destructrice-en-apparence à chaque visite du dashboard.
    enabled: deplie
  });

  const suppression = useMutation({
    mutationFn: () => supprimerProfilParent(profil, saisie),
    onSuccess: (resultat) => {
      fixerSaisie('');
      void clientRequetes.invalidateQueries({ queryKey: ['parent'] });
      void clientRequetes.invalidateQueries({ queryKey: ['profils'] });
      surSupprime?.(resultat);
    }
  });

  const prete = confirmationValide(prenom, saisie);
  const lancer = useCallback((): void => {
    if (prete) {
      suppression.mutate();
    }
  }, [prete, suppression]);

  const total = (apercu.data?.lignes ?? []).reduce(
    (somme, ligne) => somme + ligne.lignesEffacees,
    0
  );

  return (
    <section
      data-parent="supprimer-profil"
      data-deplie={deplie ? 'oui' : 'non'}
      style={{
        display: 'grid',
        gap: '1rem',
        padding: '1.25rem',
        border: '3px solid var(--grisaille)',
        borderRadius: '1rem'
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Supprimer ce compte</h3>

      {deplie ? null : (
        // Replié par défaut. Ce n'est pas de la timidité : c'est le seul geste irréversible de
        // toute la zone parent, et il n'a rien à faire sous le doigt de quelqu'un qui venait
        // regarder une courbe.
        <>
          <p style={{ margin: 0 }}>
            Efface définitivement le compte de {prenom} et tout ce qu’il contient. Cette action
            ne peut pas être annulée.
          </p>
          <button
            type="button"
            className="cible"
            data-action="deplier-suppression"
            onClick={() => {
              fixerDeplie(true);
            }}
            style={{ minBlockSize: '4rem' }}
          >
            Voir ce qui serait supprimé
          </button>
        </>
      )}

      {deplie ? (
        <>
          {/* ── 1. l'ampleur, AVANT toute confirmation ── */}
          {apercu.isPending ? <p style={{ margin: 0 }}>On compte ce qui sera supprimé…</p> : null}
          {apercu.isError ? (
            <p data-erreur="apercu-suppression" style={{ margin: 0 }}>
              Impossible de compter pour l’instant. Rien n’a été supprimé.
            </p>
          ) : null}
          {apercu.data === undefined ? null : (
            <p data-apercu-suppression-total={String(total)} style={{ margin: 0 }}>
              Le compte de {apercu.data.prenom} et ses {total} enregistrements seront effacés
              pour de bon.
            </p>
          )}

          {/* ── 2. la confirmation qui NOMME le compte ── */}
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label htmlFor="confirmation-suppression" style={{ fontWeight: 600 }}>
              Pour confirmer, retape le prénom de l’enfant : {prenom}
            </label>
            <input
              id="confirmation-suppression"
              data-champ="confirmation-suppression"
              type="text"
              autoComplete="off"
              value={saisie}
              onChange={(evenement) => {
                fixerSaisie(evenement.target.value);
              }}
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
              data-action="supprimer-profil"
              disabled={!prete || suppression.isPending}
              aria-disabled={!prete || suppression.isPending}
              onClick={lancer}
              style={{ minBlockSize: '4rem' }}
            >
              {suppression.isPending ? 'On supprime…' : `Supprimer le compte de ${prenom}`}
            </button>
            {prete ? null : (
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                Le bouton s’active quand le prénom correspond. Les accents et les majuscules
                n’ont pas d’importance.
              </p>
            )}
            {suppression.isError ? (
              <p data-erreur="suppression" style={{ margin: 0 }}>
                La suppression n’a pas eu lieu, et rien n’a été effacé. Réessaie dans un moment.
              </p>
            ) : null}
            <button
              type="button"
              className="cible"
              data-action="annuler-suppression"
              onClick={() => {
                fixerDeplie(false);
                fixerSaisie('');
              }}
              style={{ minBlockSize: '4rem' }}
            >
              Annuler
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
