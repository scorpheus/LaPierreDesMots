import type { GesteMaths, InstanceVallee } from '@pierre/partage/mathematiques';

/** Met en mots le geste déjà proposé par le moteur, sans choisir de geste ni modifier l'état. */
export function descriptionGesteMaths(instance: InstanceVallee, geste: GesteMaths | null): string | null {
  if (geste === null) return null;
  if (geste.type === 'annuler') return 'Annule ton dernier geste.';
  if (geste.type === 'ecouter') return 'Écoute de nouveau Gobi.';
  if (geste.type === 'aide') return 'Demande de l’aide à Gobi.';

  switch (instance.famille) {
    case 'MAT-PON-01': {
      const morceaux = instance.parametres.segmentsTrajet;
      if (morceaux && geste.type === 'choisir') {
        const rang = morceaux.findIndex((morceau) => morceau.id === geste.objetId);
        return rang < 0 ? null : `Choisis le morceau ${rang === 0 ? 'A' : 'B'} pour le mesurer.`;
      }
      if (geste.type === 'aligner-regle') return morceaux
        ? `Place le zéro de la règle au départ du morceau choisi, sur ${geste.origine} cm.`
        : `Place le zéro de la règle sous le repère ${geste.origine} cm.`;
      if (geste.type === 'lire-longueur') return `Lis ${geste.valeur} cm sur la règle.`;
      if (geste.type === 'choisir' || geste.type === 'retirer') {
        const index = instance.parametres.choix.findIndex((planche) => planche.id === geste.objetId);
        if (index < 0) return null;
        const planche = instance.parametres.choix[index]!;
        return geste.type === 'choisir'
          ? `Choisis la planche ${index + 1}, longue de ${planche.longueur} cm.`
          : `Retire la planche ${index + 1}, longue de ${planche.longueur} cm.`;
      }
      return null;
    }
    case 'MAT-PON-02': {
      if (geste.type === 'placer-borne') return `Place une borne sur la graduation ${geste.position}.`;
      if (geste.type === 'montrer-encadrement') {
        return `Choisis ${geste.inferieure} comme borne basse et ${geste.superieure} comme borne haute.`;
      }
      if (geste.type === 'retirer') {
        const valeur = nombreApres(geste.objetId, 'borne:');
        return valeur === null ? null : `Retire la borne posée sur ${valeur}.`;
      }
      return null;
    }
    case 'MAT-PON-03': {
      if (geste.type !== 'placer-piece' && geste.type !== 'retirer') return null;
      if (geste.type === 'retirer' && geste.objetId === instance.parametres.reparation?.moduleEndommageId) {
        return 'Retire le module abîmé du pont.';
      }
      const piece = instance.parametres.pieces.find((candidate) => candidate.id === geste.objetId);
      if (!piece) return null;
      return geste.type === 'placer-piece'
        ? `Pose la pièce de ${piece.longueur} cm à partir de ${geste.position} cm sur le pont.`
        : `Retire la pièce de ${piece.longueur} cm du pont.`;
    }
    case 'MAT-JAR-01': {
      const fruits = instance.parametres.uniteObjet === 'fruit';
      const noms: Record<string, string> = fruits
        ? { unite: 'un fruit', dizaine: 'une caisse de dix fruits', centaine: 'une réserve de cent fruits' }
        : { unite: 'une graine', dizaine: 'une botte de dix graines', centaine: 'un sac de cent graines' };
      if (geste.type === 'placer' || geste.type === 'retirer') {
        const nom = noms[geste.objetId];
        return !nom ? null : `${geste.type === 'placer' ? 'Ajoute' : 'Retire'} ${nom}.`;
      }
      if (geste.type !== 'choisir') return null;
      const choix: Record<string, string> = fruits ? {
        'echanger-unites': 'Échange dix fruits contre une caisse de dix.',
        'echanger-dizaines': 'Échange dix caisses contre une réserve de cent fruits.',
        'defaire-dizaine': 'Défais une caisse de dix en dix fruits.',
        'defaire-centaine': 'Défais une réserve en dix caisses.',
        'garder-decomposition': 'Garde cette façon de représenter les fruits.',
      } : {
        'echanger-unites': 'Échange dix graines contre une botte de dix.',
        'echanger-dizaines': 'Échange dix bottes contre un sac de cent.',
        'defaire-dizaine': 'Défais une botte en dix graines.',
        'defaire-centaine': 'Défais un sac en dix bottes.',
        'garder-decomposition': 'Garde cette façon de représenter les graines.',
      };
      return choix[geste.objetId] ?? null;
    }
    case 'MAT-JAR-02': {
      if (geste.type !== 'placer' && geste.type !== 'retirer') return null;
      const lieu = geste.objetId === 'part-a' ? 'la première plate-bande'
        : geste.objetId === 'part-b' ? 'l’autre découpage de la plate-bande' : null;
      return lieu === null ? null : `${geste.type === 'placer' ? 'Couvre' : 'Découvre'} une part de ${lieu}.`;
    }
    case 'MAT-JAR-03': {
      const caisse = instance.parametres.fruitsParUnite === 10;
      const unite = caisse ? 'caisse de dix fruits' : 'fruit';
      const categories = instance.parametres.categories.map((categorie) => categorie.id);
      if (geste.type === 'placer') {
        if (geste.objetId.startsWith('fruit:')) {
          const source = geste.objetId.slice(6);
          if (!categories.includes(source) || !geste.destination || !categories.includes(geste.destination)) return null;
          return `Déplace ${caisse ? 'une' : 'un'} ${unite} du panier ${source} vers le panier ${geste.destination}.`;
        }
        const champ = champRecolte(geste.objetId, categories);
        if (!champ) return null;
        if (geste.destination === 'valeur') {
          return champ.colonne === 'table'
            ? `Choisis ${geste.position} dans le tableau pour ${champ.categorie} (${unite}${geste.position > 1 ? 's' : ''}).`
            : `Règle la barre de ${champ.categorie} à ${geste.position} ${unite}${geste.position > 1 ? 's' : ''}.`;
        }
        return `Ajoute une unité à ${champ.colonne === 'table' ? 'la valeur du tableau' : 'la barre'} de ${champ.categorie}.`;
      }
      if (geste.type === 'retirer') {
        const champ = champRecolte(geste.objetId, categories);
        return champ ? `Retire une unité de ${champ.colonne === 'table' ? 'la valeur du tableau' : 'la barre'} de ${champ.categorie}.` : null;
      }
      if (geste.type === 'choisir' && geste.objetId.startsWith('lecture:')) {
        const categorie = geste.objetId.slice(8);
        return categories.includes(categorie) ? `Choisis le panier ${categorie} comme le plus rempli.` : null;
      }
      return null;
    }
    case 'MAT-MOU-01': {
      if (geste.type !== 'placer' && geste.type !== 'retirer' && geste.type !== 'choisir') return null;
      const roue = /^(?:roue|pale):([ab])(?::(\d+))?$/.exec(geste.objetId);
      if (!roue) return null;
      const montage = roue[1] === 'a' ? 'premier montage' : 'autre montage';
      if (roue[2] === undefined) return geste.type === 'choisir'
        ? `Ajoute une roue au ${montage}.` : geste.type === 'retirer' ? `Retire la dernière roue du ${montage}.` : null;
      const rang = Number(roue[2]) + 1;
      return geste.type === 'placer' ? `Ajoute une pale à la roue ${rang} du ${montage}.`
        : geste.type === 'retirer' ? `Retire une pale de la roue ${rang} du ${montage}.` : null;
    }
    case 'MAT-MOU-02': {
      if (geste.type === 'choisir' && geste.objetId === 'ajouter-sac') return 'Ajoute un sac à la première distribution.';
      if (geste.type === 'retirer' && geste.objetId === 'dernier-sac') return 'Retire le dernier sac vide de la première distribution.';
      if (geste.type !== 'placer' && geste.type !== 'retirer') return null;
      const sac = /^sac:([ab]):(\d+)$/.exec(geste.objetId);
      if (!sac) return null;
      const lieu = sac[1] === 'a' ? 'première distribution' : 'autre distribution';
      return geste.type === 'placer'
        ? `Verse une mesure dans le sac ${Number(sac[2]) + 1} de la ${lieu}.`
        : `Reprends une mesure du sac ${Number(sac[2]) + 1} de la ${lieu}.`;
    }
    case 'MAT-MOU-03': {
      if (geste.type !== 'placer' && geste.type !== 'retirer') return null;
      const lieu = geste.objetId === 'secteur-a' ? 'premier réglage'
        : geste.objetId === 'secteur-b' ? 'second réglage du même réservoir' : null;
      return lieu === null ? null : `${geste.type === 'placer' ? 'Ouvre' : 'Ferme'} une part dans le ${lieu}.`;
    }
    case 'MAT-MAR-01':
    case 'MAT-MAR-02': {
      if (geste.type === 'choisir') {
        const choix: Record<string, string> = {
          echanger: 'Échange dix pièces de 1 € contre un billet de 10 €.',
          'convertir-centimes': 'Échange deux pièces de 50 c contre une pièce de 1 €.',
          memoriser: 'Garde cette première façon de payer.',
        };
        return choix[geste.objetId] ?? null;
      }
      if (geste.type !== 'placer' && geste.type !== 'retirer') return null;
      const piece = instance.parametres.pieces.find((candidate) => candidate.id === geste.objetId);
      if (!piece) return null;
      const lieu = geste.type === 'placer' ? placeMarche(geste.destination) : null;
      if (geste.type === 'placer' && !lieu) return null;
      return geste.type === 'placer' ? `Place ${piece.etiquette} dans ${lieu}.` : `Retire ${piece.etiquette}.`;
    }
    case 'MAT-MAR-03': {
      if (geste.type === 'choisir') {
        if (geste.objetId === 'memoriser') return 'Garde ce premier panier pour le comparer à l’autre.';
        const comparaison: Record<string, string> = {
          'comparaison:premier': 'Choisis le premier panier pour le reste le plus grand.',
          'comparaison:second': 'Choisis le second panier pour le reste le plus grand.',
          'comparaison:egal': 'Choisis « même reste » pour les deux paniers.',
        };
        return comparaison[geste.objetId] ?? null;
      }
      if (geste.type !== 'placer' && geste.type !== 'retirer') return null;
      const article = instance.parametres.articles.find((candidate) => candidate.id === geste.objetId);
      if (!article) return null;
      if (geste.type === 'placer' && geste.destination !== 'panier') return null;
      return geste.type === 'placer' ? `Mets ${article.nom} dans le panier.` : `Retire ${article.nom} du panier.`;
    }
    case 'MAT-CHA-01': {
      if (geste.type !== 'placer' && geste.type !== 'retirer') return null;
      const index = nombreApres(geste.objetId, 'sommet-');
      if (index === null || index < 0 || index > 3) return null;
      const nom = 'ABCD'[index];
      const grille = instance.parametres.grille;
      return geste.type === 'placer'
        ? `Place le sommet ${nom} au point ${geste.position % grille}, ${Math.floor(geste.position / grille)} du quadrillage.`
        : `Retire le sommet ${nom} du quadrillage.`;
    }
    case 'MAT-CHA-02': {
      if (geste.type !== 'placer' && geste.type !== 'retirer') return null;
      const face = /^face:([ab]):(\d+)$/.exec(geste.objetId);
      if (!face) return null;
      const rang = Number(face[2]) + 1;
      const patron = face[1]!.toUpperCase();
      return geste.type === 'placer'
        ? `Place la face ${rang} du patron ${patron} dans la case ${geste.position % 6}, ${Math.floor(geste.position / 6)}.`
        : `Retire la face ${rang} du patron ${patron}.`;
    }
    case 'MAT-CHA-03': {
      if (geste.type === 'choisir') {
        return geste.objetId === 'gauche' ? 'Choisis le plateau gauche.'
          : geste.objetId === 'droite' ? 'Choisis le plateau droit.' : null;
      }
      if (geste.type !== 'placer' && geste.type !== 'retirer') return null;
      const poids = instance.parametres.poids.find((candidate) => candidate.id === geste.objetId);
      if (!poids) return null;
      const plateau = geste.type === 'placer' ? geste.destination : null;
      if (geste.type === 'placer' && plateau !== 'gauche' && plateau !== 'droite') return null;
      return geste.type === 'placer' ? `Pose le poids de ${poids.etiquette} sur le plateau ${plateau}.`
        : `Retire le poids de ${poids.etiquette}.`;
    }
    case 'MAT-HOR-01': {
      if (geste.type === 'placer') {
        if (geste.objetId === 'aiguille-heures') {
          return `Place la petite aiguille sur ${geste.position === 0 ? 12 : geste.position}.`;
        }
        if (geste.objetId === 'aiguille-minutes') {
          return `Place la grande aiguille sur ${String(geste.position).padStart(2, '0')} minutes.`;
        }
      }
      if (geste.type === 'choisir') return moment(geste.objetId);
      return null;
    }
    case 'MAT-HOR-02': {
      if (geste.type === 'placer' && (geste.objetId === 'ruban-a' || geste.objetId === 'ruban-b')) {
        return `Fais partir le ruban ${geste.objetId === 'ruban-a' ? 'A' : 'B'} à ${heure(geste.position)}.`;
      }
      if (geste.type !== 'choisir') return null;
      const arrivee = nombreApres(geste.objetId, 'arrivee:');
      if (arrivee !== null) return `Choisis ${heure(arrivee)} comme heure d’arrivée.`;
      if (geste.objetId === 'trajet:principal') return 'Choisis le trajet fait avec tes rubans.';
      if (geste.objetId === 'trajet:alternative') return 'Choisis l’autre trajet.';
      return null;
    }
    case 'MAT-HOR-03': {
      if (geste.type !== 'placer' && geste.type !== 'choisir' && geste.type !== 'retirer') return null;
      const trajet = instance.parametres.trajets.find((candidate) => candidate.id === geste.objetId);
      if (!trajet) return null;
      const nom = `le trajet vers ${trajet.destination} (départ ${heure(trajet.departMinutes)}, arrivée ${heure(trajet.arriveeMinutes)})`;
      if (geste.type === 'choisir') return `Choisis ${nom}.`;
      if (geste.type === 'retirer') return `Retire ${nom} du tableau.`;
      const [destination, momentId] = (geste.destination ?? '').split('|');
      const momentTexte = momentCourt(momentId);
      return destination && momentTexte ? `Place ${nom} dans la case ${destination}, ${momentTexte}.` : null;
    }
  }
}

function nombreApres(identifiant: string, debut: string): number | null {
  if (!identifiant.startsWith(debut)) return null;
  const suite = identifiant.slice(debut.length);
  return /^\d+$/.test(suite) ? Number(suite) : null;
}

function champRecolte(identifiant: string, categories: readonly string[]): { colonne: 'table' | 'barre'; categorie: string } | null {
  const deuxPoints = identifiant.indexOf(':');
  if (deuxPoints < 0) return null;
  const colonne = identifiant.slice(0, deuxPoints);
  const categorie = identifiant.slice(deuxPoints + 1);
  return (colonne === 'table' || colonne === 'barre') && categories.includes(categorie)
    ? { colonne, categorie } : null;
}

function placeMarche(destination: string | undefined): string | null {
  if (destination === 'caisse') return 'la caisse';
  if (destination === 'donne') return 'les pièces données';
  if (destination === 'rendu') return 'la monnaie rendue';
  return null;
}

function heure(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;
}

function momentCourt(id: string | undefined): string | null {
  if (id === 'matin') return 'matin';
  if (id === 'apres-midi') return 'après-midi';
  if (id === 'soir') return 'soir';
  return null;
}

function moment(id: string): string | null {
  const nom = momentCourt(id);
  return nom ? `Choisis ${nom} comme moment de la journée.` : null;
}
