// Le coffre aux collections — v2 § 3.4 et § 6.1, lot L2-F.
//
// Trois collections, et une seule règle les gouverne toutes : **rien n'en sort jamais.**
// « Un acquis n'est jamais repris » (v2 § 5.4, R14). Le coffre n'a donc aucun chemin de retrait,
// aucun tri qui masque, aucun filtre par défaut : ce qui est entré reste visible.
//
//   1. **Les formes de Gobi** — le palier intermédiaire de D25. Le CRISTAL, jamais le corps
//      (D20) : c'est ce qui rend la collection lisible d'un coup d'œil.
//   2. **Les Éclats de Pierre** — le palier rare de D25, un par région terminée.
//   3. **Les objets du campement** — ce que chaque retour a rapporté.
//
// Ce qui n'est pas encore obtenu est affiché **en creux**, jamais caché : c'est la même règle
// que les étoiles en creux (v2 § 6.2) et que le voile de Grisaille. Montrer le vide restant est
// le moteur de retour du jeu ; le cacher le supprimerait.
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EtatMonde } from '@pierre/partage';
import { construireEtagere } from '@pierre/partage/monde';
import { lireMonde, urlAsset } from '../api/client.js';
import { useEtatJeu } from '../etat/services.js';
import { DessinButin } from '../monde/Butin.js';
import { eclatDeRegion } from '../monde/eclats.js';
import { Etagere, useCatalogueFormes } from '../monde/Etagere.js';
import { FicheObjet } from '../monde/FicheObjet.js';

export interface ProprietesEcranCoffre {
  /** Le monde du profil. Injecté par les tests et par un hôte qui l'a déjà ; chargé sinon. */
  readonly monde?: EtatMonde | null;
  readonly surRetour?: () => void;
}

/**
 * Le nom lisible des six régions — lot M8.
 *
 * ── LE DÉFAUT QUE CECI SOLDE, et il était visible à l'écran. La section des Éclats rendait
 * `libelle={String(region.region)}` : l'enfant lisait « clairiere », « cite-des-histoires »,
 * sans accent, sans majuscule, avec des tirets. Un identifiant technique n'est pas un mot ;
 * c'est même exactement le genre de chaîne qu'un enfant de CE1 ne peut pas déchiffrer, sur
 * l'écran qui devrait lui donner envie d'y retourner.
 *
 * ── ÉCART DÉCLARÉ, PAS TU. C'est la TROISIÈME copie de cette table dans le client
 * (`parent/CarteCouverture.tsx:20`, `parent/EtatProfil.tsx:33`). Elle n'est pas hissée dans un
 * module commun ici parce qu'aucun lot du contrat du monde v4 ne possède `client/src/monde/`
 * ni `partage/src/monde/`, et qu'un lot ne s'accorde pas un fichier qu'un autre pourrait être
 * en train d'écrire. Consigné en question ouverte : la table appartient au référentiel des
 * régions (`contenu/monde/regions.json`, propriété de M2), pas à trois écrans.
 *
 * Le repli rend le code brut plutôt que rien : une région neuve s'affiche laide, jamais vide.
 */
export const NOM_DE_REGION: Readonly<Record<string, string>> = {
  clairiere: 'La Clairière',
  galeries: 'Les Galeries',
  'marais-jumeau': 'Le Marais Jumeau',
  'foret-muette': 'La Forêt Muette',
  volcan: 'Le Volcan',
  'cite-des-histoires': 'La Cité des Histoires'
};

/**
 * Le dessin en creux des Éclats — lot M8.
 *
 * ── CE QUE S5 A CORRIGÉ ICI. M8 avait séparé les DEUX collections : un cristal pointu pour
 * l'Éclat, une besace pour l'objet rapporté. Mais à l'INTÉRIEUR de la collection des objets,
 * les six pièces partageaient encore la même besace — le fanion de la Clairière, la géode des
 * Galeries et le livre de la Cité étaient trois fois le même sac gris. « Deux formes
 * identiques ne se collectionneraient pas » (D44) valait pour les six comme pour les deux.
 * Les objets passent donc à `DessinButin` (`client/src/monde/Butin.tsx`), qui les dessine un
 * par un et sert AUSSI au campement : les deux écrans montrent le même objet, jamais deux.
 *
 * Les Éclats gardent leur silhouette ici : ce sont des pièces de région, pas du butin, et
 * `contenu/monde/regions.json` ne leur déclare aucun dessin.
 */
const SILHOUETTE_ECLAT = 'M24 3l13 15-5 19-8 10-8-10-5-19z';

/** La pièce dont la fiche est ouverte — R28. `null` quand aucune ne l'est. */
interface PieceOuverte {
  readonly categorie: string;
  readonly cle: string;
  readonly libelle: string;
  readonly obtenu: boolean;
}

/**
 * Ce que la fiche raconte, par collection.
 *
 * Ces phrases sont ici et non dans `FicheObjet` : le panneau est partagé par quatre
 * collections, et c'est chacune qui sait ce qu'elle promet. Un texte écrit dans le composant
 * commun aurait fini par dire « il t'attend » d'un compagnon.
 */
const PHRASE_GAGNE: Readonly<Record<string, string>> = {
  eclat: 'Tu as terminé cette région. Son Éclat est à toi.',
  objet: 'Tu l’as rapporté au campement. Il est à sa place.'
};

const PHRASE_A_GAGNER: Readonly<Record<string, string>> = {
  eclat: 'Termine cette région pour gagner son Éclat.',
  objet: 'Tu ne l’as pas encore rapporté au campement.'
};

/**
 * Une case de collection : pleine ou en creux, jamais absente.
 *
 * ── R28 — ELLE S'OUVRE DÉSORMAIS, ET SANS DIRE SA COULEUR ────────────────────────────────────
 * « Il faudrait aussi du coup dans les Éclats de Pierre et ce que tu as rapporté, bah cette
 * prévisualisation quoi, sans donner les couleurs, parce que ça c'est à deviner. »
 *
 * Un `<button>` et non un `<li>` inerte : c'est ce qui la rend atteignable au clavier et
 * annonçable par un lecteur d'écran. Les marques `data-collection`, `data-piece` et
 * `data-obtenue` RESTENT sur cet élément — plusieurs recettes les visent déjà, et déplacer une
 * prise casserait des gardes qui n'ont rien demandé.
 */
function Case({
  cle,
  libelle,
  asset,
  obtenu,
  categorie,
  surOuvrir
}: {
  readonly cle: string;
  readonly libelle: string;
  readonly asset: string | null;
  readonly obtenu: boolean;
  readonly categorie: string;
  readonly surOuvrir: () => void;
}): ReactElement {
  return (
    <li style={{ display: 'contents' }}>
    <button
      type="button"
      data-collection={categorie}
      data-piece={cle}
      data-obtenue={obtenu ? 'oui' : 'non'}
      className="cible"
      aria-label={obtenu ? `${libelle}, gagné` : `${libelle}, pas encore gagné`}
      onClick={surOuvrir}
      style={{
        flexDirection: 'column',
        gap: '0.35rem',
        inlineSize: '10rem',
        minBlockSize: '11rem'
        // `opacity` / `filter` ne sont plus ici : voir l'encadré sur le dessin, ci-dessous.
      }}
    >
      {categorie === 'objet' ? (
        // Le butin, dessiné pièce par pièce. Le voile du creux est porté par la feuille de
        // style (`[data-collection][data-obtenue="non"] .dessin-butin`), donc par la MÊME
        // règle qu'au campement : une seule valeur de voile dans le dépôt.
        <DessinButin code={cle} />
      ) : asset === null ? (
        <svg
          width="88"
          height="88"
          viewBox="0 0 48 48"
          aria-hidden="true"
          focusable="false"
          // ── LE CREUX PORTE SUR LE DESSIN, PAS SUR LE LIBELLÉ ──────────────────────────
          // `opacity: 0.55` et `saturate(0)` s'appliquaient au `<li>` entier, donc aussi au
          // nom de la pièce. Mesuré par axe-core une fois l'audit a11y réellement arrivé sur
          // le coffre : `#828389` et `#82848f` sur `#fff6e3`, **ratios 3,51 et 3,46 pour 4,5
          // exigés**, sur les cases non obtenues.
          //
          // « En creux : la même case, en Grisaille. Jamais une case vide, jamais un cadenas »
          // parle du DESSIN. Le nom de la pièce, lui, est ce qui dit à l'enfant ce qu'il peut
          // encore trouver : c'est le texte le plus utile de l'écran, et il était le moins
          // lisible. Même correction que pour l'étagère (`client/src/monde/Etagere.tsx`).
          //
          // M8 : le voile est désormais CONDITIONNEL. Il ne l'était pas, et ça ne se voyait
          // pas — le dessin était gris dans les deux cas, et un `saturate(0)` sur du gris ne
          // change rien. Depuis que la case gagnée porte un aplat de soleil, un voile
          // inconditionnel la repeindrait en gris : il annulerait exactement la récompense.
          style={obtenu ? undefined : { opacity: 0.55, filter: 'saturate(0)' }}
        >
          <path
            // Un Éclat porte la silhouette ET la teinte de SA région (`client/src/monde/eclats.ts`).
            // Les six étaient identiques : six trophées indiscernables ne disent pas ce qu'il
            // reste à trouver, alors que c'est le propos de cet écran — « jamais une case vide,
            // jamais un cadenas » (v2 § 9.1). Les autres collections gardent la silhouette
            // générique, qui reste le repli de `eclatDeRegion`.
            d={categorie === 'eclat' ? eclatDeRegion(cle).silhouette : SILHOUETTE_ECLAT}
            // La case GAGNÉE prend l'aplat de sa collection ; la case en creux garde la
            // Grisaille. C'est le contraste gris / couleur qui porte tout le jeu (v2 § 9.1) :
            // sans lui, obtenir un Éclat ne se verrait pas.
            fill={
              obtenu
                ? categorie === 'eclat'
                  ? eclatDeRegion(cle).teinte
                  : 'var(--soleil)'
                : 'var(--grisaille)'
            }
            stroke="var(--trait)"
            // 4 px — l'épaisseur de trait du projet (v2 § 9.1), et non 3.
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <img
          src={urlAsset(asset)}
          alt=""
          width={88}
          height={88}
          aria-hidden="true"
          style={obtenu ? undefined : { opacity: 0.55, filter: 'saturate(0)' }}
        />
      )}
      <span style={{ fontSize: '0.95rem', textAlign: 'center' }}>{libelle}</span>
    </button>
    </li>
  );
}

const STYLE_LISTE = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem'
};

export function EcranCoffre({
  monde: mondeInjecte = null,
  surRetour
}: ProprietesEcranCoffre = {}): ReactElement {
  const profil = useEtatJeu((etat) => etat.profil);
  const [ouverte, fixerOuverte] = useState<PieceOuverte | null>(null);

  const requete = useQuery({
    queryKey: ['monde', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Coffre demandé sans profil choisi.');
      }
      return lireMonde(profil.id);
    },
    enabled: mondeInjecte === null && profil !== null
  });

  const monde: EtatMonde | null = mondeInjecte ?? requete.data ?? null;
  const regions = monde?.carte.regions ?? [];
  const objets = monde?.campement ?? [];

  // L'étagère, cases vides comprises. Même catalogue et même clé de requête qu'au campement :
  // les deux écrans montrent exactement le même album, jamais deux comptes différents (C5).
  const catalogue = useCatalogueFormes();
  const etagere = construireEtagere(catalogue, monde?.gobi.formes ?? []);

  const nbEclats = regions.filter((region) => region.eclatObtenuLe !== null).length;

  return (
    <main
      data-ecran="coffre"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2.25rem', margin: 0 }}>
          Le coffre
        </h1>
        <button
          type="button"
          className="cible"
          data-vers="campement"
          aria-label="Revenir au campement"
          onClick={surRetour}
        >
          Retour au campement
        </button>
        <div
          data-coffre-illustration="raster"
          aria-hidden="true"
          style={{
            marginInlineStart: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minInlineSize: 0,
          }}
        >
          <p style={{ margin: 0, maxInlineSize: '16rem', fontWeight: 700, textAlign: 'right' }}>
            Tes trouvailles t’attendent ici.
          </p>
          <img
            src={urlAsset('assets/coffre/coffre-ouvert-v1.png')}
            alt=""
            width={156}
            height={156}
            draggable={false}
            style={{ inlineSize: 'clamp(7rem, 12vw, 9.75rem)', blockSize: 'auto' }}
          />
        </div>
      </header>

      {/* ── LA PREMIÈRE COLLECTION PASSE À L'ÉTAGÈRE — D44, lot N6 ──────────────────────────
          Ce que cette section faisait, et qui était le défaut : `formes.map(...)` ne rendait
          QUE les formes gagnées. Un enfant qui n'en avait aucune lisait une phrase ; un enfant
          qui en avait trois voyait trois vignettes. Les vingt-deux cases restantes — c'est-à-dire
          la seule raison d'y revenir (D25, point 3) — n'existaient nulle part.
          `construireEtagere` garantit `cases.length === nbTotal` : le vide ne peut plus être
          oublié, parce qu'il n'y a plus de liste où il serait absent.
          L'attribut `data-collection-titre="formes"` est CONSERVÉ : `parcours-campement.spec.ts`
          (L2-F) l'attend, et il n'appartient pas à ce lot. */}
      <section className="panneau" aria-label="Les formes de Gobi" data-collection-titre="formes">
        <Etagere etagere={etagere} titre="Les formes de Gobi" />
      </section>

      <section className="panneau" aria-label="Les Éclats de Pierre" data-collection-titre="eclats" data-progression-restante={String(regions.length - nbEclats)}>
        <h2 className="panneau-titre" style={{ fontSize: '1.5rem' }}>
          Les Éclats de Pierre — {nbEclats} sur {regions.length}
        </h2>
        <p className="collection-progression" data-progression-reste="oui">
          {nbEclats === regions.length
            ? 'Tous les Éclats sont découverts.'
            : `Il reste ${String(regions.length - nbEclats)} Éclat${regions.length - nbEclats > 1 ? 's' : ''} à découvrir.`}
        </p>
        <ul style={STYLE_LISTE}>
          {regions.map((region) => (
            <Case
              key={String(region.region)}
              // `cle` reste l'IDENTIFIANT : `data-piece` est ce que la recette compte, et il
              // ne se traduit pas. Seul le mot que l'enfant lit change.
              cle={String(region.region)}
              libelle={NOM_DE_REGION[String(region.region)] ?? String(region.region)}
              asset={null}
              obtenu={region.eclatObtenuLe !== null}
              categorie="eclat"
              surOuvrir={() => {
                fixerOuverte({
                  categorie: 'eclat',
                  cle: String(region.region),
                  libelle: NOM_DE_REGION[String(region.region)] ?? String(region.region),
                  obtenu: region.eclatObtenuLe !== null
                });
              }}
            />
          ))}
        </ul>
      </section>

      <section className="panneau" aria-label="Les objets du campement" data-collection-titre="objets" data-progression-restante={String(objets.filter((objet) => objet.placeLe === null).length)}>
        {/* ── R40 — LE PICTOGRAMME SUIT L'OBJET, LA MIGRATION EST FINIE ──────────────────────
            Même principe que l'étagère (R27, `Etagere.tsx:150`) : le butin a quitté le
            campement pour vivre ici, et son pictogramme (`Butin.tsx:200`, 🎒) le suit — REPRIS
            à l'identique, jamais réinventé, sinon deux pictogrammes pour un même objet sur
            deux écrans se seraient mis à mentir. `campement-affordance.test.tsx` documentait
            déjà la règle pour l'étagère ; elle vaut ici sans changer un mot. */}
        <h2 className="panneau-titre" style={{ fontSize: '1.5rem' }}>
          <span aria-hidden="true" data-pictogramme="butin">
            🎒
          </span>
          Ce que tu as rapporté —{' '}
          {objets.filter((objet) => objet.placeLe !== null).length} sur {objets.length}
        </h2>
        <p className="collection-progression" data-progression-reste="oui">
          {objets.filter((objet) => objet.placeLe === null).length === 0
            ? 'Tout le butin est rapporté.'
            : `Il reste ${String(objets.filter((objet) => objet.placeLe === null).length)} objet${objets.filter((objet) => objet.placeLe === null).length > 1 ? 's' : ''} à rapporter.`}
        </p>
        <ul style={STYLE_LISTE}>
          {objets.map((objet) => (
            <Case
              key={String(objet.code)}
              cle={String(objet.code)}
              libelle={objet.libelle}
              asset={null}
              obtenu={objet.placeLe !== null}
              categorie="objet"
              surOuvrir={() => {
                fixerOuverte({
                  categorie: 'objet',
                  cle: String(objet.code),
                  libelle: objet.libelle,
                  obtenu: objet.placeLe !== null
                });
              }}
            />
          ))}
        </ul>
      </section>

      {ouverte === null ? null : (
        <FicheObjet
          marqueRacine={{
            'data-fiche-coffre': ouverte.cle,
            'data-fiche-collection': ouverte.categorie
          }}
          libelleAria={
            ouverte.obtenu
              ? `${ouverte.libelle}, gagné`
              : `${ouverte.libelle}, pas encore gagné`
          }
          titre={ouverte.libelle}
          obtenu={ouverte.obtenu}
          // ── R28 — LA COULEUR RESTE À DEVINER ────────────────────────────────────────────
          // « sans donner les couleurs, parce que ça c'est à deviner. » C'est l'inverse exact
          // de l'étagère de Gobi, juste au-dessus dans le même écran, où la couleur est une
          // promesse montrée (R24). Les deux contrats coexistent volontairement : l'un donne
          // envie en montrant, l'autre en cachant.
          couleurRevelee={false}
          phrase={
            ouverte.obtenu
              ? PHRASE_GAGNE[ouverte.categorie] ?? 'Tu l’as gagné.'
              : PHRASE_A_GAGNER[ouverte.categorie] ?? 'Il t’attend encore.'
          }
          visuel={
            ouverte.categorie === 'objet' ? (
              <DessinButin code={ouverte.cle} taille={144} />
            ) : (
              <svg width="144" height="144" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                <path
                  d={eclatDeRegion(ouverte.cle).silhouette}
                  fill={ouverte.obtenu ? eclatDeRegion(ouverte.cle).teinte : 'var(--grisaille)'}
                  stroke="var(--trait)"
                  strokeWidth="4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            )
          }
          surFermer={() => {
            fixerOuverte(null);
          }}
        />
      )}
    </main>
  );
}
