// Écran de récompense — v2 § 6.2, contrat technique v1 § 10.
//
// `data-fin="reussite"` — ET RIEN D'AUTRE. C'est l'assertion centrale de
// `tests/e2e/cassecou.spec.ts` : après 40 réponses fausses, on arrive quand même ici.
// « Toute session se termine sur une réussite » (CLAUDE.md, R14). Aucun composant de ce lot
// n'émet `data-etat="echec"`, jamais.
//
// C'est aussi le seul endroit du client qui ÉCRIT dans le journal : un `POST /api/tentatives`
// idempotent (§ 6.3). Le journal fait foi ; l'écran, lui, ne calcule rien.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IdNoeud, IdProfil, TentativeAEnregistrer } from '@pierre/partage';
import {
  calculerCleIdempotence,
  enregistrerTentative,
  lireMonde,
  lirePaquetNoeud,
  lireProgression
} from '../api/client.js';
import { CascadeRecompense } from '../composants/CascadeRecompense.js';
import { Etoiles } from '../composants/Etoiles.js';
import { useEtatJeu, useMagasin, useServices } from '../etat/services.js';
import { noeudSuivant } from '../monde/reprise.js';
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
  const dernierGain = useEtatJeu((etat) => etat.dernierGain);

  // Garde locale EN PLUS du drapeau du magasin : `StrictMode` monte deux fois en
  // développement, et le POST partirait deux fois avant que le premier n'ait répondu.
  const envoiEnCours = useRef(false);

  const nombreEtoiles = etoiles ?? 1;

  // `fin-noeud`, et non plus `exercice-termine` : ce code-là n'appartenait pas à `CodeEffet` et
  // n'était donc jamais joué sous son nom — c'est le défaut 1 du contrat des features v2 § 1.5,
  // réparé ici et dans `audio-tone.ts`. Les sons des PALIERS, eux, sont déclenchés par le
  // magasin au moment où la cascade s'applique : un seul endroit décide, un seul endroit joue.
  useEffect(() => {
    jouerEffet(services.audio, 'fin-noeud');
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

        // LA CHARGE EST CELLE DE `TentativeAEnregistrer`, CHAMP POUR CHAMP.
        //
        // Elle ne l'était pas, et c'était le défaut le plus coûteux du client : l'ancienne
        // version envoyait `profilId`, `noeudId`, `exerciceId`, `detail`, et dupliquait à plat
        // `reussi` / `nbErreurs` / `aideUtilisee` / `dureeMs` au lieu de les grouper sous
        // `resume`. Or `serveur/src/routes/tentatives.ts` exige `profil`, `noeud`, `exercice`,
        // `moteur`, `habillage`, `graine`, `demarreLe`, `termineLe` et un OBJET `resume` :
        // **chaque envoi repartait en 400**. Le `catch` plus bas — qui est une bonne règle, une
        // écriture perdue ne doit jamais gâcher la fin de partie — l'avalait dans un
        // `console.warn`. L'enfant voyait ses trois étoiles, et rien n'était jamais journalisé.
        // Le tableau de bord du parent aurait été vide indéfiniment.
        //
        // Le type est gelé et ses champs le sont avec lui : ils sont écrits dans
        // `partage/src/journal/types.ts`, que § 11.1 réexporte. Il n'y avait aucune latitude.
        // Le parcours T3 garde désormais ce risque : il rejoue le nœud, recharge la page et
        // exige que la progression soit là.
        //
        // `etoiles` n'est volontairement PAS envoyé — « dérivée du résumé par
        // `calculerEtoiles`, jamais envoyée par le client ». Un client qui choisit ses propres
        // étoiles peut s'en attribuer trois sans rien réussir.
        const charge: TentativeAEnregistrer = {
          cleIdempotence: cle,
          profil: profil.id,
          noeud: paquet.noeud.id,
          exercice: paquet.exercice.id,
          moteur: paquet.exercice.jeu.moteur,
          habillage: paquet.habillage.id,
          graine,
          demarreLe,
          termineLe,
          resume
        };

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

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * R3 — « il n'y a pas d'autres exercice dans la clairiere ? »
   *
   * Il y en a DOUZE, et la carte l'affiche même (« Étape 1 sur 12 »). Mais cet écran n'offrait
   * que *Rejouer* et *Retour à la carte* : rien ne menait au nœud suivant. Pour qui ne
   * repassait pas par la carte, le jeu s'arrêtait au premier exercice — et c'est exactement ce
   * qui est arrivé au père, deux fois, avant qu'il ne le signale.
   *
   * La règle du « nœud d'après » vit dans `monde/reprise.js`, la même que celle dont la carte
   * se sert pour dire où reprendre. Deux règles pour un même choix finiraient par proposer deux
   * nœuds différents, et l'enfant ne comprendrait ni l'une ni l'autre.
   *
   * Le bouton n'apparaît QUE si un nœud reste à faire dans la région (voir `noeudSuivant`) :
   * une région entière renvoie `null`, et proposer alors un exercice déjà à trois étoiles
   * ferait croire à une progression qui n'existe plus. Revenir à la carte est le bon geste —
   * c'est là que le rallumage de la région se voit (D51).
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */
  const region = paquet?.noeud.region ?? null;
  const requeteMonde = useQuery({
    queryKey: ['monde', profil?.id],
    queryFn: () => lireMonde(profil?.id as IdProfil),
    enabled: profil !== null
  });
  const requeteProgression = useQuery({
    queryKey: ['progression', profil?.id],
    queryFn: () => lireProgression(profil?.id as IdProfil),
    enabled: profil !== null
  });

  const suivant = useMemo((): IdNoeud | null => {
    if (paquet === null || region === null || requeteMonde.data === undefined) return null;
    const laRegion = requeteMonde.data.carte.regions.find((une) => une.region === region);
    if (laRegion === undefined) return null;
    // Le nœud qu'on vient de finir compte comme fait, même si la progression du serveur n'est
    // pas encore revenue : sans ça, le bouton reproposerait l'exercice qu'on quitte.
    const faits = new Set(
      (requeteProgression.data ?? []).map((ligne) => String(ligne.noeud))
    );
    faits.add(String(paquet.noeud.id));
    return noeudSuivant(laRegion.noeuds, faits, paquet.noeud.id);
  }, [paquet, region, requeteMonde.data, requeteProgression.data]);

  const [chargementSuivant, fixerChargementSuivant] = useState(false);
  const allerAuSuivant = useCallback((): void => {
    if (suivant === null) return;
    fixerChargementSuivant(true);
    void lirePaquetNoeud(suivant)
      .then((paquetSuivant) => {
        magasin.getState().demarrerNoeud(paquetSuivant);
      })
      .catch(() => {
        // Un nœud qu'on n'arrive pas à charger ne laisse jamais l'enfant sur un bouton mort :
        // on le ramène à la carte, d'où tout reste atteignable.
        fixerChargementSuivant(false);
        magasin.getState().naviguer('carte');
      });
  }, [suivant, magasin]);

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

      {/* ─────────────────────────────────────────────────────────────────────────────────
          LA CASCADE DE D25 REMPLACE LE SEUL DÉCOMPTE D'ÉTOILES.

          Les étoiles ci-dessus disent ce que ce nœud-ci valait ; la cascade dit où en est
          l'enfant dans le système qui le motive déjà à l'école — étoile, tampon spécial,
          image. Et surtout elle montre **le vide restant** (D25, point 3), qui est la seule
          partie de tout cet écran qui donne envie de recommencer.

          `null` tant que les seuils ne sont pas chargés : aucune jauge inventée, aucun
          nombre en dur (convention C2). */}
      <CascadeRecompense gain={dernierGain} />

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* L'APPEL PRINCIPAL, quand il reste quelque chose à faire. « Rejouer » perd sa classe
            d'appel dans ce cas : c'est « continuer » que l'enfant doit voir en premier, et
            deux boutons qui appellent également n'appellent plus. */}
        {suivant === null ? null : (
          <button
            type="button"
            className="cible cible-appel"
            data-action="exercice-suivant"
            data-noeud-suivant={String(suivant)}
            disabled={chargementSuivant}
            onClick={allerAuSuivant}
          >
            {chargementSuivant ? 'On y va…' : 'Exercice suivant'}
          </button>
        )}
        <button
          type="button"
          className={suivant === null ? 'cible cible-appel' : 'cible'}
          onClick={rejouer}
        >
          Rejouer
        </button>
        <button type="button" className="cible" onClick={retourCarte}>
          Retour à la carte
        </button>
      </div>
    </main>
  );
}
