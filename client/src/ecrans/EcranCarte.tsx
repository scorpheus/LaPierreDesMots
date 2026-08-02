// La carte du monde — l'élément signature de la v2 § 9.4. Lot L2-F.
//
// « Dessinée comme une carte au trésor sur parchemin, avec les régions conquises en couleur, les
// régions grises encore voilées d'un brouillard mouvant, et le chemin qui se dessine à l'encre au
// fur et à mesure. C'est l'écran qu'on ouvre en premier, celui qu'on montre à ses parents. »
//
// Quatre règles, et aucune n'est cosmétique :
//
//   1. **Une région voilée reste TAPABLE.** Le voile n'est pas un verrou : on peut toujours aller
//      voir. Ce qui n'est pas encore ouvert ne se joue pas, mais il se regarde, et l'écran le dit
//      avec une phrase — jamais avec un cadenas, jamais avec du rouge (R14).
//   2. **Le vide restant se montre.** La part non recoloriée de chaque région est ce que la carte
//      donne à voir (D25, point 3) : c'est le moteur de retour du jeu.
//   3. **Le décor s'agite, le texte jamais.** Le brouillard bouge ; les noms de région sont posés
//      sur parchemin et ne bougent pas (v2 § 9.3).
//   4. **Aucune géométrie n'est écrite deux fois.** Le dessin vient de
//      `contenu/habillages/carte/carte-monde.svg` (décor bouchon D2) ; cet écran n'y ajoute que
//      les prises tactiles et les états. Tant que l'asset n'est pas là, la carte annonce qu'elle
//      se déplie — jamais un écran d'erreur.
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CodeRegion, EtatMonde, EtatRegion, IdNoeud } from '@pierre/partage';
import { etatAfficheRegion, regionsOuvertes } from '@pierre/partage/monde';
import { lireMonde, lireProgression, lirePaquetNoeud, urlAsset } from '../api/client.js';
import { useEtatJeu, useMagasin } from '../etat/services.js';
import { CheminEncre } from '../monde/CheminEncre.js';
import { Parchemin } from '../monde/Parchemin.js';
import { VoileGrisaille } from '../monde/VoileGrisaille.js';

/**
 * Le chemin du décor de la carte, relatif à `contenu/`.
 *
 * ── PASSAGE À LA v2, fait à l'intégration de la campagne N ──────────────────────────────────
 * Cette ligne portait `carte-monde.svg`, la carte de la v1 : six hexagones identiques. N7 a
 * livré `carte-monde-v2.svg` et l'a déclarée dans `contenu/monde/regions.json` (`scene.fichier`),
 * mais **ce fichier appartient à N4** (contrat de finition v3 § 6.2) et N7 n'avait pas le droit
 * d'y écrire. Il a donc consigné l'écart dans le `$commentaire` de `regions.json`, en toutes
 * lettres : « Tant que cette ligne n'est pas passée à `carte-monde-v2.svg`, l'enfant voit encore
 * les six hexagones identiques de la v1 ». Personne ne l'a faite. C'est exactement le mode de
 * défaillance que D10 nomme : un morceau qu'aucun fichier n'a pris en charge.
 *
 * Le passage est sûr, et c'est MESURÉ, pas supposé :
 *   • même `viewBox` — `0 0 1200 800` dans les deux fichiers, donc la table `ANCRES` ci-dessous
 *     reste juste au pixel près ;
 *   • mêmes six identifiants de région, dans le même ordre, et mêmes six centres de marqueur —
 *     `tests/unitaires/ids-regions-stables.test.ts` (V1/V2, lignes 243-244) compare les deux
 *     fichiers et échoue si l'un dérive de l'autre.
 *
 * La v1 reste sur le disque : rien n'est supprimé, elle redevient simplement la référence de
 * comparaison du test.
 *
 * DETTE ASSUMÉE, consignée dans `Docs/questions-en-attente.md` : ce chemin est ici ET dans
 * `regions.json`. Le lire depuis le monde supprimerait la duplication (convention C5), mais
 * `scene` n'est exposée ni par `partage/src/monde/types.ts` ni par le dépôt serveur — mesuré :
 * `grep -n "scene" partage/src/monde/types.ts serveur/src/depots/monde.ts` ne rend aucune ligne.
 * La plomberie traverse trois fichiers d'autres lots ; le test ci-dessus tient la cohérence en
 * attendant, et c'est lui qui rend cette dette sûre plutôt que silencieuse.
 */
const SVG_CARTE = 'habillages/carte/carte-monde-v2.svg';

/**
 * Les ancres de chaque région, en unités `viewBox`, **dans l'ordre de la progression**.
 *
 * Ce sont les MÊMES centres que ceux des six formes de `carte-monde.svg` : le décor porte les
 * formes, cette table porte les prises. Les faire diverger décalerait le tap du dessin, ce qui
 * ne se verrait qu'à l'usage — d'où `tests/visuel/carte.spec.ts`, qui les photographie ensemble.
 */
const ANCRES: readonly (readonly [CodeRegion, number, number, string])[] = [
  ['clairiere', 190, 640, 'La Clairière'],
  ['galeries', 450, 460, 'Les Galeries'],
  ['marais-jumeau', 240, 240, 'Le Marais Jumeau'],
  ['foret-muette', 620, 150, 'La Forêt Muette'],
  ['volcan', 900, 340, 'Le Volcan'],
  ['cite-des-histoires', 1020, 630, 'La Cité des Histoires']
];

/** Rayon de la prise tactile, en unités `viewBox`. 64 unités ≈ 64 px CSS à l'échelle de rendu. */
const RAYON_PRISE = 46;

/** Retire l'enveloppe `<svg>` d'un fichier pour pouvoir l'insérer dans un autre. */
export function interieurDuSvg(texte: string): string {
  return texte.replace(/^[\s\S]*?<svg[^>]*>/u, '').replace(/<\/svg>\s*$/u, '');
}

export interface ProprietesEcranCarte {
  /**
   * Ouvre le campement. Fournie par `routeur.tsx`, qui est le SEUL endroit du client à connaître
   * les chemins — `EtatMagasin.ecran` ne porte que les cinq codes du contrat v1 § 7.1, et le
   * campement comme le coffre n'en font pas partie (défaut du contrat gelé, signalé au rapport).
   */
  readonly surAllerCampement?: () => void;
  /**
   * AJOUT N4 — ouvre la séquence d'ouverture (D35). Même disposition que ci-dessus : l'écran ne
   * connaît aucun chemin, il reçoit un rappel.
   */
  readonly surVoirOuverture?: () => void;
}

export function EcranCarte({
  surAllerCampement,
  surVoirOuverture
}: ProprietesEcranCarte = {}): ReactElement {
  const magasin = useMagasin();
  const profil = useEtatJeu((etat) => etat.profil);
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);

  const requeteMonde = useQuery({
    queryKey: ['monde', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Monde demandé sans profil choisi.');
      }
      return lireMonde(profil.id);
    },
    enabled: profil !== null
  });

  /**
   * Ce qui est déjà terminé, nœud par nœud.
   *
   * ── POURQUOI CETTE REQUÊTE EXISTE (lot C4) ────────────────────────────────────────────────
   * Cet écran entrait sur `region.noeuds[0]`, en dur, aux deux endroits qui font entrer dans
   * une région. Tant que la Clairière n'avait qu'un nœud, c'était juste par accident. La v2
   * § 5.2 en demande « 4 à 6 enchaînés » et ils sont désormais livrés : sans cette lecture,
   * l'enfant rejouerait indéfiniment le premier et les quatre autres seraient du contenu écrit,
   * validé, et invisible — exactement le défaut que le père a signalé, en plus grand.
   *
   * La clé `['progression', profil]` est celle qu'`EcranRecompense` invalide déjà après chaque
   * tentative enregistrée : la carte se remet donc à jour toute seule au retour du nœud, sans
   * qu'aucun autre écran n'ait à changer.
   * ─────────────────────────────────────────────────────────────────────────────────────────
   */
  const requeteProgression = useQuery({
    queryKey: ['progression', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Progression demandée sans profil choisi.');
      }
      return lireProgression(profil.id);
    },
    enabled: profil !== null
  });

  const requeteDecor = useQuery({
    queryKey: ['carte', 'decor'],
    queryFn: async () => {
      const reponse = await fetch(urlAsset(SVG_CARTE), { headers: { Accept: 'image/svg+xml' } });
      if (!reponse.ok) {
        throw new Error(`Décor de carte introuvable (réponse ${String(reponse.status)}).`);
      }
      return interieurDuSvg(await reponse.text());
    }
  });

  const monde: EtatMonde | null = requeteMonde.data ?? null;
  const regions: readonly EtatRegion[] = monde?.carte.regions ?? [];
  const jouables = useMemo(
    () => new Set(monde === null ? [] : regionsOuvertes(monde.carte).map((code) => String(code))),
    [monde]
  );

  const parCode = useMemo(
    () => new Map(regions.map((region) => [String(region.region), region])),
    [regions]
  );

  const noeudsFaits = useMemo(
    () => new Set((requeteProgression.data ?? []).map((ligne) => String(ligne.noeud))),
    [requeteProgression.data]
  );

  /**
   * Où reprendre dans une région : le premier nœud non terminé.
   *
   * **Il n'y a jamais de `null` quand la région porte des nœuds.** Une région entièrement
   * terminée renvoie sur son premier nœud plutôt que sur rien : un acquis n'est jamais repris
   * (R14), rejouer est gratuit, et une prise qui cesserait de répondre serait un état sans
   * issue — le pire défaut possible ici.
   */
  const reprise = useCallback(
    (region: EtatRegion | undefined): { readonly noeud: IdNoeud | null; readonly rang: number } => {
      const noeuds = region?.noeuds ?? [];
      if (noeuds.length === 0) {
        return { noeud: null, rang: 0 };
      }
      const index = noeuds.findIndex((noeud) => !noeudsFaits.has(String(noeud)));
      const choisi = index === -1 ? 0 : index;
      return { noeud: noeuds[choisi] ?? null, rang: choisi + 1 };
    },
    [noeudsFaits]
  );

  /** Le chemin d'encre avance comme la recoloration moyenne : une dérivée, jamais un état. */
  const avancement =
    regions.length === 0
      ? 0
      : regions.reduce((total, region) => total + region.pourcentageColorie, 0) / regions.length;

  const entrer = useCallback(
    (noeud: IdNoeud): void => {
      void lirePaquetNoeud(noeud).then((paquet) => {
        magasin.getState().demarrerNoeud(paquet);
      });
    },
    [magasin]
  );

  return (
    <main
      data-ecran="carte"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2.25rem', margin: 0 }}>
          La carte du monde
        </h1>
        <button
          type="button"
          className="cible"
          data-vers="campement"
          aria-label="Revenir au campement"
          onClick={surAllerCampement}
        >
          Le campement
        </button>
        <button
          type="button"
          className="cible"
          onClick={() => {
            magasin.getState().quitterProfil();
          }}
          aria-label="Changer de joueur"
        >
          Changer de joueur
        </button>
      </header>

      {/*
        ══════════════════════════════════════════════════════════════════════════════════════
        LA PHRASE QUE LE PÈRE N'A PAS COMPRISE — D35, corrigée par N4.

        Mesurée au contrat de finition v3 § 4.4 comme le SEUL texte enfant fautif du client :

          $ grep -rniE "en gris|perdu|il manque" client/src --include=*.tsx
          client/src/ecrans/EcranCarte.tsx:153: Bonjour {profil.prenom} ! Le monde t’attend en gris.

        Retour de l'essai, mot pour mot : « je n'ai pas compris la phrase "le monde t'attend en
        gris", c'est pas joyeux pour l'instant ». Sans le récit qui la précède, elle énonce une
        PERTE et ne donne rien à faire.

        La correction est celle que D35 écrit lui-même — « c'est exactement le même fait,
        retourné de l'absence vers le pouvoir d'agir » : le constat reste (il est vrai, et le
        gris EST le mécanisme du jeu), mais la phrase se referme sur le geste de l'enfant.
        `enonceUnePerte` accepte désormais ce texte pour cette raison précise, et pour aucune
        autre : `tests/unitaires/ton-sans-perte.test.ts` refuserait la première moitié seule.
        ══════════════════════════════════════════════════════════════════════════════════════
      */}
      {profil === null ? null : (
        <p style={{ margin: 0, fontSize: '1.125rem' }}>
          Bonjour {String(profil.prenom)}&nbsp;! Le monde t’attend en gris&nbsp;: tu peux lui
          rendre ses couleurs.
        </p>
      )}

      {/*
        L'ENTRÉE DU RÉCIT — D35, point 3 : « rejouable ; un enfant qui n'a pas suivi la
        première fois doit pouvoir y revenir SEUL ».

        Elle est ici, juste sous la phrase qu'elle explique, et non rangée dans un menu. C'est
        la contrepartie assumée de l'arbitrage de N4 (voir `routeur.tsx`) : la séquence n'est
        JAMAIS imposée — D46 point 3 l'interdit — donc son entrée doit être immédiatement
        trouvable, sans quoi elle n'existerait que sur le papier. Le libellé nomme l'histoire,
        pas un réglage : un enfant de sept ans tape ce qu'il comprend.
      */}
      {surVoirOuverture === undefined ? null : (
        <button
          type="button"
          className="cible cible-secondaire"
          data-vers="ouverture"
          aria-label="Écouter l’histoire de la Pierre"
          onClick={surVoirOuverture}
          style={{ alignSelf: 'start' }}
        >
          L’histoire de la Pierre
        </button>
      )}

      <Parchemin>
        {/* Le décor bouchon. Absent, la carte le dit calmement et reste utilisable. */}
        {requeteDecor.data === undefined ? (
          <text x="600" y="400" textAnchor="middle" fontSize="36" fill="var(--trait)">
            On déplie la carte…
          </text>
        ) : (
          /* Le décor est un fichier de contenu DU DÉPÔT, servi par le serveur local : il n'y a
             ni tiers, ni saisie utilisateur dans ce balisage. */
          <g data-decor="carte" dangerouslySetInnerHTML={{ __html: requeteDecor.data }} />
        )}

        <CheminEncre
          etapes={ANCRES.map(([, x, y]) => [x, y] as const)}
          avancement={avancement}
          animationsDesactivees={animationsDesactivees}
        />

        {/* Le voile, région par région. Il n'intercepte jamais le tap. */}
        {requeteDecor.data === undefined
          ? null
          : ANCRES.map(([code]) => {
              const region = parCode.get(String(code));
              const opacite = region === undefined ? 1 : 1 - region.pourcentageColorie;
              return (
                <VoileGrisaille
                  key={`voile-${String(code)}`}
                  forme={String(code)}
                  opacite={opacite}
                  animationsDesactivees={animationsDesactivees}
                />
              );
            })}

        {/* Les prises : une par région, toujours présentes, jamais désactivées. */}
        {ANCRES.map(([code, x, y, libelle]) => {
          const region = parCode.get(String(code));
          const etat = region === undefined ? 'voilee' : etatAfficheRegion(region);
          const ouverte = jouables.has(String(code));
          const premierNoeud = reprise(region).noeud;

          return (
            <g key={String(code)} data-region={String(code)} data-region-etat={etat}>
              <circle
                cx={x}
                cy={y}
                r={RAYON_PRISE}
                fill="var(--parchemin)"
                fillOpacity={0.85}
                stroke="var(--trait)"
                strokeWidth={ouverte ? 6 : 3}
                // ── UNE PRISE N'EXISTE QUE SI ELLE RÉPOND ────────────────────────────────
                // Corrigé à l'intégration de la campagne N. Ces pastilles portaient
                // `role="button"` et `tabIndex={0}` sur les SIX régions, alors que le
                // gestionnaire commence par `if (ouverte && premierNoeud !== null)` : les
                // quatre régions voilées étaient donc annoncées « bouton » au lecteur
                // d'écran, atteignables à la tabulation, et strictement inertes au doigt.
                //
                // Mesuré par `parcours-qa-tout-le-site.spec.ts` — quatre contrôles morts :
                //   circle « Le Marais Jumeau — voilee », « La Forêt Muette — voilee »,
                //   « Le Volcan — voilee », « La Cité des Histoires — voilee »
                //
                // Une région voilée est un DÉCOR, pas une commande. On lui retire donc le
                // rôle et le focus plutôt que de lui inventer une réponse : la seule autre
                // issue aurait été un message, et un message dirait à l'enfant ce qui lui
                // manque — exactement ce que la convention C7 et D35 interdisent.
                {...(ouverte && premierNoeud !== null
                  ? { role: 'button' as const, tabIndex: 0, style: { cursor: 'pointer' } }
                  : { 'aria-hidden': true as const, style: { pointerEvents: 'none' as const } })}
                aria-label={`${libelle} — ${etat}`}
                onClick={() => {
                  if (ouverte && premierNoeud !== null) {
                    entrer(premierNoeud);
                  }
                }}
                onKeyDown={(evenement) => {
                  if (
                    (evenement.key === 'Enter' || evenement.key === ' ') &&
                    ouverte &&
                    premierNoeud !== null
                  ) {
                    entrer(premierNoeud);
                  }
                }}
              />
              <text
                x={x}
                y={y + 76}
                textAnchor="middle"
                fontSize="26"
                fill="var(--trait)"
                style={{ pointerEvents: 'none' }}
              >
                {libelle}
              </text>
            </g>
          );
        })}
      </Parchemin>

      {/* Ce qu'on peut jouer maintenant. Deux régions en parallèle dès la troisième (v2 § 3.3). */}
      <section aria-label="Où aller">
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
          Où veux-tu aller&nbsp;?
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {/*
            UN DÉPART N'EXISTE QUE S'IL MÈNE QUELQUE PART — D48, et c'est la même règle que
            les pastilles de la carte ci-dessus appliquent déjà.

            Le filtre ne portait que sur `jouables`. Or une région ouverte dont AUCUN nœud
            n'est livré passe ce filtre : elle produisait un bouton « Partir vers Le Marais
            Jumeau » dont l'`onClick` est gardé par `noeudDeReprise !== null` et ne fait donc
            rien. C'est exactement l'indice corrélé que D48 dénonce — « compter les éléments
            interactifs n'est pas compter les sorties ».

            La condition est la MÊME que celle du gestionnaire : ce qui décide de l'affichage
            décide du clic, sinon les deux divergent et le bouton ment à nouveau.
          */}
          {ANCRES.filter(
            ([code]) =>
              jouables.has(String(code)) && reprise(parCode.get(String(code))).noeud !== null
          ).map(([code, , , libelle]) => {
            const region = parCode.get(String(code));
            const { noeud: noeudDeReprise, rang } = reprise(region);
            const total = region?.noeuds.length ?? 0;
            return (
              <button
                key={`depart-${String(code)}`}
                type="button"
                className="cible cible-appel"
                data-depart={String(code)}
                data-etape={rang === 0 ? '' : `${String(rang)}/${String(total)}`}
                aria-label={`Partir vers ${libelle}`}
                onClick={() => {
                  if (noeudDeReprise !== null) {
                    entrer(noeudDeReprise);
                  }
                }}
                style={{ flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}
              >
                <span className="titre" style={{ fontSize: '1.375rem' }}>
                  {libelle}
                </span>
                {/* La jauge montre le VIDE restant, jamais seulement l'acquis (D25, point 3). */}
                <span
                  data-restant={String(
                    Math.round((1 - (region?.pourcentageColorie ?? 0)) * 100)
                  )}
                  style={{ fontSize: '1rem' }}
                >
                  Il reste {Math.round((1 - (region?.pourcentageColorie ?? 0)) * 100)} % à
                  rallumer
                </span>
                {/* Dire COMBIEN il y en a, et où on en est. Le père a demandé « je n'ai eu
                    qu'un exercice, est-ce normal ? » : une région qui annonce son étape répond
                    à la question avant qu'elle ne se pose. Aucun chiffre n'est en dur — ils
                    viennent tous des nœuds déclarés par `contenu/monde/regions.json`. */}
                <span style={{ fontSize: '1rem' }}>
                  {noeudDeReprise === null
                    ? 'Le chemin se dessine encore…'
                    : `Étape ${String(rang)} sur ${String(total)} — tape pour entrer`}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
