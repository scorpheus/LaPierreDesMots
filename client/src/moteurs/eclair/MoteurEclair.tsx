/**
 * `MoteurEclair` — le composant hôte du moteur `eclair`. Lot L2-E.
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurEclair` (paquet `partage`) ; ce
 * composant fait quatre choses et pas une de plus : traduire un geste en `ActionEclair`,
 * faire battre l'horloge du moteur, déclencher le retour sensoriel, et donner à voir l'état.
 *
 * TROIS INVARIANTS DE RENDU, opposables en revue :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs.** C'est la traduction mécanique
 *     de R14, et l'assertion centrale de `tests/e2e/cassecou.spec.ts` ;
 *   - **aucun rouge sur un refus** : la cible oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px**, avec 24 px de tolérance (R16) — d'où `CIBLE_PX`.
 *
 * Le son, la vibration et les particules passent **tous** par `services.retour` (L2-A) : un
 * composant qui appellerait `FournisseurAudio` directement obligerait à réécrire la
 * dégradation par `prefers-reduced-motion` à chaque site d'appel, et un seul oubli la
 * casserait (contrat § 4.1).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { hexDeCouleur } from '@pierre/partage';
import type { ActionEclair, ContenuEclair, EtatEclair } from '@pierre/partage';
import { ZoneDeLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** R16 : 64 px de côté au minimum, 24 px de tolérance obtenus par l'écart entre cibles. */
const CIBLE_PX = 64;
const TOLERANCE_PX = 24;

const STYLE_CIBLE = {
  minWidth: CIBLE_PX,
  minHeight: CIBLE_PX,
  margin: TOLERANCE_PX / 2,
  fontSize: '1.25rem',
  cursor: 'pointer',
} as const;

export function MoteurEclair(
  proprietes: ProprietesMoteur<ContenuEclair, EtatEclair, ActionEclair>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionEclair);
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  // --- le retour sensoriel --------------------------------------------------
  //
  // La série est comptée ICI, pas dans le moteur : c'est une notion de PLAISIR, pas de règle
  // (v2 § 8, D26 — « 2ᵉ bonne réponse = un demi-ton plus haut »). Le moteur reste pur, et le
  // jour où la hauteur montante changera, aucune logique de jeu ne bougera.
  const serie = useRef(0);
  const nbAcquis = Object.keys(etat.acquis).length;
  const precedents = useRef(nbAcquis);
  const marqueRefus = useRef(etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs);
  const origine = useRef<readonly [number, number]>([0, 0]);

  useEffect(() => {
    if (nbAcquis > precedents.current) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: origine.current, serie: serie.current });
    }
    precedents.current = nbAcquis;
  }, [nbAcquis, services]);

  useEffect(() => {
    const marque = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
    if (marque !== 0 && marque !== marqueRefus.current) {
      // Refus : oscillation de 6 px et son NEUTRE. Aucune vibration, aucun rouge (§ 4.1).
      serie.current = 0;
      services.retour.reinitialiserSerie();
      void services.retour.depotRefuse();
    }
    marqueRefus.current = marque;
  }, [etat.dernierRefus, services]);

  /** Mémorise le point du geste : c'est l'origine des particules et du balayage. */
  const noter = useCallback((evenement: { clientX: number; clientY: number }) => {
    origine.current = [evenement.clientX, evenement.clientY];
  }, []);

  const jouer = useCallback(
    (action: ActionEclair, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  const consigne = contenu.consignes[etat.indexEtape] ?? null;

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // « QUAND JE CLIQUE SUR REVOIR, ÇA NE FAIT RIEN » — trouvé en jouant, le 2026-08-03.
  //
  // Il avait raison, et la cause était structurelle, pas accidentelle :
  //
  //     eclairVisible = etat.finExpositionMs === null
  //
  // `finExposition` fixe `finExpositionMs` **une seule fois et ne le remet jamais à zéro** —
  // et c'est VOULU : cette date est l'origine de la latence de reconnaissance (D18), la mesure
  // principale de ce moteur, et la revoir ne doit pas effacer la première, qui est la vraie.
  // Mais `revoirEclair` n'incrémentait qu'un compteur d'écoutes. Dès que le mot avait disparu
  // une fois, `eclairVisible` était faux POUR TOUJOURS.
  //
  // Le bouton s'appelle « Revoir », le réducteur commente « GRATUIT et sans limite, comme
  // réécouter la consigne (R15) », et rien ne réapparaissait jamais. L'intention se lisait dans
  // le code ; le rendu disait l'inverse — même famille que le `<use>` du voile de Grisaille.
  //
  // Et AUCUN test ne l'exerçait : `grep -rln revoirEclair tests/` ne rendait aucun fichier de
  // recette. Le contrôle était impossible à voir sans jouer.
  //
  // ── LA CORRECTION, ET POURQUOI ELLE NE TOUCHE PAS L'ÉTAT PARTAGÉ ───────────────────────────
  // La VISIBILITÉ de l'éclair devient un état de rendu ; `finExpositionMs` reste la MESURE.
  // Les deux étaient confondus dans un seul champ, et c'est cette confusion qui rendait
  // « revoir » impossible sans fausser D18. Le journal, le rejeu et la latence sont inchangés :
  // le réducteur ignore toujours les `finExposition` suivants.
  //
  // `nbEcoutes` sert de déclencheur : chaque « Revoir » l'incrémente, donc l'effet rejoue et le
  // mot réapparaît pour la même durée. `emettre` passe par une référence plutôt que par les
  // dépendances — une identité de fonction qui changerait à chaque rendu relancerait l'effet
  // sans fin, et le mot ne disparaîtrait plus jamais. C'est le défaut symétrique de celui qu'on
  // corrige, et il serait tout aussi silencieux.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  const dureeMs = consigne === null ? 0 : consigne.expositionMs;
  const [eclairVisible, fixerEclairVisible] = useState(false);

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * R11 — L'ÉCLAIR NE PART PLUS SANS PRÉVENIR
   *
   * Le père, en jouant : « c'est pas bien expliqué, et comme deuxième exercice c'est assez
   * rude ». Il avait raison sur les deux, et le premier point était mesurable : **rien
   * n'annonçait le mot**. `grep` sur ce fichier ne rendait aucun décompte, aucun « regarde
   * bien », aucun signal. Le mot apparaissait dès l'ARRIVÉE sur l'écran — donc pendant que
   * l'enfant lisait encore la consigne — et disparaissait au bout de 1,4 à 1,8 s. S'il
   * regardait ailleurs, il n'avait rien vu **et rien ne le lui disait**.
   *
   * Une durée d'exposition n'a de sens que si l'on regardait au moment où elle court. Ce
   * compteur est donc la porte : l'éclair ne part qu'au tap de l'enfant, et « Revoir »
   * l'incrémente aussi. C'est LUI qui décide quand il est prêt — la même idée que « c'est
   * l'enfant qui choisit sa difficulté » (R15).
   *
   * La mesure de D18 n'est pas touchée : `finExposition` reste émise à la fin de la première
   * exposition et le réducteur ignore toujours les suivantes.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */
  /**
   * ── LA PORTE PORTE L'IDENTITÉ DE SA CONSIGNE, ET C'EST TOUT LE CORRECTIF ──────────────────
   *
   * Défaut trouvé EN JOUANT le lendemain de R11, et introduit PAR R11 : « quand tu cliques sur
   * la bonne couleur, ça affiche le mot suivant directement ET ça te met le bouton montre-moi
   * le mot, qui est déjà affiché ».
   *
   * La première version tenait la porte dans un compteur nu, refermé par un effet :
   *
   *     effet A (la consigne change) → referme la porte, `demarrages` = 0
   *     effet B (la consigne change) → lit ENCORE `demarrages` = 1, du rendu précédent
   *                                  → lance l'éclair de l'étape suivante
   *
   * Les deux tournaient dans le même commit, et B voyait la valeur du rendu en cours, pas
   * celle que A venait de poser. Le mot partait donc tout seul ET la porte s'affichait.
   *
   * La correction ne consiste pas à ordonner les effets — ce serait tenir un équilibre — mais
   * à supprimer la course : **la porte retient l'identifiant de la consigne qui l'a ouverte**.
   * Si la consigne affichée n'est plus celle-là, la porte est refermée, et c'est CALCULÉ AU
   * RENDU. Il n'y a plus d'instant où deux vérités coexistent, donc plus rien à synchroniser.
   */
  const idConsigne = consigne === null ? null : String(consigne.id);
  const [porte, fixerPorte] = useState<{ readonly id: string | null; readonly tours: number }>(
    () => ({ id: idConsigne, tours: 0 })
  );
  const tours = porte.id === idConsigne ? porte.tours : 0;
  const ouvrirLaPorte = useCallback(() => {
    fixerPorte({ id: idConsigne, tours: tours + 1 });
  }, [idConsigne, tours]);

  const refEmettre = useRef(emettre);
  refEmettre.current = emettre;

  useEffect(() => {
    if (consigne === null || tours === 0) {
      // Porte fermée — nouvelle consigne, ou pas encore tapé. Rien ne s'affiche, et surtout
      // aucune minuterie ne court : c'est ce silence qui manquait.
      fixerEclairVisible(false);
      return undefined;
    }
    fixerEclairVisible(true);
    // Le `setTimeout` vit ICI, dans le rendu, jamais dans la logique (§ 4.8, règle 3).
    const identifiant = setTimeout(() => {
      fixerEclairVisible(false);
      refEmettre.current({ type: 'finExposition' } as ActionEclair);
    }, dureeMs);
    return () => {
      clearTimeout(identifiant);
    };
  }, [consigne, dureeMs, tours]);

  return (
    <div
      data-moteur="eclair"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      style={{ display: 'grid', gap: '1rem' }}
    >
      {/* La consigne passe par `ZoneDeLecture` : c'est le SEUL composant qui affiche du
          texte à déchiffrer (§ 5.1). Sans quoi « le décor s'agite, le texte jamais » ne
          tiendrait qu'à la discipline de onze fichiers. */}
      <ZoneDeLecture
        texte={consigne === null ? '' : consigne.texte}
        motsCles={consigne === null ? [] : consigne.motsCles}
      />

      <div data-plateau="eclair" data-visible={eclairVisible ? 'oui' : 'non'}>
        {eclairVisible && consigne !== null ? (
          <ZoneDeLecture texte={consigne.mot} motsCles={[consigne.mot]} />
        ) : null}
      </div>

      {/* LA PORTE. Tant que l'enfant n'a pas tapé, aucun mot ne part — il ne peut donc plus
          rater l'éclair sans le savoir. Une fois l'exposition passée, la même place porte
          « Revoir », qui rouvre la porte autant de fois qu'il veut. */}
      {tours === 0 ? (
        <button
          type="button"
          data-action="pret"
          className="cible cible-appel"
          style={STYLE_CIBLE}
          onClick={ouvrirLaPorte}
        >
          Prêt&nbsp;? Montre-moi le mot
        </button>
      ) : (
        <div style={{ display: 'grid', gap: '0.25rem', justifyItems: 'start' }}>
          <button
            type="button"
            data-action="revoir"
            style={STYLE_CIBLE}
            onClick={() => {
              // Les deux, et dans cet ordre : le réducteur compte la revue (R15, elle ne coûte
              // rien), la porte se rouvre pour que le mot reparte vraiment. Compter sans
              // remontrer était exactement le défaut d'avant.
              emettre({ type: 'revoirEclair' } as ActionEclair);
              ouvrirLaPorte();
            }}
          >
            Revoir le mot
          </button>
          {/* R15 rendue LISIBLE. Elle était vraie dans le code et écrite nulle part : le père
              a pris « Revoir » pour un bouton parmi d'autres et ne s'en est jamais servi. */}
          <small data-note="revoir-gratuit" style={{ opacity: 0.8 }}>
            Tu peux le revoir autant de fois que tu veux, ça ne coûte rien.
          </small>
        </div>
      )}

      <div data-plateau="options" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {(consigne === null ? [] : consigne.options).map((id) => {
          const option = contenu.options.find((o) => o.id === id);
          if (option === undefined) return null;
          return (
            <button
              key={id}
              type="button"
              data-option={id}
              data-option-couleur={option.couleur ?? undefined}
              style={STYLE_CIBLE}
              onClick={(evenement) => {
                jouer({ type: 'repondre', option: id }, evenement);
              }}
            >
              {/* R11 — UNE COULEUR SE MONTRE, ELLE NE SE LIT PAS.
                  Le libellé était « la luciole rouge » : dix-sept caractères pour répondre à un
                  mot flashé de cinq. La pastille porte la couleur, le mot reste à côté d'elle
                  pour ceux qui veulent le lire, et l'étiquette accessible garde la phrase
                  entière — un lecteur d'écran ne voit pas une pastille.
                  Sans `couleur`, rien ne change : les quatre autres exercices `eclair`
                  proposent le mot nu, ce qui est déjà juste. */}
              {option.couleur === undefined ? null : (
                <span
                  aria-hidden="true"
                  data-pastille={option.couleur}
                  style={{
                    display: 'inline-block',
                    inlineSize: '2.25rem',
                    blockSize: '2.25rem',
                    marginInlineEnd: '0.5rem',
                    verticalAlign: 'middle',
                    borderRadius: '50%',
                    background: hexDeCouleur(option.couleur),
                    // Le trait de la palette, pour que `blanc` et `jaune` restent visibles sur
                    // le parchemin — une pastille sans contour disparaîtrait sur le fond.
                    border: '3px solid var(--trait, #1B2440)'
                  }}
                />
              )}
              {option.libelle}
            </button>
          );
        })}
      </div>

      {/* ── LES DEUX CONTRÔLES SONT PORTÉS PAR L'ÉCRAN, PAS PAR LE MOTEUR (R10) ──────────────
          Ce moteur rendait ici son propre « Écouter » et son propre « Gobi, aide-moi ». Les
          deux étaient MUETS : leur `onClick` émettait une action et n'appelait jamais le
          service de voix. Le père a tapé dessus et n'a rien eu — onze moteurs sur quatorze
          faisaient pareil, alors que « tout est audible en un tap » n'est pas négociable.

          `EcranNoeud` monte le vrai `BoutonEcouter` (qui joue le clip, et DISPARAÎT quand il
          n'y en a pas — D42) et le vrai `<Gobi>`, qui porte la même prise `data-action="aide"`.
          Un moteur ne peut pas héberger le vrai bouton d'écoute : il lui faudrait la clé
          `<exercice>/<consigne>`, et `ProprietesMoteur` ne porte pas l'identifiant d'exercice.
          Seul l'écran le connaît. */}

      <p
        role="status"
        aria-live="polite"
        data-animations={animationsDesactivees ? 'calmes' : 'vives'}
      >
        {etat.aide === null ? '' : (etat.aide.texte ?? '')}
      </p>
    </div>
  );
}
