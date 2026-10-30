// La voix de Gobi passe par le réglage du foyer — décision du parent du 9 oct. 2026.
//
// « De ce que j'ai vu avec mon fils, il faut que faire écouter, ou en tout cas parler, ce soit
// par défaut à false. » Le jeu est un jeu de LECTURE : une voix qui lit à sa place retire à
// l'enfant ce qu'il est venu faire. Le réglage `boutonEcouter` du foyer (`parent/reglages-foyer.ts`)
// devient donc l'interrupteur de TOUTE parole : le bouton « Écouter », les répliques de Gobi au
// campement, les consignes des maths. Éteint par défaut ; le parent le rallume dans sa zone.
//
// Coupé à UN SEUL endroit, le fournisseur de voix : aucun appelant n'a à y penser. Quand la voix
// est éteinte, `aUnClip` rend `false`, donc chaque bouton « Écouter » se masque de lui-même (D42),
// et `dire` se tait sans erreur.
import type { DemandeVoix, FournisseurVoix } from '@pierre/partage';

export function brancherReglageVoix<V extends FournisseurVoix>(voix: V, voixPermise: () => boolean): V {
  return new Proxy(voix, {
    get(cible, propriete, recepteur) {
      if (propriete === 'dire') {
        return (demande: DemandeVoix): Promise<void> => (voixPermise() ? cible.dire(demande) : Promise.resolve());
      }
      if (propriete === 'direSequence' && cible.direSequence !== undefined) {
        const sequence = cible.direSequence.bind(cible);
        return (demandes: readonly DemandeVoix[]): Promise<void> =>
          (voixPermise() ? sequence(demandes) : Promise.resolve());
      }
      if (propriete === 'aUnClip') {
        return (cle: Parameters<FournisseurVoix['aUnClip']>[0]): boolean => voixPermise() && cible.aUnClip(cle);
      }
      const valeur: unknown = Reflect.get(cible, propriete, recepteur);
      return typeof valeur === 'function' ? (valeur as (...a: unknown[]) => unknown).bind(cible) : valeur;
    }
  });
}
