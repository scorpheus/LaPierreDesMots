// Écran de récompense — v2 § 6.2, contrat technique v1 § 10.
//
// `data-fin="reussite"` — ET RIEN D'AUTRE. C'est l'assertion centrale de
// `tests/e2e/cassecou.spec.ts` : après 40 réponses fausses, on arrive quand même ici.
// « Toute session se termine sur une réussite » (CLAUDE.md, R14). Aucun composant de ce lot
// n'émet `data-etat="echec"`, jamais.
//
// C'est aussi le seul endroit du client qui ÉCRIT dans le journal : un `POST /api/tentatives`
// idempotent (§ 6.3). Le journal fait foi ; l'écran, lui, ne calcule rien.
import { useCallback, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TentativeAEnregistrer } from '@pierre/partage';
import { calculerCleIdempotence, enregistrerTentative } from '../api/client.js';
import { Etoiles } from '../composants/Etoiles.js';
import { useEtatJeu, useMagasin, useServices } from '../etat/services.js';
import { jouerEffet } from '../services/audio-tone.js';

/** Une phrase par nombre d'étoiles. Aucune ne compare, aucune ne juge, aucune ne regrette. */
const FELICITATIONS: Readonly<Record<number, string>> = {
  0: 'C’est fait ! Le décor a repris ses couleurs.',
  1: 'C’est fait ! Le décor a repris ses couleurs.',
  2: 'Tu as tout trouvé tout seul. Bravo !',
  3: 'Sans une seule erreur. La Pierre brille.'
};

export function EcranRecompense(): ReactElement {
  const magasin = useMagasin();
  const services = useServices();
  const fileDAttente = useQueryClient();

  const profil = useEtatJeu((etat) => etat.profil);
  const paquet = useEtatJeu((etat) => etat.paquet);
  const resume = useEtatJeu((etat) => etat.resume);
  const etoiles = useEtatJeu((etat) => etat.etoiles);
  const graine = useEtatJeu((etat) => etat.graine);
  const demarreLe = useEtatJeu((etat) => etat.demarreLe);
  const termineLe = useEtatJeu((etat) => etat.termineLe);
  const dejaEnvoyee = useEtatJeu((etat) => etat.tentativeEnvoyee);

  // Garde locale EN PLUS du drapeau du magasin : `StrictMode` monte deux fois en
  // développement, et le POST partirait deux fois avant que le premier n'ait répondu.
  const envoiEnCours = useRef(false);

  const nombreEtoiles = etoiles ?? 1;

  useEffect(() => {
    jouerEffet(services.audio, 'exercice-termine');
  }, [services]);

  useEffect(() => {
    if (dejaEnvoyee || envoiEnCours.current) {
      return;
    }
    if (profil === null || paquet === null || resume === null) {
      return;
    }
    if (demarreLe === null || termineLe === null) {
      return;
    }

    envoiEnCours.current = true;
    const profilId = String(profil.id);
    const noeudId = String(paquet.noeud.id);

    void (async () => {
      try {
        const cle = await calculerCleIdempotence(profilId, noeudId, demarreLe, graine);

        // NOTE DE CONTRAT : `TentativeAEnregistrer` est gelée par le nom (§ 11.1) sans que ses
        // champs le soient. La charge ci-dessous reprend EXACTEMENT les colonnes de la table
        // `tentatives` (§ 6.2), en camelCase. Seul point à reprendre si L-B a nommé autrement.
        const charge = {
          cleIdempotence: cle,
          profilId,
          noeudId,
          exerciceId: String(paquet.exercice.id),
          moteur: paquet.exercice.jeu.moteur,
          habillage: paquet.exercice.jeu.habillage,
          graine,
          demarreLe,
          termineLe,
          dureeMs: resume.dureeMs,
          // Toujours `true` : `false` est structurellement inatteignable (§ 5.6, R14).
          reussi: resume.reussi,
          nbErreurs: resume.nbErreurs,
          aideUtilisee: resume.aideUtilisee,
          etoiles: nombreEtoiles,
          detail: { etapes: resume.etapes }
        } as unknown as TentativeAEnregistrer;

        await enregistrerTentative(charge);
        magasin.getState().marquerTentativeEnvoyee();
        await fileDAttente.invalidateQueries({ queryKey: ['progression', profilId] });
      } catch (cause) {
        // Une écriture perdue ne doit JAMAIS gâcher la fin de partie de l'enfant : l'écran
        // reste une réussite, la trace part dans la console pour le parent.
        console.warn('[tentative] enregistrement impossible :', cause);
      } finally {
        envoiEnCours.current = false;
      }
    })();
  }, [
    dejaEnvoyee,
    profil,
    paquet,
    resume,
    demarreLe,
    termineLe,
    graine,
    nombreEtoiles,
    magasin,
    fileDAttente
  ]);

  const rejouer = useCallback((): void => {
    magasin.getState().rejouer();
  }, [magasin]);

  const retourCarte = useCallback((): void => {
    magasin.getState().naviguer('carte');
  }, [magasin]);

  return (
    <main
      data-ecran="recompense"
      // Une seule valeur possible, aujourd'hui et toujours.
      data-fin="reussite"
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        alignItems: 'center',
        justifyContent: 'center',
        minBlockSize: '100vh'
      }}
    >
      <h1 className="titre" style={{ fontSize: '3rem', margin: 0, textAlign: 'center' }}>
        Bravo&nbsp;!
      </h1>

      <Etoiles
        acquises={nombreEtoiles}
        taille={96}
        animees
        interEtoilesMs={paquet?.habillage.timings.interEtoilesMs ?? 180}
      />

      <p className="zone-lecture" style={{ fontSize: '1.5rem', padding: '1rem', margin: 0 }}>
        {FELICITATIONS[nombreEtoiles] ?? FELICITATIONS[1]}
      </p>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" className="cible cible-appel" onClick={rejouer}>
          Rejouer
        </button>
        <button type="button" className="cible" onClick={retourCarte}>
          Retour à la carte
        </button>
      </div>
    </main>
  );
}
