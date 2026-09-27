import type { ReactElement } from 'react';
import { CATALOGUE_MATHS, PROJETS_MATHS, FETE_MATHS, trameProjetMaths,
  type EtatMaths, type FamilleMaths, type LieuMaths, type NiveauMaths, type ProjetMathsId } from '@pierre/partage/mathematiques';
import { DecorVallee } from './DecorVallee.js';
import { exempleNiveauMaths } from './exemples-niveaux.js';
import { LIEUX_MATHS, NIVEAUX_MATHS, NOM_NIVEAU_MATHS, incompatibiliteProjet, nomProjet, premiersNiveaux } from './presentation.js';

const INVITATIONS: Readonly<Record<FamilleMaths, string>> = {
  'MAT-JAR-01': 'Compte les graines et range-les en groupes.',
  'MAT-JAR-02': 'Partage le jardin en parts de même taille.',
  'MAT-JAR-03': 'Compte les fruits et remplis le carnet.',
  'MAT-PON-01': 'Mesure les planches avec ta règle.',
  'MAT-PON-02': 'Place les nombres sur la rive.',
  'MAT-PON-03': 'Mets les pièces bout à bout pour faire le pont.',
  'MAT-MOU-01': 'Monte les roues qui font tourner le moulin.',
  'MAT-MOU-02': 'Partage la farine entre les sacs.',
  'MAT-MOU-03': 'Ouvre le passage pour donner de l’eau au moulin.',
  'MAT-MAR-01': 'Compte les pièces et prépare la caisse.',
  'MAT-MAR-02': 'Paie tes achats et trouve la monnaie à rendre.',
  'MAT-MAR-03': 'Choisis tes achats avec les pièces de ta bourse.',
  'MAT-CHA-01': 'Trace les formes sur le plan du village.',
  'MAT-CHA-02': 'Assemble six faces pour former un cube.',
  'MAT-CHA-03': 'Pèse les objets avec la balance.',
  'MAT-HOR-01': 'Place les aiguilles pour lire l’heure.',
  'MAT-HOR-02': 'Pose les rubans pour trouver l’heure d’arrivée.',
  'MAT-HOR-03': 'Range les trajets et choisis ton départ.',
};

export function LieuxVallee({ etat, surLieu, surFete }: {
  readonly etat: EtatMaths; readonly surLieu: (lieu: LieuMaths) => void; readonly surFete: () => void;
}): ReactElement {
  const termines = new Set(etat.projets.filter((p) => p.termineLe !== null).map((p) => p.projetId));
  const nombre = PROJETS_MATHS.filter((p) => termines.has(p.id)).length;
  return <section className="maths-lieux" data-testid="lieux-maths" aria-label="Les lieux de la vallée">
    <p className="maths-intro">Une vallée à réveiller avec Gobi. Choisis ton lieu : les jeux sont ouverts dès maintenant.</p>
    {LIEUX_MATHS.map((lieu) => <button key={lieu.id} type="button" data-testid={`lieu-${lieu.id}`}
      data-lieu-maths={lieu.id} data-disponibilite="jouable" className="maths-lieu" onClick={() => surLieu(lieu.id)}>
      <span aria-hidden="true">{lieu.image}</span><strong>{lieu.nom}</strong>
      <small>{PROJETS_MATHS.filter((p) => p.id.startsWith(`MAT-${lieu.prefixe}-`) && termines.has(p.id)).length} / 3 projets</small>
    </button>)}
    <section className="maths-fete" aria-label="La fête de la vallée">
      <h2>La fête des nombres</h2><p>{nombre} / 18 projets pour préparer la fête.</p>
      {nombre === 18 ? <><p>Les six lieux sont prêts. Gobi t’attend pour trois derniers jeux !</p>
        <button type="button" onClick={surFete}>{termines.has(FETE_MATHS.id) ? 'Rejouer la fête' : 'Préparer la fête'}</button></>
        : <p>Chaque projet garde sa trace ici. Tu peux jouer dans le lieu de ton choix.</p>}
    </section>
  </section>;
}

export function Niveau({ famille, niveau, surChoix, nom, attente = false }: {
  readonly famille: FamilleMaths; readonly niveau: NiveauMaths;
  readonly surChoix: (niveau: NiveauMaths) => void; readonly nom: string; readonly attente?: boolean;
}): ReactElement {
  return <fieldset className="maths-niveaux"><legend>{nom}</legend>{NIVEAUX_MATHS.map((choix) =>
    <button key={choix} type="button" aria-pressed={niveau === choix} disabled={attente}
      onClick={() => surChoix(choix)}>{NOM_NIVEAU_MATHS[choix]}</button>)}
    <p>Exemple : {exempleNiveauMaths(famille, niveau)}</p>
  </fieldset>;
}

export function ChoixLieuVallee({ lieu, etat, projetId, surProjetChoisi, niveauxProjet, surNiveauxProjet,
  niveauxLibres, surNiveauLibre, attente, surProjet, surLibre, surReprendreProjet, surLieux }: {
  readonly lieu: LieuMaths; readonly etat: EtatMaths; readonly projetId: ProjetMathsId;
  readonly surProjetChoisi: (id: ProjetMathsId) => void;
  readonly niveauxProjet: readonly [NiveauMaths, NiveauMaths, NiveauMaths];
  readonly surNiveauxProjet: (niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths]) => void;
  readonly niveauxLibres: Readonly<Record<FamilleMaths, NiveauMaths>>;
  readonly surNiveauLibre: (famille: FamilleMaths, niveau: NiveauMaths) => void;
  readonly attente: boolean; readonly surProjet: () => void; readonly surLibre: (famille: FamilleMaths) => void;
  readonly surReprendreProjet: () => void; readonly surLieux: () => void;
}): ReactElement {
  const description = LIEUX_MATHS.find((l) => l.id === lieu)!;
  const fete = projetId === FETE_MATHS.id;
  const projetsLieu = PROJETS_MATHS.filter((p) => p.id.startsWith(`MAT-${description.prefixe}-`));
  const finis = new Set(etat.projets.filter((p) => p.termineLe !== null).map((p) => p.projetId));
  const projet = trameProjetMaths(projetId);
  const rang = projetsLieu.findIndex((p) => p.id === projetId);
  const precedentFini = fete ? PROJETS_MATHS.every((p) => finis.has(p.id)) : rang <= 0 || finis.has(projetsLieu[rang - 1]!.id);
  const incompatibilite = incompatibiliteProjet(projetId, niveauxProjet);
  const progression = etat.projets.find((p) => p.projetId === projetId);
  const reprise = etat.projetSuspendu;
  return <section className="maths-ponts" data-testid={`lieu-${lieu}`}>
    <button type="button" className="cible cible-secondaire" onClick={surLieux}>Les six lieux</button>
    <DecorVallee lieu={lieu} projetsTermines={projetsLieu.filter((p) => finis.has(p.id)).length}>
      {lieu === 'ponts' && <PontDurable etapes={Math.max(0, ...etat.projets.filter((p) => p.projetId.startsWith('MAT-PON')).map((p) => p.etapesTerminees))} />}
    </DecorVallee>
    <p className="maths-intro">{fete ? 'Prépare les parts du goûter, les sacs à offrir et l’heure du rendez-vous.' : description.histoire}</p>
    {etat.recompenses.filter((r) => r.projetId.startsWith(`MAT-${description.prefixe}-`)).map((r) =>
      <p key={r.cadeauId} className="maths-souvenir" data-cadeau={r.cadeauId}>✦ {r.categorie === 'objet' ? 'Ton objet est au campement et dans le coffre.' : 'Ton souvenir est dans le coffre.'}</p>)}
    {reprise?.projet && <button type="button" className="cible cible-primaire" disabled={attente} onClick={surReprendreProjet}>
      Reprendre {nomProjet(reprise.projet.id)}, étape {reprise.projet.etapeCourante + 1}
    </button>}
    {!fete && <nav className="maths-livre-projets" aria-label="Les projets du lieu">{projetsLieu.map((p, index) =>
      <button type="button" key={p.id} aria-pressed={p.id === projetId} onClick={() => surProjetChoisi(p.id)}>
        <span aria-hidden="true">{finis.has(p.id) ? '✦' : index + 1}</span> {p.titre}
      </button>)}</nav>}
    <section className="maths-projet" aria-label={projet.titre}><h2>{projet.titre}</h2>
      {progression?.termineLe && <p className="maths-transformation" data-transformation={progression.transformationId}>
        ✦ {projet.transformation}. Ce projet reste accompli.</p>}
      <p>Choisis un niveau pour chacune des trois étapes.</p>
      {projet.etapes.map((familleId, index) => <Niveau key={`${familleId}-${index}`}
        famille={familleId} attente={attente}
        nom={`${index + 1}. ${familleId === 'MAT-PON-01' ? 'Mesurer les planches' : familleId === 'MAT-PON-03' ? 'Faire le tablier' : familleId === 'MAT-PON-02' ? 'Poser les bornes' : CATALOGUE_MATHS.find((f) => f.id === familleId)!.titre}`}
        niveau={niveauxProjet[index]!} surChoix={(niveau) => surNiveauxProjet(niveauxProjet.map((n, i) => i === index ? niveau : n) as unknown as readonly [NiveauMaths, NiveauMaths, NiveauMaths])} />)}
      {incompatibilite !== null && <p role="status" className="maths-incompatibilite">
        {projetId === 'MAT-PON-P01' ? 'Ces niveaux ne donnent pas une portée commune aux planches et au tablier. Choisis une autre combinaison.' : incompatibilite}
        {' '}Par exemple : {premiersNiveaux(projetId).map((niveau) => NOM_NIVEAU_MATHS[niveau]).join(', ')}.
      </p>}
      {!precedentFini && <p>Termine {fete ? 'les dix-huit projets' : projetsLieu[rang - 1]!.titre} pour continuer cette histoire. Les activités libres restent ouvertes.</p>}
      <button type="button" className="cible cible-primaire" onClick={surProjet} disabled={attente || incompatibilite !== null || !precedentFini}>
        {finis.has(projetId) ? 'Rejouer' : 'Commencer'} {projet.titre}
      </button>
    </section>
    {!fete && <section className="maths-familles" aria-label="Activités libres">{CATALOGUE_MATHS.filter((f) => f.lieu === lieu).map((famille) =>
      <article key={famille.id} id={`libre-${famille.id}`}><h2>{famille.titre}</h2><p>{INVITATIONS[famille.id]}</p>
        <Niveau famille={famille.id} attente={attente} nom={`Niveau de ${famille.titre}`} niveau={niveauxLibres[famille.id]} surChoix={(n) => surNiveauLibre(famille.id, n)} />
        <button type="button" onClick={() => surLibre(famille.id)} disabled={attente}>Essayer cette activité</button>
      </article>)}</section>}
  </section>;
}

export function PontDurable({ etapes }: { readonly etapes: number }): ReactElement | null {
  if (etapes < 2) return null;
  return <div className="maths-pont-durable" aria-hidden="true" data-pont-durable={etapes >= 3 ? 'borne' : 'tablier'}>
    <span className="maths-pont-durable__tablier" />
    {etapes >= 3 && <><span className="maths-pont-durable__borne" /><span className="maths-pont-durable__lanterne" /></>}
  </div>;
}
