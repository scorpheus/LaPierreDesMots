// La pastille « partir en sortie » — D46, lot N6, contrat de finition v3 § 4.6 et § 6.1.
//
// « Partir en sortie se fait en UN TAP depuis l'ouverture. Aucun écran intermédiaire
// obligatoire, nulle part. »
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// LE FAIT MESURÉ QUI JUSTIFIE CE FICHIER (contrat v3 § 1.7) : à l'ouverture, l'application
// montre `EcranProfils` ; un tap choisit le profil et mène à `/carte` ; un SECOND tap sur une
// région mène à `/noeud`. Deux taps, et aucun bouton « partir en sortie » n'existait.
//
// La pastille résout la sortie AVANT le tap — la carte du monde, la progression et le paquet
// du premier nœud sont déjà chargés quand le doigt arrive. Les deux écritures du magasin
// (`choisirProfil` puis `demarrerNoeud`) partent alors dans le même tour de boucle : React
// n'en fait qu'un rendu, et l'enfant ne voit jamais la carte passer.
//
// **Elle ne peut pas mener à un état sans issue** — le pire bug possible ici. Trois branches,
// et les trois débouchent :
//   • sortie connue et paquet chargé → le nœud, tout de suite ;
//   • sortie connue mais paquet pas encore là → le nœud dès qu'il arrive, la carte en attendant ;
//   • aucune sortie ouverte → la carte, qui est un écran vivant, jamais un message d'erreur.
// ─────────────────────────────────────────────────────────────────────────────────────────
import { useCallback, useMemo } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CodeRegion, EtatMonde, IdNoeud, Profil } from '@pierre/partage';
import { regionsOuvertes } from '@pierre/partage/monde';
import { lireMonde, lirePaquetNoeud, lireProgression } from '../api/client.js';
import { useMagasin } from '../etat/services.js';

/** Là où le prochain tap emmène : une région ouverte, et le nœud où l'on reprend. */
export interface SortieProchaine {
  readonly region: CodeRegion;
  readonly noeud: IdNoeud;
  /** L'étape dans la sortie, à partir de 1. Dire « où j'en suis » sans faire compter. */
  readonly rang: number;
  readonly total: number;
}

/**
 * Où reprendre — PUR, sans requête, sans horloge.
 *
 * **Il n'y a jamais de `null` quand une région ouverte porte des nœuds.** Une région
 * entièrement terminée renvoie sur son premier nœud plutôt que sur rien : un acquis n'est
 * jamais repris (R14), rejouer est gratuit, et une pastille qui cesserait de répondre serait
 * précisément l'état sans issue que ce lot doit supprimer.
 *
 * La liste des régions jouables vient de `regionsOuvertes` — la MÊME fonction qu'`EcranCarte`
 * appelle. On ne la recalcule pas : deux lectures de « qu'est-ce qui est ouvert » finiraient
 * par diverger, et l'enfant partirait ailleurs que là où la carte le montre.
 */
export function prochaineSortie(
  monde: EtatMonde | null,
  noeudsFaits: ReadonlySet<string>,
): SortieProchaine | null {
  if (monde === null) {
    return null;
  }
  const ouvertes = new Set(regionsOuvertes(monde.carte).map((code) => String(code)));
  const candidates = [...monde.carte.regions]
    .filter((region) => ouvertes.has(String(region.region)) && region.noeuds.length > 0)
    .sort((gauche, droite) => gauche.ordre - droite.ordre);

  // La première région ouverte qui a encore quelque chose de neuf. À défaut, la première
  // ouverte tout court : on repart au début, et c'est gratuit.
  const inachevee = candidates.find((region) =>
    region.noeuds.some((noeud) => !noeudsFaits.has(String(noeud)))
  );
  const region = inachevee ?? candidates[0];
  if (region === undefined) {
    return null;
  }

  const index = region.noeuds.findIndex((noeud) => !noeudsFaits.has(String(noeud)));
  const choisi = index === -1 ? 0 : index;
  const noeud = region.noeuds[choisi];
  if (noeud === undefined) {
    return null;
  }

  return { region: region.region, noeud, rang: choisi + 1, total: region.noeuds.length };
}

export interface ProprietesPastilleSortie {
  /** Le joueur qui part. La pastille le choisit elle-même : c'est ce qui fait UN tap. */
  readonly profil: Profil;
  /**
   * La sortie déjà résolue. Injectée par les tests et par l'écran d'ouverture (N4), qui
   * connaît le monde avant d'afficher la pastille. Résolue par requête quand elle est absente.
   */
  readonly sortie?: SortieProchaine | null;
  /** Le visuel de la pastille. Un pictogramme et deux mots par défaut. */
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  /** Appelé quand aucune sortie n'est ouverte, APRÈS que le profil a été choisi. */
  readonly surRepli?: (profil: Profil) => void;
}

export function PastilleSortie({
  profil,
  sortie: sortieInjectee,
  children,
  style,
  surRepli
}: ProprietesPastilleSortie): ReactElement {
  const magasin = useMagasin();
  const resolutionDemandee = sortieInjectee === undefined;

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // LES CLÉS SONT PROPRES À LA PASTILLE, ET C'EST UNE CORRECTION, PAS UNE PRÉCAUTION.
  //
  // Première écriture de ce fichier : les clés partagées `['monde', id]` et
  // `['progression', id]`, « pour que les données soient déjà chaudes quand la carte s'ouvre ».
  // Mesuré dans le vrai navigateur, `parcours-sortie-clairiere.spec.ts` est passé au rouge —
  // « attendu 2/5, reçu 1/5 » — et le mécanisme est le suivant :
  //
  //   1. la page se charge, `EcranProfils` monte, la pastille lit la progression → elle est
  //      vide, et le cache global la garde FRAÎCHE 30 s (`Application.tsx:32`) ;
  //   2. le test journalise alors une réussite par `__test.chargerProfil` ;
  //   3. l'enfant tape, `EcranCarte` monte, lit la MÊME clé, trouve la valeur d'avant, et
  //      annonce « étape 1 sur 5 » alors qu'il en a fini une.
  //
  // Une pastille qui accélère l'entrée ne doit pas décider de ce que la carte affiche. Elle a
  // donc ses propres clés, et `EcranCarte` retrouve exactement le comportement qu'il avait
  // avant ce lot. Le prix est une requête locale de plus ; le prix inverse était un écran qui
  // ment à l'enfant sur ce qu'il a déjà fait.
  // ═══════════════════════════════════════════════════════════════════════════════════════
  const requeteMonde = useQuery({
    queryKey: ['pastille-sortie', 'monde', String(profil.id)],
    queryFn: () => lireMonde(profil.id),
    enabled: resolutionDemandee,
    // La pastille est revue à chaque retour sur l'écran de choix, après chaque sortie : sa
    // destination doit être celle d'aujourd'hui, jamais celle d'il y a trente secondes.
    staleTime: 0,
    refetchOnMount: 'always'
  });
  const requeteProgression = useQuery({
    queryKey: ['pastille-sortie', 'progression', String(profil.id)],
    queryFn: () => lireProgression(profil.id),
    enabled: resolutionDemandee,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const noeudsFaits = useMemo(
    () => new Set((requeteProgression.data ?? []).map((ligne) => String(ligne.noeud))),
    [requeteProgression.data]
  );

  const sortie = useMemo(
    () =>
      sortieInjectee === undefined
        ? prochaineSortie(requeteMonde.data ?? null, noeudsFaits)
        : sortieInjectee,
    [sortieInjectee, requeteMonde.data, noeudsFaits]
  );

  /**
   * Le paquet du premier nœud, chargé AVANT le tap. C'est lui qui fait la différence entre
   * « un tap et on y est » et « un tap, un écran de carte, puis on y est ».
   */
  const requetePaquet = useQuery({
    queryKey: ['pastille-sortie', 'paquet', sortie === null ? null : String(sortie.noeud)],
    queryFn: () => {
      if (sortie === null) {
        throw new Error('Paquet demandé sans sortie résolue.');
      }
      return lirePaquetNoeud(sortie.noeud);
    },
    enabled: sortie !== null
  });

  const partir = useCallback((): void => {
    // Le profil d'abord, TOUJOURS : sans lui, le nœud n'aurait personne à qui écrire sa
    // tentative. `choisirProfil` pose `ecran: 'carte'` — c'est le repli, pas la destination.
    magasin.getState().choisirProfil(profil);

    if (sortie === null) {
      surRepli?.(profil);
      return;
    }

    const pret = requetePaquet.data;
    if (pret !== undefined) {
      // Même tour de boucle que `choisirProfil` : un seul rendu, aucune carte à l'écran.
      magasin.getState().demarrerNoeud(pret);
      return;
    }

    // Le paquet n'est pas encore là : on part quand même, et le nœud s'ouvre à son arrivée.
    // La carte reste affichée dans l'intervalle — jamais un écran d'attente, jamais rien.
    void lirePaquetNoeud(sortie.noeud)
      .then((paquet) => {
        magasin.getState().demarrerNoeud(paquet);
      })
      .catch(() => {
        // Le serveur n'a pas rendu le nœud : on reste sur la carte, qui reste jouable.
        surRepli?.(profil);
      });
  }, [magasin, profil, sortie, requetePaquet.data, surRepli]);

  return (
    <button
      type="button"
      className="cible cible-appel"
      data-pastille-sortie={String(profil.id)}
      data-sortie-noeud={sortie === null ? '' : String(sortie.noeud)}
      data-sortie-region={sortie === null ? '' : String(sortie.region)}
      data-sortie-prete={requetePaquet.data === undefined ? 'non' : 'oui'}
      data-pictogramme="sortie"
      aria-label={`Partir en sortie avec ${String(profil.prenom)}`}
      onClick={partir}
      style={{
        flexDirection: 'column',
        gap: '0.35rem',
        inlineSize: '13rem',
        minBlockSize: 'var(--cible-min, 64px)',
        padding: '0.75rem',
        ...style
      }}
    >
      {children ?? (
        <>
          <span aria-hidden="true" style={{ fontSize: '2.75rem', lineHeight: 1 }}>
            🥾
          </span>
          <span className="titre" style={{ fontSize: '1.375rem' }}>
            On y va&nbsp;!
          </span>
          {/* Dire l'étape, jamais ce qui manque (C7) : « 2 sur 5 » est un état, pas une dette. */}
          {sortie === null ? null : (
            <span data-sortie-etape={`${String(sortie.rang)}/${String(sortie.total)}`}
              style={{ fontSize: '1rem' }}>
              Étape {sortie.rang} sur {sortie.total}
            </span>
          )}
        </>
      )}
    </button>
  );
}
