import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IdProfil } from '@pierre/partage';
import { CATALOGUE_MATHS, type LieuMaths, type NiveauMaths, type TentativeMaths } from '@pierre/partage/mathematiques';
import { apiMathematiques } from '../api/client.js';
import { enregistrerConseilParentMaths } from '../mathematiques/conseil-parent.js';
import './suivi-mathematiques.css';

const NIVEAUX: Readonly<Record<NiveauMaths, string>> = { decouverte: 'Découverte', exploration: 'Exploration', defi: 'Défi' };
const LIEUX: Readonly<Record<LieuMaths, string>> = { jardin: 'Jardin', ponts: 'Ponts', moulin: 'Moulin', marche: 'Marché', chantier: 'Chantier', horloge: 'Horloge' };
const STATUTS = { essaye: 'Essayé', 'reussi-avec-aide': 'Réussi avec aide', 'reussi-seul': 'Réussi seul' } as const;

function lieuDe(famille: TentativeMaths['famille']): LieuMaths {
  const entree = CATALOGUE_MATHS.find((catalogue) => catalogue.id === famille);
  if (entree === undefined) throw new Error(`Famille maths inconnue : ${famille}`);
  return entree.lieu;
}
function titreDe(famille: TentativeMaths['famille']): string {
  return CATALOGUE_MATHS.find((catalogue) => catalogue.id === famille)?.titre ?? famille;
}
function termineLe(tentative: TentativeMaths): string {
  const date = 'termineLe' in tentative ? tentative.termineLe : undefined;
  return typeof date === 'string' && date.length > 0 ? date : 'Date non disponible';
}
function telechargerJson(profil: IdProfil, bilan: unknown, tentatives: readonly TentativeMaths[]): void {
  const contenu = JSON.stringify({ format: 'pierre-maths-parent-v1', profilId: profil, bilan, tentatives }, null, 2);
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json;charset=utf-8' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `pierre-maths-${String(profil)}.json`;
  lien.hidden = true;
  document.body.append(lien);
  try { lien.click(); } finally { lien.remove(); URL.revokeObjectURL(url); }
}

/** Observations du journal maths, sans estimation de maîtrise ni recommandation automatique. */
export function SuiviMathematiques({ profil }: { readonly profil: IdProfil }): ReactElement {
  const [filtreLieu, fixerFiltreLieu] = useState<LieuMaths | 'tous'>('tous');
  const [filtreNiveau, fixerFiltreNiveau] = useState<NiveauMaths | 'tous'>('tous');
  const [messageConseil, fixerMessageConseil] = useState<string | null>(null);
  const bilan = useQuery({
    queryKey: ['parent', 'mathematiques', 'bilan', String(profil)],
    queryFn: async () => {
      const resultat = await apiMathematiques.lireBilanParent(String(profil));
      if (!resultat.ok) throw new Error('Le bilan de maths ne peut pas être lu.');
      return resultat.valeur;
    },
  });
  const historique = useQuery({
    queryKey: ['parent', 'mathematiques', 'tentatives', String(profil)],
    queryFn: async () => {
      const resultat = await apiMathematiques.lireEtat(String(profil));
      if (!resultat.ok) throw new Error('Les réussites de maths ne peuvent pas être lues.');
      return resultat.valeur;
    },
  });
  const etatMaths = historique.data;
  const tentatives = etatMaths?.tentatives ?? [];
  const visibles = useMemo(() => tentatives.filter((tentative) =>
    (filtreLieu === 'tous' || lieuDe(tentative.famille) === filtreLieu) &&
    (filtreNiveau === 'tous' || tentative.niveau === filtreNiveau),
  ), [filtreLieu, filtreNiveau, tentatives]);
  const exportPossible = bilan.isSuccess && historique.isSuccess;
  const avecAide = visibles.filter((tentative) => tentative.aide !== 'aucune').length;
  const avecCorrections = visibles.filter((tentative) => tentative.erreursValidees > 0).length;

  return <section aria-label="Suivi des mathématiques" className="panneau-parent suivi-maths">
    <header className="suivi-maths__entete"><div><h2>Le carnet de maths</h2>
      <p>Les réussites montrent l’activité et le niveau choisis. Elles décrivent ce qui s’est passé, sans attribuer de niveau de maîtrise.</p></div>
      <button type="button" className="cible" disabled={!exportPossible}
        onClick={() => { if (bilan.data !== undefined && etatMaths !== undefined) telechargerJson(profil, bilan.data, etatMaths.tentatives); }}>
        Télécharger le journal maths (JSON)
      </button>
    </header>
    {!exportPossible && !bilan.isError && !historique.isError ? <p className="suivi-maths__attente">Le téléchargement sera prêt après les deux lectures du carnet.</p> : null}
    {bilan.isPending || historique.isPending ? <p role="status">Lecture du carnet…</p> : null}
    {bilan.isError || historique.isError ? <div className="suivi-maths__erreur"><p role="status">Le carnet de maths ne s’ouvre pas pour le moment. Les données ne sont pas remplacées par un carnet vide.</p>
      <button type="button" className="cible" onClick={() => { void bilan.refetch(); void historique.refetch(); }}>Réessayer</button></div> : null}
    {bilan.data !== undefined && bilan.data.length > 0 ? <div className="suivi-maths__tableau"><table><caption>Observations par activité et niveau</caption><thead><tr>
      <th scope="col">Activité</th><th scope="col">Niveau</th><th scope="col">Observation</th><th scope="col">Parties commencées</th><th scope="col">Réussites</th><th scope="col">Réponses à corriger</th><th scope="col">Parties avec aide</th><th scope="col">Choix parent</th>
    </tr></thead><tbody>{bilan.data.map((ligne) => <tr key={`${ligne.famille}:${ligne.niveau}`}>
      <th scope="row">{titreDe(ligne.famille)}</th><td>{NIVEAUX[ligne.niveau]}</td><td>{STATUTS[ligne.statut]}</td><td>{ligne.occasions}</td><td>{ligne.reussites}</td><td>{ligne.erreursValidees}</td><td>{ligne.aides}</td><td><button type="button" className="cible cible-secondaire" disabled={etatMaths === undefined} onClick={() => {
        if (etatMaths === undefined) return;
        const statut = enregistrerConseilParentMaths(String(profil), { famille: ligne.famille, niveau: ligne.niveau, generationMaths: etatMaths.generationMaths });
        fixerMessageConseil(statut === 'enregistre' ? 'Choix enregistré sur cet appareil.' : 'Le choix ne peut pas être enregistré sur cet appareil.');
      }}>Travailler ceci</button></td>
    </tr>)}</tbody></table></div> : null}
    {messageConseil === null ? null : <p role="status" className="suivi-maths__attente">{messageConseil}</p>}
    {historique.isSuccess ? <section className="suivi-maths__historique" aria-label="Historique des réussites maths">
      <div className="suivi-maths__filtres"><label>Lieu <select value={filtreLieu} onChange={(event) => fixerFiltreLieu(event.target.value as LieuMaths | 'tous')}>
        <option value="tous">Tous les lieux</option>{(Object.keys(LIEUX) as LieuMaths[]).map((lieu) => <option key={lieu} value={lieu}>{LIEUX[lieu]}</option>)}
      </select></label><label>Niveau <select value={filtreNiveau} onChange={(event) => fixerFiltreNiveau(event.target.value as NiveauMaths | 'tous')}>
        <option value="tous">Tous les niveaux</option>{(Object.keys(NIVEAUX) as NiveauMaths[]).map((niveau) => <option key={niveau} value={niveau}>{NIVEAUX[niveau]}</option>)}
      </select></label></div>
      {tentatives.length === 0 ? <p>Aucune réussite de maths enregistrée pour ce profil.</p> : null}
      {tentatives.length > 0 && visibles.length === 0 ? <p>Aucune réussite ne correspond à ces filtres.</p> : null}
      {visibles.length > 0 ? <><div className="suivi-maths__conseils" aria-label="Repères pour le parent"><h3>Repères pour en parler</h3>
        {avecAide > 0 ? <p>{`${String(avecAide)} réussite(s) affichée(s) ont utilisé l’aide de Gobi : elle montre un appui demandé, sans jugement.`}</p> : <p>Les réussites affichées ont été terminées sans aide de Gobi.</p>}
        {avecCorrections > 0 ? <p>{`${String(avecCorrections)} réussite(s) affichée(s) ont eu des réponses corrigées avant la fin. Tu peux demander à l’enfant de raconter le geste qu’il a recommencé.`}</p> : <p>Aucune réponse corrigée n’est inscrite pour ces réussites affichées.</p>}
      </div><div className="suivi-maths__tableau"><table><caption>Réussites enregistrées</caption><thead><tr>
        <th scope="col">Terminé le</th><th scope="col">Lieu</th><th scope="col">Activité</th><th scope="col">Niveau</th><th scope="col">Aide</th><th scope="col">Étoiles</th>
      </tr></thead><tbody>{visibles.map((tentative) => <tr key={tentative.id}>
        <td>{termineLe(tentative)}</td><td>{LIEUX[lieuDe(tentative.famille)]}</td><th scope="row">{titreDe(tentative.famille)}</th><td>{NIVEAUX[tentative.niveau]}</td><td>{tentative.aide === 'aucune' ? 'Sans aide' : tentative.aide === 'indice' ? 'Indice de Gobi' : 'Démonstration de Gobi'}</td><td aria-label={`${String(tentative.etoiles)} étoiles`}>{'★'.repeat(tentative.etoiles)}</td>
      </tr>)}</tbody></table></div></> : null}
    </section> : null}
  </section>;
}
