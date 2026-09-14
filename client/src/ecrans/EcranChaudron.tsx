/**
 * Activité libre du chaudron — une activité du campement, pas un nœud pédagogique.
 *
 * Elle réutilise le geste de coloriage du moteur `libre`, mais garde son état local : aucune
 * tentative, étoile, cascade ou récompense ne peut donc entrer dans le journal de l’enfant.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { campementDuDocument } from '@pierre/partage/monde';
import { initialiserRegistreMoteurs, obtenirMoteur } from '@pierre/partage';
import type { ActionLibre, ContenuLibre, EtatLibre, IdNoeud, Moteur, PaquetNoeud } from '@pierre/partage';
import { useQuery } from '@tanstack/react-query';
import { lirePaquetNoeud, urlAsset } from '../api/client.js';
import { useEtatJeu, useServices } from '../etat/services.js';
import type { ServicesJeu } from '../moteurs/types.js';
import { INVITE_LIBRE, MoteurLibre } from '../moteurs/libre/MoteurLibre.js';
import { effacerParticules } from '../gamefeel/particules.js';
import { BoutonEcouter } from '../composants/BoutonEcouter.js';
import { EnteteActivite } from '../composants/activite/EnteteActivite.js';
import { variablesHabillage } from '../habillages/chargeur.js';
import '../styles/activites.css';

export interface ProprietesEcranChaudron {
  /** Paquet injecté par les tests ; en production le contenu du campement fournit la destination. */
  readonly paquet?: PaquetNoeud | null;
  readonly surRetour: () => void;
}

async function chargerJson(chemin: string): Promise<unknown> {
  const reponse = await fetch(urlAsset(chemin), { headers: { Accept: 'application/json' } });
  if (!reponse.ok) throw new Error(`Contenu introuvable : ${chemin}.`);
  return (await reponse.json()) as unknown;
}

function moteurLibre(): Moteur<ContenuLibre, EtatLibre, ActionLibre> {
  // Les tests de composant montent l’écran sans passer par main.tsx.
  initialiserRegistreMoteurs();
  return obtenirMoteur('libre') as Moteur<ContenuLibre, EtatLibre, ActionLibre>;
}

/** Le chaudron n’est pas une réponse correcte : il n’émet aucun retour de récompense. */
function servicesSansRetour(services: ServicesJeu): ServicesJeu {
  return {
    ...services,
    retour: {
      ...services.retour,
      depotCorrect: async () => undefined,
      depotRefuse: async () => undefined,
      palierFranchi: async () => undefined,
      reinitialiserSerie: () => undefined,
    },
  };
}

export function EcranChaudron({ paquet: paquetInjecte = null, surRetour }: ProprietesEcranChaudron): ReactElement {
  const services = useServices();
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);
  const moteur = useMemo(moteurLibre, []);
  const servicesLocaux = useMemo(() => servicesSansRetour(services), [services]);
  const requetePaquet = useQuery({
    queryKey: ['chaudron', 'paquet'],
    queryFn: async () => {
      const campement = campementDuDocument(await chargerJson('monde/campement.json'));
      const noeud: IdNoeud | null = campement.coloriageLibre;
      if (noeud === null) throw new Error('Le chaudron n’a pas de coloriage déclaré.');
      return lirePaquetNoeud(noeud);
    },
    enabled: paquetInjecte === null,
    retry: false,
  });
  const paquet = paquetInjecte ?? requetePaquet.data ?? null;
  const styleHabillage = useMemo(
    () => paquet === null ? {} : variablesHabillage(paquet.habillage),
    [paquet],
  );
  const [etat, fixerEtat] = useState<EtatLibre | null>(null);
  const finDejaTraitee = useRef(false);

  useEffect(() => {
    if (paquet === null || paquet.exercice.jeu.moteur !== 'libre') {
      fixerEtat(null);
      finDejaTraitee.current = false;
      return;
    }
    const contenu = paquet.exercice.jeu.contenu as ContenuLibre;
    fixerEtat(moteur.creerEtat({
      contenu,
      habillage: paquet.habillage,
      alea: servicesLocaux.alea,
      horloge: servicesLocaux.horloge,
    }));
    finDejaTraitee.current = false;
    // Une gerbe née sur l’écran précédent ne doit pas traverser l’entrée du chaudron.
    effacerParticules();
  }, [moteur, paquet, servicesLocaux]);

  useEffect(() => {
    if (etat === null || !moteur.progression(etat).termine || finDejaTraitee.current) return;
    finDejaTraitee.current = true;
    surRetour();
  }, [etat, moteur, surRetour]);

  const emettre = useCallback((action: ActionLibre): void => {
    fixerEtat((courant) => courant === null ? null : moteur.reduire(courant, action, {
      alea: servicesLocaux.alea,
      horloge: servicesLocaux.horloge,
    }));
  }, [moteur, servicesLocaux]);

  if (paquet === null || etat === null) {
    return (
      <main data-ecran="chaudron" data-activite="libre" className="activite-indisponible">
        <button type="button" className="cible" data-vers="campement" onClick={surRetour}>← Le campement</button>
        <p className="zone-lecture" role="status">{requetePaquet.isError ? 'Le chaudron est indisponible pour le moment.' : 'Le chaudron prépare ses couleurs…'}</p>
      </main>
    );
  }

  return (
    <main data-ecran="chaudron" data-activite="libre" className="ecran-activite ecran-chaudron" style={styleHabillage}>
      <EnteteActivite
        className="entete-chaudron"
        destination="campement"
        libelleRetour="Le campement"
        nomRetour="← Le campement"
        surRetour={surRetour}
        ecoute={<BoutonEcouter texte={INVITE_LIBRE} cle={`${paquet.exercice.id}/c1`} />}
      >
        <h1 className="titre activite-titre">Le chaudron à couleurs</h1>
        <p className="activite-consigne-texte">{INVITE_LIBRE}</p>
      </EnteteActivite>
      <div className="activite-chaudron cadre-scene-activite">
        <MoteurLibre
          contenu={paquet.exercice.jeu.contenu as ContenuLibre}
          habillage={paquet.habillage}
          etat={etat}
          emettre={emettre}
          services={servicesLocaux}
          animationsDesactivees={animationsDesactivees}
        />
      </div>
    </main>
  );
}
