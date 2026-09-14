import type { Profil, ReponseTentative, TentativeAEnregistrer } from '@pierre/partage';
import { calculerCleIdempotence, ErreurReseau } from './commun.js';

export type TentativeSansCle = Omit<TentativeAEnregistrer, 'cleIdempotence'>;

type Stockage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;
interface OptionsFile {
  readonly prefixe: string;
  readonly stockage: () => Stockage;
  readonly envoyer: (tentative: TentativeAEnregistrer) => Promise<ReponseTentative>;
  readonly calculerCle?: typeof calculerCleIdempotence;
}

/** Une entrée par clé : deux onglets ne réécrivent jamais une liste commune. */
export function creerFileTentatives({ prefixe, stockage, envoyer, calculerCle = calculerCleIdempotence }: OptionsFile) {
  const envois = new Map<string, Promise<ReponseTentative>>();
  const cleSuspension = `${prefixe}import-suspendu`;
  const prefixePreparation = `${prefixe}sans-cle:`;
  const messageImport = 'Un import a été interrompu. Les tentatives en attente sont conservées sans être rejouées. Réimporte le fichier choisi depuis l’espace parent.';

  function messageSuspension(): string | null {
    return stockage().getItem(cleSuspension) === null ? null : messageImport;
  }

  function exigerRepriseAutorisee(): void {
    if (messageSuspension() !== null) throw new Error(messageImport);
  }

  function clePreparation(tentative: TentativeSansCle): string {
    return prefixePreparation + encodeURIComponent(JSON.stringify([
      tentative.profil, tentative.noeud, tentative.demarreLe, tentative.graine, tentative.generationProgression
    ]));
  }

  /** Appelée dans la pile du dernier geste, avant toute publication de l'écran de réussite. */
  function conserver(tentative: TentativeSansCle): void {
    exigerRepriseAutorisee();
    if (!estTentativeTerminee({ ...tentative, cleIdempotence: 'preparation' })) {
      throw new Error('Seule une tentative réellement terminée peut être conservée.');
    }
    const reserve = stockage();
    const cle = clePreparation(tentative);
    const texte = serialiser(tentative);
    const precedente = reserve.getItem(cle);
    if (precedente !== null && precedente !== texte) {
      throw new Error('Le résumé de cette tentative terminée a changé. La copie précédente est conservée.');
    }
    reserve.setItem(cle, texte);
  }

  function lirePreparations(): readonly TentativeSansCle[] {
    const reserve = stockage();
    return Array.from({ length: reserve.length }, (_, rang) => reserve.key(rang))
      .filter((cle): cle is string => cle !== null && cle.startsWith(prefixePreparation))
      .map((cle) => {
        const valeur: unknown = JSON.parse(reserve.getItem(cle) ?? 'null');
        if (typeof valeur !== 'object' || valeur === null ||
            !estTentativeTerminee({ ...valeur, cleIdempotence: 'preparation' }) ||
            cle !== clePreparation(valeur as TentativeSansCle)) {
          throw new Error('Une tentative préparée est illisible. Elle reste conservée sans être envoyée.');
        }
        return valeur as TentativeSansCle;
      });
  }

  function lire(): readonly TentativeAEnregistrer[] {
    const reserve = stockage();
    const cles = Array.from({ length: reserve.length }, (_, index) => reserve.key(index))
      .filter((cle): cle is string => cle !== null && cle.startsWith(prefixe) &&
        cle !== cleSuspension && !cle.startsWith(prefixePreparation));
    return cles.map((cle) => {
      const texte = reserve.getItem(cle);
      if (texte === null) return null;
      const valeur: unknown = JSON.parse(texte);
      if (!estTentativeTerminee(valeur) || cle !== prefixe + valeur.cleIdempotence) {
        throw new Error('Une tentative en attente est illisible. Elle a été conservée sans être envoyée.');
      }
      return valeur;
    }).filter((tentative): tentative is TentativeAEnregistrer => tentative !== null);
  }

  function retirer(tentative: TentativeAEnregistrer): void {
    const reserve = stockage();
    const cle = prefixe + tentative.cleIdempotence;
    const complete = reserve.getItem(cle);
    if (complete !== null && serialiser(JSON.parse(complete)) === serialiser(tentative)) reserve.removeItem(cle);
    const cleAvantCalcul = clePreparation(tentative);
    const preparee = reserve.getItem(cleAvantCalcul);
    const sansCle = Object.fromEntries(Object.entries(tentative).filter(([champ]) => champ !== 'cleIdempotence'));
    if (preparee !== null && serialiser(JSON.parse(preparee)) === serialiser(sansCle)) reserve.removeItem(cleAvantCalcul);
  }

  function enregistrer(tentative: TentativeAEnregistrer): Promise<ReponseTentative> {
    if (!estTentativeTerminee(tentative)) {
      return Promise.reject(new Error('Seule une tentative terminée et liée à sa génération peut être conservée.'));
    }
    const cle = tentative.cleIdempotence;
    try { exigerRepriseAutorisee(); }
    catch (cause) { return Promise.reject(cause); }
    // Synchrone : la copie existe avant le premier appel réseau/SQLite et avant tout await.
    try {
      const reserve = stockage();
      const texte = serialiser(tentative);
      const preparee = reserve.getItem(clePreparation(tentative));
      const sansCle = Object.fromEntries(Object.entries(tentative).filter(([champ]) => champ !== 'cleIdempotence'));
      if (preparee !== null && serialiser(JSON.parse(preparee)) !== serialiser(sansCle)) {
        throw new Error('La charge à envoyer diffère du résultat conservé au dernier geste.');
      }
      const precedente = reserve.getItem(prefixe + cle);
      if (precedente !== null && serialiser(JSON.parse(precedente)) !== texte) {
        throw new Error('Deux tentatives différentes portent la même clé de sauvegarde.');
      }
      reserve.setItem(prefixe + cle, texte);
    } catch (cause) {
      return Promise.reject(new Error('La tentative ne peut pas être conservée sur cet appareil. Réessaie sans fermer la page.', { cause }));
    }
    const enCours = envois.get(cle);
    if (enCours !== undefined) return enCours;
    const promesse = Promise.resolve().then(() => envoyer(tentative)).then((reponse) => {
      const accuse = reponse.tentative;
      if (accuse.cleIdempotence !== cle || accuse.profil !== tentative.profil ||
          accuse.noeud !== tentative.noeud || accuse.exercice !== tentative.exercice ||
          accuse.moteur !== tentative.moteur || accuse.habillage !== tentative.habillage ||
          accuse.graine !== tentative.graine || accuse.demarreLe !== tentative.demarreLe ||
          accuse.termineLe !== tentative.termineLe ||
          accuse.resume.reussi !== tentative.resume.reussi ||
          accuse.resume.nbErreurs !== tentative.resume.nbErreurs ||
          accuse.resume.aideUtilisee !== tentative.resume.aideUtilisee ||
          accuse.resume.dureeMs !== tentative.resume.dureeMs) {
        throw new Error('L’accusé de réception ne correspond pas à la tentative conservée.');
      }
      try { retirer(tentative); }
      catch (cause) {
        // L'ACK fait foi malgré une panne du nettoyage. Le reliquat sera un rejeu idempotent.
        console.warn('[tentative] acquise, mais copie locale encore présente :', cause);
      }
      return reponse;
    }).catch((cause: unknown) => {
      if (cause instanceof ErreurReseau && (cause.statut === 404 ||
          cause.corps?.['code'] === 'generation-progression-perimee')) {
        retirer(tentative);
      }
      throw cause;
    }).finally(() => { envois.delete(cle); });
    envois.set(cle, promesse);
    return promesse;
  }

  async function reprendre(profil: Profil): Promise<number> {
    exigerRepriseAutorisee();
    let enregistrees = 0;
    for (const tentative of lirePreparations().filter((entree) => entree.profil === profil.id)) {
      if (profil.generationProgression === undefined) throw new Error('La génération du profil doit être connue avant la reprise.');
      if (tentative.generationProgression !== profil.generationProgression) {
        stockage().removeItem(clePreparation(tentative));
        continue;
      }
      try { if (await reprendrePreparation(tentative)) enregistrees += 1; }
      catch (cause) {
        if (cause instanceof ErreurReseau && (cause.statut === 404 ||
            cause.corps?.['code'] === 'generation-progression-perimee')) continue;
        throw cause;
      }
    }
    for (const tentative of lire().filter((entree) => entree.profil === profil.id)) {
      // Un ancien serveur sans marqueur ne peut pas autoriser une reprise différée.
      if (profil.generationProgression === undefined) {
        throw new Error('La reprise attend un serveur qui connaît la génération du profil.');
      }
      if (tentative.generationProgression !== profil.generationProgression) {
        retirer(tentative);
        continue;
      }
      try { await enregistrer(tentative); enregistrees += 1; }
      catch (cause) {
        // Suppression/reset intervenu depuis la lecture du profil : abandon sans crédit.
        if (cause instanceof ErreurReseau && (cause.statut === 404 ||
            cause.corps?.['code'] === 'generation-progression-perimee')) continue;
        throw cause;
      }
    }
    return enregistrees;
  }

  async function vider(): Promise<void> {
    exigerRepriseAutorisee();
    for (const tentative of lirePreparations()) await reprendrePreparation(tentative);
    for (const tentative of lire()) await enregistrer(tentative);
    if (lire().length + lirePreparations().length > 0) throw new Error('Des tentatives attendent encore leur sauvegarde. Réessaie avant d’exporter.');
  }

  async function reprendrePreparation(tentative: TentativeSansCle): Promise<boolean> {
    const cleIdempotence = await calculerCle(String(tentative.profil), String(tentative.noeud),
      tentative.demarreLe, tentative.graine);
    // Un ACK concurrent ou un import peut avoir retiré cette préparation pendant le calcul.
    if (stockage().getItem(clePreparation(tentative)) !== serialiser(tentative)) return false;
    await enregistrer({ ...tentative, cleIdempotence });
    return true;
  }

  function oublier(profil?: string): void {
    for (const tentative of lirePreparations()) {
      if (profil === undefined || tentative.profil === profil) stockage().removeItem(clePreparation(tentative));
    }
    for (const tentative of lire()) {
      if (profil === undefined || tentative.profil === profil) retirer(tentative);
    }
  }

  async function remplacerDonnees<T>(remplacer: () => Promise<T>): Promise<T> {
    // Écrit avant le remplacement. Après une fermeture ambiguë, aucune ancienne tentative
    // ne peut atteindre la base restaurée. Une erreur connue conserve la file de départ.
    const suspensionPrecedente = stockage().getItem(cleSuspension);
    stockage().setItem(cleSuspension, 'oui');
    await Promise.allSettled([...envois.values()]);
    let resultat: T;
    try { resultat = await remplacer(); }
    catch (cause) {
      if (suspensionPrecedente === null) stockage().removeItem(cleSuspension);
      throw cause;
    }
    try {
      oublier();
      stockage().removeItem(cleSuspension);
    } catch (cause) {
      // La base a bien été remplacée ; prétendre l'import refusé mentirait au parent.
      // Le marqueur conservé affiche la marche à suivre et interdit les reprises anciennes.
      console.warn('[tentative] import réussi, attentes encore isolées :', cause);
    }
    return resultat;
  }

  return { conserver, enregistrer, reprendre, vider, oublier, lire, lirePreparations, remplacerDonnees, messageSuspension };
}

/** L'ordre des propriétés JSON ne change pas l'identité du résumé sauvegardé. */
function serialiser(valeur: unknown): string {
  return JSON.stringify(valeur, (_cle, contenu: unknown) => {
    if (contenu === null || typeof contenu !== 'object' || Array.isArray(contenu)) return contenu;
    return Object.fromEntries(Object.entries(contenu).sort(([a], [b]) => a.localeCompare(b)));
  });
}

function estTentativeTerminee(valeur: unknown): valeur is TentativeAEnregistrer {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const tentative = valeur as Partial<TentativeAEnregistrer>;
  return ['cleIdempotence', 'profil', 'noeud', 'exercice', 'moteur', 'habillage', 'demarreLe', 'termineLe']
    .every((champ) => typeof (valeur as Record<string, unknown>)[champ] === 'string'
      && String((valeur as Record<string, unknown>)[champ]).length > 0)
    && Number.isSafeInteger(tentative.graine)
    && Number.isSafeInteger(tentative.generationProgression)
    && (tentative.generationProgression ?? -1) >= 0
    && tentative.resume?.reussi === true;
}
