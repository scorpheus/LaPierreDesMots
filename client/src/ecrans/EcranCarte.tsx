import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CodeCompagnon, CodeRegion, Compagnon, EtatMonde, IdNoeud } from '@pierre/partage';
import type { PlanSortie } from '@pierre/partage/pedagogie';
import { conclusionCentraleAccessible, regionsOuvertes } from '@pierre/partage/monde';
import { composerSortie, lireMonde, lirePaquetNoeud, lireProgression, urlAsset } from '../api/client.js';
import { useEtatJeu, useMagasin, useServices } from '../etat/services.js';
import { repriseDeRegion } from '../monde/reprise.js';
import { CarteMonde } from '../monde/carte/CarteMonde.js';
import { ChoixCompagnon } from '../monde/carte/ChoixCompagnon.js';
import { VueRegion } from '../monde/carte/VueRegion.js';
import { ANCRES_CARTE, interieurDuSvg, libelleDeRegion, SVG_CARTE } from '../monde/carte/modele.js';
import type { DestinationRegion } from '../monde/carte/modele.js';
import '../styles/carte.css';

export { interieurDuSvg } from '../monde/carte/modele.js';

export interface ProprietesEcranCarte {
  readonly surAllerCampement?: () => void;
  readonly surVoirOuverture?: () => void;
}

interface DepartDemande {
  readonly region: CodeRegion;
  readonly noeud: IdNoeud;
  readonly libelle: string;
}

type ErreurDepart =
  | { readonly type: 'revisite'; readonly region: CodeRegion; readonly noeud: IdNoeud }
  | { readonly type: 'sortie'; readonly depart: DepartDemande; readonly compagnon: CodeCompagnon | null };

export function EcranCarte({
  surAllerCampement,
  surVoirOuverture
}: ProprietesEcranCarte = {}): ReactElement {
  const magasin = useMagasin();
  const services = useServices();
  const profil = useEtatJeu((etat) => etat.profil);
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);
  const [regionChoisie, fixerRegionChoisie] = useState<CodeRegion | null>(null);
  const [departDemande, fixerDepartDemande] = useState<DepartDemande | null>(null);
  const [compagnonChoisi, fixerCompagnonChoisi] = useState<CodeCompagnon | null>(null);
  const [conclusionOuverte, fixerConclusionOuverte] = useState(false);
  const [regionEnChargement, fixerRegionEnChargement] = useState<CodeRegion | null>(null);
  const [erreurDepart, fixerErreurDepart] = useState<ErreurDepart | null>(null);
  const demandeActive = useRef(0);

  useEffect(() => () => {
    demandeActive.current += 1;
  }, []);

  const annulerDemande = useCallback((): void => {
    demandeActive.current += 1;
    fixerRegionEnChargement(null);
    fixerDepartDemande(null);
    fixerErreurDepart(null);
  }, []);

  const requeteMonde = useQuery({
    queryKey: ['monde', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) throw new Error('Monde demandé sans profil choisi.');
      return lireMonde(profil.id);
    },
    enabled: profil !== null
  });
  const requeteProgression = useQuery({
    queryKey: ['progression', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) throw new Error('Progression demandée sans profil choisi.');
      return lireProgression(profil.id);
    },
    enabled: profil !== null
  });
  const requeteDecor = useQuery({
    queryKey: ['carte', 'decor'],
    queryFn: async () => {
      const reponse = await fetch(urlAsset(SVG_CARTE), { headers: { Accept: 'image/svg+xml' } });
      if (!reponse.ok) throw new Error(`Décor de carte introuvable (${String(reponse.status)}).`);
      return interieurDuSvg(await reponse.text());
    }
  });

  const monde: EtatMonde | null = requeteMonde.data ?? null;
  const regions = monde?.carte.regions ?? [];
  const noeudsAcquis = useMemo(
    () => new Set((requeteProgression.data ?? []).filter((ligne) => ligne.etoiles > 0).map((ligne) => String(ligne.noeud))),
    [requeteProgression.data]
  );
  const parCode = useMemo(
    () => new Map(regions.map((region) => [String(region.region), region])),
    [regions]
  );
  const recommandables = useMemo(
    () => new Set(monde === null ? [] : regionsOuvertes(monde.carte).map(String)),
    [monde]
  );
  const compagnons = useMemo<readonly Compagnon[]>(
    () => (monde?.compagnons ?? []).filter((compagnon) => compagnon.rallieLe !== null),
    [monde]
  );

  const destinationDe = useCallback((code: CodeRegion): DestinationRegion | null => {
    const region = parCode.get(String(code));
    if (region === undefined) return null;
    const reprise = repriseDeRegion(region.noeuds, noeudsAcquis);
    return {
      region,
      libelle: libelleDeRegion(code),
      noeud: reprise.noeud,
      rang: reprise.rang,
      conseillee: recommandables.has(String(code)),
      noeudsAcquis,
      jouable: region.ouverte
    };
  }, [noeudsAcquis, parCode, recommandables]);

  const destination = regionChoisie === null ? null : destinationDe(regionChoisie);
  const prochainDeblocage = useMemo(() => {
    const verrouillee = [...regions]
      .sort((a, b) => a.ordre - b.ordre)
      .find((region) => !region.ouverte && region.noeuds.length > 0);
    if (verrouillee === undefined) return null;
    const active = regions.find((region) => region.ouverte && region.pourcentageColorie < 1);
    if (active === undefined) return { restant: null };
    return { restant: active.noeuds.filter((noeud) => !noeudsAcquis.has(String(noeud))).length };
  }, [noeudsAcquis, regions]);

  const demanderDepart = useCallback((code: CodeRegion): void => {
    const destinationCourante = destinationDe(code);
    if (
      destinationCourante === null ||
      !destinationCourante.jouable ||
      destinationCourante.noeud === null ||
      regionEnChargement !== null
    ) return;
    fixerErreurDepart(null);
    fixerDepartDemande({
      region: code,
      noeud: destinationCourante.noeud,
      libelle: destinationCourante.libelle
    });
    fixerCompagnonChoisi(compagnons[0]?.code ?? null);
  }, [compagnons, destinationDe, regionEnChargement]);

  const ouvrirRevisite = useCallback((code: CodeRegion, noeud: IdNoeud): void => {
    const destinationCourante = destinationDe(code);
    if (destinationCourante === null || !destinationCourante.jouable || regionEnChargement !== null) return;
    const identifiant = demandeActive.current + 1;
    demandeActive.current = identifiant;
    fixerErreurDepart(null);
    fixerRegionEnChargement(code);
    void lirePaquetNoeud(noeud)
      .then((paquet) => {
        if (demandeActive.current !== identifiant) return;
        magasin.getState().demarrerNoeud(paquet);
      })
      .catch(() => {
        if (demandeActive.current !== identifiant) return;
        fixerErreurDepart({ type: 'revisite', region: code, noeud });
      })
      .finally(() => {
        if (demandeActive.current === identifiant) fixerRegionEnChargement(null);
      });
  }, [destinationDe, magasin, regionEnChargement]);

  const entrer = useCallback((depart: DepartDemande, compagnon: CodeCompagnon | null): void => {
    if (profil === null || regionEnChargement !== null) return;
    const identifiant = demandeActive.current + 1;
    demandeActive.current = identifiant;
    fixerErreurDepart(null);
    fixerRegionEnChargement(depart.region);
    void (async () => {
      try {
        const plan = await composerSortie(profil.id, { region: String(depart.region), compagnon });
        const premiere = plan.etapes[0];
        if (premiere === undefined) throw new Error('La sortie composée ne porte aucune étape.');
        const paquet = await lirePaquetNoeud(premiere.noeud);
        if (demandeActive.current !== identifiant) return;
        magasin.getState().demarrerSortie(plan);
        magasin.getState().demarrerNoeud(paquet);
      } catch {
        try {
          const paquet = await lirePaquetNoeud(depart.noeud);
          if (demandeActive.current !== identifiant) return;
          const plan: PlanSortie = {
            profil: profil.id,
            region: depart.region,
            compagnon,
            etapes: [{ rang: 1, role: 'synthese', noeud: paquet.noeud.id, habillage: paquet.habillage.id, competences: paquet.exercice.competences, revisions: [] }],
            composeeLe: services.horloge.maintenant()
          };
          magasin.getState().demarrerSortie(plan);
          magasin.getState().demarrerNoeud(paquet);
        } catch {
          if (demandeActive.current !== identifiant) return;
          fixerDepartDemande(null);
          fixerErreurDepart({ type: 'sortie', depart, compagnon });
        }
      } finally {
        if (demandeActive.current === identifiant) fixerRegionEnChargement(null);
      }
    })();
  }, [magasin, profil, regionEnChargement, services]);

  const confirmerDepart = useCallback((): void => {
    if (departDemande === null) return;
    const depart = departDemande;
    entrer(depart, compagnonChoisi);
  }, [compagnonChoisi, departDemande, entrer]);

  const reessayerDepart = useCallback((): void => {
    if (erreurDepart === null) return;
    if (erreurDepart.type === 'revisite') {
      ouvrirRevisite(erreurDepart.region, erreurDepart.noeud);
      return;
    }
    entrer(erreurDepart.depart, erreurDepart.compagnon);
  }, [entrer, erreurDepart, ouvrirRevisite]);

  const quitterCarte = useCallback((): void => {
    annulerDemande();
    surAllerCampement?.();
  }, [annulerDemande, surAllerCampement]);

  return (
    <main data-ecran="carte" className="ecran-carte">
      <header className="entete-carte">
        <div><h1 className="titre">La carte du monde</h1></div>
        <div className="entete-carte__actions">
          <button type="button" className="cible cible-secondaire" data-vers="campement" aria-label="Revenir au campement" onClick={quitterCarte}>Le campement</button>
          <button type="button" className="cible cible-secondaire" aria-label="Changer de joueur" onClick={() => { annulerDemande(); magasin.getState().quitterProfil(); }}>Changer de joueur</button>
        </div>
      </header>
      {regionChoisie !== null && destination !== null ? (
        <>
          <VueRegion destination={destination} surRetour={() => { annulerDemande(); fixerRegionChoisie(null); }} surContinuer={demanderDepart} surRevisiter={ouvrirRevisite} />
          {regionEnChargement === null ? null : <p role="status" data-depart-en-cours="oui">On prépare les sacs…</p>}
          {erreurDepart === null ? null : <section className="zone-lecture" data-depart-refuse="oui" role="status">
            <p>La Pierre n’a pas répondu. On réessaie ?</p>
            <button type="button" className="cible" onClick={reessayerDepart}>Réessayer</button>
          </section>}
        </>
      ) : <>
        <section className="introduction-carte" aria-label="Choisir une destination">
          <div>
            {profil === null ? null : <p>Bonjour {String(profil.prenom)} ! Le monde t’attend en gris : tu peux lui rendre ses couleurs.</p>}
            {prochainDeblocage === null ? null : <p data-prochain-deblocage="oui">La prochaine région s’ouvrira quand la région actuelle sera entièrement coloriée.{prochainDeblocage.restant === null ? '' : ` Il reste ${String(prochainDeblocage.restant)} exercice${prochainDeblocage.restant > 1 ? 's' : ''} à découvrir.`}</p>}
          </div>
          {surVoirOuverture === undefined ? null : <button type="button" className="cible cible-secondaire" data-vers="ouverture" aria-label="Écouter l’histoire de la Pierre" onClick={surVoirOuverture}>L’histoire de la Pierre</button>}
        </section>
        <section className="carte-monde" aria-label="Carte du monde">
          <CarteMonde regions={regions} decorSvg={requeteDecor.data} animationsDesactivees={animationsDesactivees} conclusionAccessible={monde !== null && conclusionCentraleAccessible(monde.carte)} surChoisirRegion={fixerRegionChoisie} surChoisirConclusion={() => fixerConclusionOuverte(true)} />
          <div className="carte-monde__legende">
            <h2 className="titre">Où veux-tu aller ?</h2>
            {monde !== null && conclusionCentraleAccessible(monde.carte) ? <button type="button" className="cible carte-monde__destination" data-depart-conclusion="pierre" onClick={() => fixerConclusionOuverte(true)}>La Pierre t’attend !<span>Va au centre.</span></button> : null}
            {ANCRES_CARTE.map(([code, , , libelle]) => {
              const destinationListe = destinationDe(code);
              if (
                destinationListe === null ||
                !destinationListe.jouable ||
                (!destinationListe.conseillee && destinationListe.noeudsAcquis.size === 0)
              ) return null;
              return <button key={String(code)} type="button" className="cible carte-monde__destination" data-depart={String(code)} data-etape={`${String(destinationListe.rang)}/${String(destinationListe.region.noeuds.length)}`} onClick={() => fixerRegionChoisie(code)}>{libelle}<span data-restant={String(Math.round((1 - destinationListe.region.pourcentageColorie) * 100))} /></button>;
            })}
          </div>
        </section>
      </>}
      {conclusionOuverte ? <section className="choix-compagnon" data-conclusion-pierre="oui" role="dialog" aria-modal="true" aria-labelledby="titre-conclusion-pierre"><div className="choix-compagnon__carte"><h2 id="titre-conclusion-pierre" className="titre">La Pierre des Mots est entière !</h2><button type="button" className="cible cible-appel" onClick={() => fixerConclusionOuverte(false)}>Revoir la carte</button></div></section> : null}
      {departDemande === null ? null : <ChoixCompagnon codeDestination={String(departDemande.region)} destination={departDemande.libelle} stadeGobi={String(monde?.gobi.stade ?? '')} compagnons={compagnons} choisi={compagnonChoisi} enChargement={regionEnChargement !== null} animationsDesactivees={animationsDesactivees} surChoisir={fixerCompagnonChoisi} surRetour={annulerDemande} surPartir={confirmerDepart} />}
    </main>
  );
}
