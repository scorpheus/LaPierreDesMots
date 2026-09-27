/** Adaptateur de domaine partagé par HTTP et SQLite autonome. */
import type { Horloge } from '../../horloge.js';
import type { PortApiMaths, ResultatApiMaths } from '../../mathematiques/index.js';
import type { Base } from '../contrat.js';
import {
  ErreurMathematiques, choisirNiveauMaths, creerPartieMaths, creerProjetMaths, lireBilanParentMaths,
  lireEtatMaths, lirePartieMaths, manipulerPartieMaths, mettreEnPausePartieMaths, terminerPartieMaths,
} from './mathematiques.js';

async function resultat<T>(action: () => Promise<T>): Promise<ResultatApiMaths<T>> {
  try { return { ok: true, valeur: await action() }; }
  catch (cause) {
    if (!(cause instanceof ErreurMathematiques)) throw cause;
    return { ok: false, erreur: cause.code === 'conflit'
      ? { code: cause.code, revisionCourante: cause.revisionCourante ?? 0, message: cause.message }
      : { code: cause.code, message: cause.message } };
  }
}

export function creerApiMathematiques(base: () => Promise<Base>, horloge: Horloge): PortApiMaths {
  return {
    lireEtat: (profil) => resultat(async () => lireEtatMaths(await base(), profil)),
    choisirNiveau: (commande) => resultat(async () => choisirNiveauMaths(await base(), horloge, commande)),
    creerPartie: (commande) => resultat(async () => creerPartieMaths(await base(), horloge, commande)),
    creerProjet: (commande) => resultat(async () => creerProjetMaths(await base(), horloge, commande)),
    lirePartie: (profil, instance) => resultat(async () => {
      const reprise = await lirePartieMaths(await base(), profil, instance);
      if (reprise === null) throw new ErreurMathematiques('absente', 'Cette partie est introuvable.');
      return reprise;
    }),
    manipuler: (commande) => resultat(async () => manipulerPartieMaths(await base(), horloge, commande)),
    pause: (commande) => resultat(async () => mettreEnPausePartieMaths(await base(), horloge, commande)),
    terminer: (commande) => resultat(async () => terminerPartieMaths(await base(), horloge, commande)),
    lireBilanParent: (profil) => resultat(async () => lireBilanParentMaths(await base(), profil)),
  };
}
