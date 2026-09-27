/** Les exports/imports ne traversent jamais une écriture d'activité encore en vol. */
export function creerBarriereActivites() {
  let phase: 'ouverte' | 'preparation' | 'fermee' = 'ouverte';
  const enCours = new Set<Promise<unknown>>();
  const nonConfirmees = new Set<string>();
  return {
    async ecrire<T>(cle: string, action: () => Promise<T>,
      options: { readonly nonConfirmee?: (resultat: T) => boolean;
        readonly erreurIndeterminee?: (cause: unknown) => boolean } = {}): Promise<T> {
      // La préparation suspend la lecture et écrit son instantané. Ces producteurs restent
      // ouverts jusqu'à la fermeture ; les nouveaux gestes maths sont déjà exclus.
      if (phase === 'fermee' || (phase === 'preparation' && !cle.startsWith('lecture:'))) {
        throw new Error('Une sauvegarde est en cours. Réessaie après sa fin.');
      }
      const suivie = (async (): Promise<T> => {
        try {
          const resultat = await Promise.resolve().then(action);
          if (options.nonConfirmee?.(resultat)) nonConfirmees.add(cle);
          else nonConfirmees.delete(cle);
          return resultat;
        } catch (cause) {
          if (options.erreurIndeterminee?.(cause) ?? true) nonConfirmees.add(cle);
          else nonConfirmees.delete(cle);
          throw cause;
        }
      })();
      // La protection attend la classification « confirmé ou non », pas seulement le réseau.
      enCours.add(suivie);
      try { return await suivie; }
      finally { enCours.delete(suivie); }
    },
    async proteger<T>(action: () => Promise<T>, preparer: () => Promise<void> = async () => undefined): Promise<T> {
      if (phase !== 'ouverte') throw new Error('Une sauvegarde est déjà en cours.');
      phase = 'preparation';
      try {
        await preparer();
        phase = 'fermee';
        await Promise.allSettled([...enCours]);
        if (nonConfirmees.size > 0) throw new Error('Une activité attend encore sa confirmation. Réessaie sa sauvegarde avant de continuer.');
        return await action();
      } finally { phase = 'ouverte'; }
    },
    oublier(prefixe: string): void {
      for (const cle of nonConfirmees) if (cle.startsWith(prefixe)) nonConfirmees.delete(cle);
    },
  };
}
