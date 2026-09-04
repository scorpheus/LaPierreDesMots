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
import type { EtatMonde, IdNoeud, IdProfil, TentativeAEnregistrer } from '@pierre/partage';
import {
  calculerCleIdempotence,
  enregistrerTentative,
  lireMonde,
  lirePaquetNoeud,
  lireProgression,
  urlAsset
} from '../api/client.js';
import { regionsDuDocument, stadesDuDocument } from '@pierre/partage/monde';
import { CascadeRecompense } from '../composants/CascadeRecompense.js';
import { detailDesEtoiles } from '../composants/detail-etoiles.js';
import { Etoiles } from '../composants/Etoiles.js';
import { EvolutionGobi } from '../composants/EvolutionGobi.js';
import { DessinButin } from '../monde/Butin.js';
import { useEtatJeu, useMagasin, useServices } from '../etat/services.js';
import { noeudSuivant, repriseDeRegion } from '../monde/reprise.js';
import { jouerEffet } from '../services/audio-tone.js';
import { effacerParticules } from '../gamefeel/particules.js';

/** Une phrase par nombre d'étoiles. Aucune ne compare, aucune ne juge, aucune ne regrette. */
const FELICITATIONS: Readonly<Record<number, string>> = {
  0: 'C’est fait ! Le décor a repris ses couleurs.',
  1: 'C’est fait ! Le décor a repris ses couleurs.',
  2: 'Tu as tout trouvé tout seul. Bravo !',
  3: 'Sans une seule erreur. La Pierre brille.'
};

export interface ProprietesEcranRecompense {
  /** Destination de fin d'une vraie sortie. Le routeur la relie au campement. */
  readonly surFinSortie?: () => void;
}

/** Les seules ouvertures dignes d'une annonce : une région vraiment passée de fermée à ouverte. */
export function regionsNouvellementOuvertes(
  avant: EtatMonde | null,
  apres: EtatMonde | null
): readonly string[] {
  if (avant === null || apres === null) return [];
  const ouvertesAvant = new Set(
    avant.carte.regions.filter((region) => region.ouverte).map((region) => String(region.region))
  );
  return apres.carte.regions
    .filter((region) => region.ouverte && !ouvertesAvant.has(String(region.region)))
    .map((region) => String(region.region));
}

/** Le total régional reste distinct du plan de sortie, même quand les deux se terminent. */
export function texteProgressionRegionale(
  finDeSortie: boolean,
  termines: number,
  total: number
): string {
  if (finDeSortie) {
    return termines === total
      ? 'Ta sortie est terminée, et cette région aussi. '
      : 'Ta sortie est terminée. Cette région continue : ';
  }
  return termines === total ? 'Cette région est terminée. ' : 'Exercice terminé. ';
}

/** Une région est complète seulement quand son référentiel contient des nœuds et qu'ils sont tous faits. */
export function regionEstTerminee(
  progression: { readonly termines: number; readonly total: number } | null
): boolean {
  return progression !== null && progression.total > 0 && progression.termines >= progression.total;
}

export function EcranRecompense({ surFinSortie }: ProprietesEcranRecompense = {}): ReactElement {
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
  const journalise = useEtatJeu((etat) => etat.journalise);
  const dernierGain = useEtatJeu((etat) => etat.dernierGain);
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);
  const sortie = useEtatJeu((etat) => etat.sortie);

  // La couche vit à la racine et survit à un changement de route. Sans ce nettoyage, une onde
  // partie dans l'exercice pouvait traverser l'écran de récompense puis le campement.
  useEffect(() => effacerParticules, []);

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
    // ── R30 — LA PARTIE DU PARENT NE COMPTE PAS ────────────────────────────────────────────
    //
    // `tentatives` fait foi pour toute la pédagogie : BKT, Leitner et sélecteur s'en
    // recalculent. Une partie que le parent lance depuis sa galerie pour VOIR à quoi ressemble
    // un exercice n'est pas une donnée sur l'enfant ; l'y inscrire fausserait les trois, et de
    // la pire façon — silencieusement, et dans le sens « il sait faire ».
    //
    // Le garde est ici, au seul endroit qui écrit. `LANCEMENT_PARENT` portait déjà l'intention
    // depuis N5 (`journalise: false`) sans que personne ne la lise : le drapeau existait, la
    // constante existait, et rien ne s'en servait.
    if (!journalise) {
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

        const reponse = await enregistrerTentative(charge);
        magasin.getState().marquerTentativeEnvoyee();
        // ── LA CASCADE VIENT DU SERVEUR — lot A1 (R31) ────────────────────────────────────
        // Avant ce lot, `magasin.ts` calculait `dernierGain` lui-même, dans une variable qui
        // repartait de zéro à chaque rechargement : rien de ce que l'enfant gagnait n'était
        // jamais enregistré. Le serveur calcule et enregistre désormais la cascade DANS la
        // même transaction que la tentative, et la rend ici : le client ne fait plus que LIRE.
        magasin.getState().appliquerGainCascade(reponse.gainCascade);
        await fileDAttente.invalidateQueries({ queryKey: ['progression', profilId] });
        // R6 — le monde AUSSI. Gobi évolue en fonction des formes qu'il vient de gagner, et
        // sans cette invalidation la carte comme l'écran garderaient le Gobi d'avant : son
        // évolution n'aurait jamais pu se voir, puisqu'on ne rechargeait jamais ce qui la porte.
        await fileDAttente.invalidateQueries({ queryKey: ['monde', String(profil.id)] });
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
    journalise,
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
    // MÊME CLÉ que la carte, le campement et le coffre. Une clé différente ferait deux
    // caches du même monde, et l'invalidation d'après-tentative n'en toucherait qu'un :
    // Gobi aurait grandi ici et pas là.
    queryKey: ['monde', profil === null ? null : String(profil.id)],
    queryFn: () => lireMonde(profil?.id as IdProfil),
    enabled: profil !== null
  });
  // Le référentiel des stades — MÊME CLÉ que le campement (`['monde', 'stades']`) : c'est le
  // même document, et deux clés en feraient deux lectures à faire diverger. On n'y lit que le
  // LIBELLÉ ; le stade lui-même est décidé par le serveur.
  const requeteStades = useQuery({
    queryKey: ['monde', 'stades'],
    queryFn: async () => {
      const reponse = await fetch(urlAsset('monde/gobi-stades.json'), {
        headers: { Accept: 'application/json' }
      });
      if (!reponse.ok) throw new Error('Référentiel des stades introuvable.');
      return stadesDuDocument((await reponse.json()) as unknown);
    }
  });

  const requeteProgression = useQuery({
    queryKey: ['progression', profil?.id],
    queryFn: () => lireProgression(profil?.id as IdProfil),
    enabled: profil !== null
  });

  const requeteRegions = useQuery({
    queryKey: ['monde', 'regions'],
    queryFn: async () => {
      const reponse = await fetch(urlAsset('monde/regions.json'), {
        headers: { Accept: 'application/json' }
      });
      if (!reponse.ok) throw new Error('Référentiel des régions introuvable.');
      return regionsDuDocument((await reponse.json()) as unknown);
    },
    enabled: requeteMonde.data !== undefined
  });

  // La référence est prise AVANT l'invalidation du POST. Sans monde antérieur en cache, il n'y
  // a rien à comparer : mieux vaut ne rien annoncer que raconter une ouverture supposée.
  const refMondeAvant = useRef<EtatMonde | null>(null);
  if (refMondeAvant.current === null && requeteMonde.data !== undefined) {
    refMondeAvant.current = requeteMonde.data;
  }
  const regionsOuvertesMaintenant = regionsNouvellementOuvertes(
    refMondeAvant.current,
    requeteMonde.data ?? null
  );
  const nomsRegionsOuvertes = regionsOuvertesMaintenant
    .map((code) => requeteRegions.data?.find((region) => String(region.region) === code)?.libelle)
    .filter((libelle): libelle is string => libelle !== undefined);

  const rangDansSortie = useMemo(
    () =>
      sortie === null || paquet === null
        ? -1
        : sortie.etapes.findIndex((etape) => etape.noeud === paquet.noeud.id),
    [sortie, paquet]
  );
  const finDeSortie =
    sortie !== null && rangDansSortie >= 0 && rangDansSortie === sortie.etapes.length - 1;

  const suivant = useMemo((): IdNoeud | null => {
    if (sortie !== null && rangDansSortie >= 0) {
      return sortie.etapes[rangDansSortie + 1]?.noeud ?? null;
    }
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
  }, [sortie, rangDansSortie, paquet, region, requeteMonde.data, requeteProgression.data]);

  const progressionRegionale = useMemo(() => {
    if (paquet === null || region === null || requeteMonde.data === undefined) return null;
    const laRegion = requeteMonde.data.carte.regions.find((une) => une.region === region);
    if (laRegion === undefined) return null;
    const faits = new Set((requeteProgression.data ?? []).map((ligne) => String(ligne.noeud)));
    faits.add(String(paquet.noeud.id));
    return {
      termines: laRegion.noeuds.filter((noeud) => faits.has(String(noeud))).length,
      total: laRegion.noeuds.length,
    };
  }, [paquet, region, requeteMonde.data, requeteProgression.data]);

  // Une sortie peut être clôturée avant d'avoir parcouru toute la région. Dans ce cas, le
  // bouton « Au campement » ne doit pas être la seule issue : l'enfant doit pouvoir reprendre
  // immédiatement au premier nœud inédit, sans repasser par une pastille qui pouvait composer
  // un exercice déjà vu.
  const repriseRegionale = useMemo(() => {
    if (region === null || requeteMonde.data === undefined) return null;
    const laRegion = requeteMonde.data.carte.regions.find((une) => une.region === region);
    if (laRegion === undefined) return null;
    const faits = new Set((requeteProgression.data ?? []).map((ligne) => String(ligne.noeud)));
    faits.add(String(paquet?.noeud.id ?? ''));
    return repriseDeRegion(laRegion.noeuds, faits);
  }, [region, paquet, requeteMonde.data, requeteProgression.data]);

  const nomRegion =
    requeteRegions.data?.find((une) => String(une.region) === String(region))?.libelle ??
    String(region ?? 'la région');
  const continuerRegion =
    finDeSortie && progressionRegionale !== null && progressionRegionale.termines < progressionRegionale.total
      ? repriseRegionale?.noeud ?? null
      : null;
  const regionTerminee = regionEstTerminee(progressionRegionale);
  const compagnonRallie = regionTerminee
    ? requeteMonde.data?.compagnons.find(
        (compagnon) => compagnon.region === region && compagnon.rallieLe !== null
      ) ?? null
    : null;
  const objetRapporte = regionTerminee
    ? requeteMonde.data?.campement.find(
        (objet) => objet.region === region && objet.placeLe !== null
      ) ?? null
    : null;

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * R6 — « quand on gagne assez de point et que tu dis goby a évolué, montre la goby, fait une
   * petite animation de transition »
   *
   * Gobi évolue en dix stades (D43), et son évolution est le SEUL moment du jeu où le compagnon
   * change. Elle passait entièrement inaperçue : le stade s'écrivait en base, la carte le
   * montrait au prochain passage, et rien ne le célébrait. Pire, `EcranRecompense` n'invalidait
   * que la progression après le POST — donc l'écran gardait le Gobi d'AVANT, et le changement
   * ne pouvait même pas être observé.
   *
   * ── COMMENT LE CHANGEMENT EST DÉTECTÉ, SANS RIEN INVENTER ─────────────────────────────────
   * La référence retient le PREMIER stade vu, c'est-à-dire celui d'avant l'enregistrement : la
   * requête du monde est déjà en cache quand on arrive ici, depuis la carte. Le POST invalide
   * ensuite `['monde']`, la requête revient, et si le stade a changé c'est que Gobi a grandi.
   *
   * Aucun calcul dupliqué : le stade est décidé par le serveur (`stadeApresFormes`, une
   * fonction des formes collectées) et l'écran ne fait que COMPARER. Le recalculer ici serait
   * la seconde source de vérité que le projet refuse partout ailleurs.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */
  const stadeCourant = requeteMonde.data?.gobi.stade ?? null;
  const refStadeAvant = useRef<string | null>(null);
  if (refStadeAvant.current === null && stadeCourant !== null) {
    refStadeAvant.current = stadeCourant;
  }
  const [evolutionVue, fixerEvolutionVue] = useState(false);
  const evolution =
    stadeCourant !== null &&
    refStadeAvant.current !== null &&
    stadeCourant !== refStadeAvant.current &&
    !evolutionVue
      ? { avant: refStadeAvant.current, apres: stadeCourant }
      : null;

  const [chargementSuivant, fixerChargementSuivant] = useState(false);
  const allerAuSuivant = useCallback((): void => {
    if (suivant === null) return;
    effacerParticules();
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

  const continuerLaRegion = useCallback((): void => {
    if (continuerRegion === null) return;
    effacerParticules();
    fixerChargementSuivant(true);
    void lirePaquetNoeud(continuerRegion)
      .then((paquetSuivant) => {
        magasin.getState().cloreSortie();
        magasin.getState().demarrerNoeud(paquetSuivant);
      })
      .catch(() => {
        fixerChargementSuivant(false);
        magasin.getState().naviguer('carte');
      });
  }, [continuerRegion, magasin]);

  const terminerSortie = useCallback((): void => {
    effacerParticules();
    magasin.getState().cloreSortie();
    if (surFinSortie === undefined) {
      magasin.getState().naviguer('carte');
    } else {
      surFinSortie();
    }
  }, [magasin, surFinSortie]);

  return (
    <>
      {/* R6 — l'évolution passe DEVANT l'écran de récompense, elle ne s'y glisse pas au milieu.
          C'est le seul moment du jeu où le compagnon change ; le noyer entre les étoiles et la
          cascade le rendrait invisible une seconde fois. Un tap le referme (v2 § 8, « aucune
          animation bloquante »), et il ne revient pas — `evolutionVue` est à sens unique. */}
      {evolution === null ? null : (
        <EvolutionGobi
          avant={evolution.avant as never}
          apres={evolution.apres as never}
          libelle={
            (requeteStades.data ?? []).find((stade) => stade.code === evolution.apres)?.libelle ??
            'Gobi a changé'
          }
          animationsDesactivees={animationsDesactivees}
          surFin={() => {
            fixerEvolutionVue(true);
          }}
        />
      )}
    <main
      data-ecran="recompense"
      className="ecran-recompense"
      // Une seule valeur possible, aujourd'hui et toujours.
      data-fin="reussite"
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.35rem',
        alignItems: 'center',
        justifyContent: 'center',
        minBlockSize: '100dvh'
      }}
    >
      <section className="recompense-scene" data-scene-recompense="gobi-joie">
        <div className="recompense-gobi" aria-hidden="true">
          <span className="recompense-eclat recompense-eclat--un">✦</span>
          <span className="recompense-eclat recompense-eclat--deux">✦</span>
          <span className="recompense-eclat recompense-eclat--trois">✦</span>
          <img src={urlAsset('assets/gobi/animation/joie.webp')} alt="" draggable={false} />
        </div>

        <div className="recompense-texte" data-texte-recompense="immobile">
          <h1
            className="titre"
            data-victoire-region={regionTerminee ? 'oui' : 'non'}
            style={{ fontSize: '3rem', margin: 0, textAlign: 'center' }}
          >
            {regionTerminee ? `${nomRegion} est rallumée !` : 'Bravo !'}
          </h1>

          <Etoiles
            acquises={nombreEtoiles}
            taille={96}
            animees
            interEtoilesMs={paquet?.habillage.timings.interEtoilesMs ?? 180}
          />

          <p className="zone-lecture" style={{ fontSize: '1.5rem', padding: '1rem', margin: 0 }}>
            {regionTerminee
              ? `Tu as terminé tous les exercices de ${nomRegion}. La région brille de nouveau !`
              : FELICITATIONS[nombreEtoiles] ?? FELICITATIONS[1]}
          </p>
        </div>
      </section>

      {/* La continuité de jeu vient immédiatement après la célébration. Les explications sur les
          étoiles et les gains restent juste dessous, mais ne peuvent plus repousser l'action
          principale hors du premier écran sur téléphone ou tablette. */}
      <div className="actions-recompense" data-actions-recompense="oui">
        {suivant === null ? null : (
          <button
            type="button"
            className="cible action-recompense action-recompense--principale"
            data-action="exercice-suivant"
            data-noeud-suivant={String(suivant)}
            disabled={chargementSuivant}
            onClick={allerAuSuivant}
          >
            {chargementSuivant ? 'On y va…' : 'On y va !'}
          </button>
        )}
        {continuerRegion === null ? null : (
          <button
            type="button"
            className="cible action-recompense action-recompense--principale"
            data-action="continuer-region"
            data-noeud-suivant={String(continuerRegion)}
            disabled={chargementSuivant}
            onClick={continuerLaRegion}
          >
            {chargementSuivant ? 'On y va…' : `Continuer ${nomRegion}`}
          </button>
        )}
        {finDeSortie ? (
          <button
            type="button"
            className={`cible action-recompense${continuerRegion === null && !regionTerminee ? ' action-recompense--principale' : ''}`}
            data-action="fin-sortie"
            onClick={terminerSortie}
          >
            Au campement !
          </button>
        ) : null}
        {regionTerminee ? null : (
          <button
            type="button"
            className={`cible action-recompense${suivant === null && !finDeSortie ? ' action-recompense--principale' : ''}`}
            onClick={rejouer}
          >
            Encore une fois
          </button>
        )}
        <button
          type="button"
          data-action="voir-carte"
          className={`cible action-recompense${regionTerminee ? ' action-recompense--principale' : ''}`}
          onClick={retourCarte}
        >
          Voir la carte
        </button>
      </div>

      {/*
        ══════════════════════════════════════════════════════════════════════════════════════
        R4 — « j'ai eu qu'une seule étoile alors que tout est bon ppk ? »

        Le barème avait raison. Relevé dans son journal :

            clairiere-01   nb_erreurs = 2   aide_utilisee = indice   etoiles = 1

        `calculerEtoiles` rend `1 + sansAide + sansErreur` : deux erreurs et une aide donnent
        bien une étoile. **Le défaut n'était pas le calcul, c'était le SILENCE.** La couleur
        fautive s'écoule (D16), l'image finit juste, et l'enfant conclut « tout est bon ». Rien
        ne reliait son étoile unique à ce qui s'était passé.

        ── CE QUI REND CE BLOC DIFFICILE, ET COMMENT IL S'EN SORT ────────────────────────────
        « Aucun écran d'échec, jamais » et « l'aide de Gobi ne coûte rien et n'est JAMAIS
        présentée comme un échec ». Un tableau « raté / réussi » violerait les deux.

        Alors ce bloc ne dit jamais ce qui a manqué : il dit CE QU'OUVRE chaque étoile, au
        présent pour celles qui sont là, et comme une porte ouverte pour les autres. Pas de
        « tu as fait 2 erreurs », pas de rouge, pas de croix. Les étoiles non acquises portent
        leur condition, et c'est tout : l'enfant apprend la règle du jeu au lieu de recevoir
        une note.

        Et la ligne de Gobi est retournée exprès : quand il a aidé, on le dit comme un fait
        heureux — c'est gratuit, il peut redemander. Jamais comme la raison d'une étoile en
        moins.
        ══════════════════════════════════════════════════════════════════════════════════════
      */}
      {resume === null ? null : (
        <ul
          data-detail-etoiles="oui"
          className="recompense-detail-etoiles"
        >
          {detailDesEtoiles(resume).map((ligne) => (
            <li
              key={ligne.rang}
              data-etoile-detail={String(ligne.rang)}
              data-acquise={ligne.acquise ? 'oui' : 'non'}
              className="recompense-detail-etoile"
            >
              <span aria-hidden="true" className="recompense-detail-signe">
                ★
              </span>
              <span className="recompense-detail-texte">{ligne.texte}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────────
          LA CASCADE DE D25 REMPLACE LE SEUL DÉCOMPTE D'ÉTOILES.

          Les étoiles ci-dessus disent ce que ce nœud-ci valait ; la cascade dit où en est
          l'enfant dans le système qui le motive déjà à l'école — étoile, tampon spécial,
          image. Et surtout elle montre **le vide restant** (D25, point 3), qui est la seule
          partie de tout cet écran qui donne envie de recommencer.

          `null` tant que les seuils ne sont pas chargés : aucune jauge inventée, aucun
          nombre en dur (convention C2). */}
      <CascadeRecompense gain={dernierGain} />

      {compagnonRallie === null && objetRapporte === null ? null : (
        <section
          className="recompense-region-acquis"
          data-recompenses-region="oui"
          aria-label="Les cadeaux de la région"
        >
          <h2>Ta bande et ton campement grandissent !</h2>
          <div className="recompense-region-acquis__cartes">
            {compagnonRallie === null ? null : (
              <article
                className="recompense-region-acquis__carte"
                data-compagnon-rallie={String(compagnonRallie.code)}
              >
                <img
                  src={urlAsset(String(compagnonRallie.asset))}
                  alt=""
                  draggable={false}
                />
                <p><strong>{compagnonRallie.libelle}</strong> rejoint ta bande !</p>
              </article>
            )}
            {objetRapporte === null ? null : (
              <article
                className="recompense-region-acquis__carte"
                data-objet-rapporte={String(objetRapporte.code)}
              >
                <DessinButin code={String(objetRapporte.code)} taille={112} />
                <p><strong>{objetRapporte.libelle}</strong> rejoint le campement !</p>
              </article>
            )}
          </div>
        </section>
      )}

      {nomsRegionsOuvertes.length === 0 ? null : (
        <p
          className="zone-lecture"
          data-nouvelle-region={nomsRegionsOuvertes.join('|')}
          style={{ fontSize: '1.35rem', padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}
        >
          {nomsRegionsOuvertes.length === 1
            ? `Une nouvelle région s’ouvre : ${nomsRegionsOuvertes[0]} !`
            : `De nouvelles régions s’ouvrent : ${nomsRegionsOuvertes.join(', ')} !`}
        </p>
      )}

      {progressionRegionale === null ? null : (
        <p
          className="zone-lecture"
          data-progression-regionale="oui"
          style={{ fontSize: '1.35rem', padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}
        >
          {texteProgressionRegionale(
            finDeSortie,
            progressionRegionale.termines,
            progressionRegionale.total
          )}
          {String(progressionRegionale.termines)}{' '}
          {progressionRegionale.termines === 1 ? 'exercice terminé' : 'exercices terminés'} sur{' '}
          {String(progressionRegionale.total)} dans cette région.
        </p>
      )}

    </main>
    </>
  );
}
