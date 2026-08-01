// Écran de choix de profil — v2 § 11, contrat technique v1 § 1.4 et § 10.
//
// « Grille de cartes-profils avec avatar, UN TAP SUFFIT, AUCUN MOT DE PASSE. »
// Aucun champ caché, aucune confirmation, aucune saisie pour entrer dans le jeu : un enfant de
// 7 ans doit pouvoir démarrer sans qu'un adulte lui explique quoi que ce soit (R18).
// La zone parent et son code à 4 chiffres ne sont PAS de ce lot (v2 § 11, hors périmètre D1).
import { useCallback, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreationProfil, Profil } from '@pierre/partage';
import { creerProfil, listerProfils } from '../api/client.js';
import { useMagasin } from '../etat/services.js';
import { EcranReglagesLecture } from './EcranReglagesLecture.js';

/** Les couleurs d'avatar, prises au nuancier. Aucune ne signifie « raté ». */
const TEINTES_AVATAR = [
  'var(--nuancier-bleu)',
  'var(--nuancier-vert)',
  'var(--nuancier-orange)',
  'var(--nuancier-violet)',
  'var(--nuancier-rose)',
  'var(--nuancier-jaune)'
] as const;

/**
 * Teinte de carte dérivée du prénom, sans aléatoire : deux lancements montrent les mêmes
 * couleurs (déterminisme, annexe T § 2). `Alea` n'a rien à faire ici — ce n'est pas un tirage.
 */
function teinteDuPrenom(prenom: string): string {
  let somme = 0;
  for (let index = 0; index < prenom.length; index += 1) {
    somme = (somme + prenom.charCodeAt(index) * (index + 1)) % 997;
  }
  return TEINTES_AVATAR[somme % TEINTES_AVATAR.length] ?? TEINTES_AVATAR[0];
}

function initiale(prenom: string): string {
  return prenom.trim().slice(0, 1).toLocaleUpperCase('fr-FR') || '?';
}

interface ProprietesCarteProfil {
  readonly profil: Profil;
  readonly surChoix: (profil: Profil) => void;
  readonly surReglages: (profil: Profil) => void;
}

function CarteProfil({ profil, surChoix, surReglages }: ProprietesCarteProfil): ReactElement {
  const prenom = String(profil.prenom);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <button
      type="button"
      className="cible carte-profil"
      onClick={() => surChoix(profil)}
      aria-label={`Jouer avec le profil de ${prenom}`}
      style={{
        flexDirection: 'column',
        inlineSize: '13rem',
        blockSize: '15rem',
        gap: '1rem',
        backgroundColor: 'var(--parchemin)'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          inlineSize: '7rem',
          blockSize: '7rem',
          borderRadius: '50%',
          border: 'var(--epaisseur-trait) solid var(--trait)',
          backgroundColor: teinteDuPrenom(prenom),
          color: 'var(--parchemin)',
          fontFamily: 'var(--font-titre)',
          fontSize: '3rem'
        }}
      >
        {initiale(prenom)}
      </span>
      <span className="titre" style={{ fontSize: '1.5rem' }}>
        {prenom}
      </span>
    </button>

    {/* Les réglages de lecture sont PAR PROFIL (D19) : l'accès part donc de la carte de
        l'enfant, jamais d'un menu général. Un seul tap, aucun mot de passe — la zone parent
        et son code à 4 chiffres sont un autre écran (v2 § 11). */}
    <button
      type="button"
      className="cible"
      data-reglages-lecture={String(profil.id)}
      onClick={() => surReglages(profil)}
      aria-label={`Régler la lecture de ${prenom}`}
      style={{ inlineSize: '13rem' }}
    >
      <span aria-hidden="true">👓</span>
      <span>Comment je lis</span>
    </button>
    </div>
  );
}

export function EcranProfils(): ReactElement {
  const magasin = useMagasin();
  const fileDAttente = useQueryClient();
  const [creationOuverte, fixerCreationOuverte] = useState(false);
  const [prenomSaisi, fixerPrenomSaisi] = useState('');
  const [reglagesPour, fixerReglagesPour] = useState<Profil | null>(null);

  /**
   * La liste des enfants se relit à CHAQUE arrivée sur cet écran.
   *
   * Les réglages globaux de TanStack Query (`Application.tsx`) posent `staleTime: 30 s`, ce
   * qui est juste pour le contenu — un nœud, un exercice, un habillage ne changent pas
   * pendant une partie. Ce n'est pas juste pour CET écran : c'est la porte d'entrée, et il
   * doit montrer ce que le serveur a réellement. Un profil créé ailleurs — depuis le portable
   * du parent, depuis un autre onglet, ou par les crochets de test — restait invisible
   * pendant trente secondes, et l'enfant se voyait refuser sa propre carte.
   *
   * Mesuré : la suite T3 `parcours-nominal` cherchait « Alma » juste après l'avoir créée et ne
   * la trouvait pas. Ce n'était pas un défaut du test.
   */
  const profils = useQuery({
    queryKey: ['profils'],
    queryFn: listerProfils,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const creation = useMutation({
    mutationFn: (nouveau: CreationProfil) => creerProfil(nouveau),
    onSuccess: async (profil: Profil) => {
      await fileDAttente.invalidateQueries({ queryKey: ['profils'] });
      fixerCreationOuverte(false);
      fixerPrenomSaisi('');
      magasin.getState().choisirProfil(profil);
    }
  });

  const choisir = useCallback(
    (profil: Profil): void => {
      magasin.getState().choisirProfil(profil);
    },
    [magasin]
  );

  const soumettre = useCallback(
    (evenement: FormEvent<HTMLFormElement>): void => {
      evenement.preventDefault();
      const prenom = prenomSaisi.trim();
      if (prenom === '') {
        return;
      }
      // `CreationProfil` déclare `avatar` et `paletteVariante` facultatifs : le client n'invente
      // aucun champ d'avatar et laisse le serveur poser le sien par défaut (`avatar_json` est
      // `NOT NULL` au contrat v1 § 6.2). Le transtypage défensif que L-D avait posé ici —
      // « le contrat gèle le nom mais pas les membres » — n'a plus lieu d'être : les membres
      // sont sous les yeux, et le compilateur protège de nouveau ce site d'appel.
      creation.mutate({ prenom, paletteVariante: 'clairiere' });
    },
    [creation, prenomSaisi]
  );

  const liste = profils.data ?? [];

  // Les réglages remplacent la liste plutôt que de s'ouvrir par-dessus : une couche modale
  // demande de savoir comment en sortir, et ce n'est pas acquis à 7 ans. Un seul écran à la
  // fois, et un bouton « Retour » de 64 px.
  if (reglagesPour !== null) {
    return (
      <EcranReglagesLecture
        profil={reglagesPour}
        surFermeture={() => {
          fixerReglagesPour(null);
        }}
      />
    );
  }

  return (
    <main
      data-ecran="profils"
      style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <h1 className="titre" style={{ fontSize: '2.5rem', margin: 0 }}>
        Qui joue&nbsp;?
      </h1>

      {profils.isPending ? <p>On cherche les joueurs…</p> : null}

      {profils.isError ? (
        <div className="zone-lecture" style={{ padding: '1rem' }}>
          <p>Le jeu n’arrive pas à joindre la Pierre. Demande à un adulte de la rallumer.</p>
          <button type="button" className="cible" onClick={() => void profils.refetch()}>
            Réessayer
          </button>
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          alignItems: 'stretch'
        }}
      >
        {liste.map((profil) => (
          <CarteProfil
            key={String(profil.id)}
            profil={profil}
            surChoix={choisir}
            surReglages={fixerReglagesPour}
          />
        ))}

        <button
          type="button"
          className="cible carte-profil"
          onClick={() => fixerCreationOuverte(true)}
          aria-label="Créer un nouveau joueur"
          style={{
            flexDirection: 'column',
            inlineSize: '13rem',
            blockSize: '15rem',
            gap: '1rem',
            borderStyle: 'dashed'
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '4rem', lineHeight: 1 }}>
            +
          </span>
          <span className="titre" style={{ fontSize: '1.25rem' }}>
            Nouveau joueur
          </span>
        </button>
      </div>

      {creationOuverte ? (
        <form
          onSubmit={soumettre}
          className="zone-lecture"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            border: 'var(--epaisseur-trait) solid var(--trait)',
            borderRadius: 'var(--rayon-carte)'
          }}
        >
          <label htmlFor="prenom-nouveau" style={{ fontSize: '1.25rem' }}>
            Ton prénom
          </label>
          <input
            id="prenom-nouveau"
            name="prenom"
            type="text"
            autoComplete="off"
            maxLength={24}
            value={prenomSaisi}
            onChange={(evenement) => fixerPrenomSaisi(evenement.target.value)}
            style={{
              minBlockSize: 'var(--cible-min)',
              fontSize: '1.5rem',
              fontFamily: 'var(--font-lecture)',
              padding: '0 1rem',
              border: 'var(--epaisseur-trait) solid var(--trait)',
              borderRadius: 'var(--rayon-carte)',
              backgroundColor: 'var(--parchemin)',
              color: 'var(--trait)'
            }}
          />
          <button
            type="submit"
            className="cible cible-appel"
            disabled={prenomSaisi.trim() === '' || creation.isPending}
          >
            C’est parti
          </button>
          <button
            type="button"
            className="cible"
            onClick={() => fixerCreationOuverte(false)}
          >
            Annuler
          </button>
          {creation.isError ? (
            <p style={{ inlineSize: '100%', margin: 0 }}>
              La Pierre n’a pas pu enregistrer ce joueur. Réessaie dans un instant.
            </p>
          ) : null}
        </form>
      ) : null}
    </main>
  );
}
