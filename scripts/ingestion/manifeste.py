# -*- coding: utf-8 -*-
"""Le manifeste d'ingestion — lot L2-G, convention C4 du contrat features v2.

CE QUE CE MODULE GARANTIT, ET QUI EST LE CONTRAT DE SORTIE DU LOT
------------------------------------------------------------------
**La comptabilité ferme, ou rien n'est écrit.**

    fichesIngerees + fichesRefusees == fichesDemandees

Une fiche ne peut être ni oubliée, ni comptée deux fois, ni « rendue à moitié » :
elle est ingérée, ou refusée avec un motif du vocabulaire fermé de `refus.py`.
`ecrire_manifeste` **refuse d'écrire** un manifeste dont l'égalité est fausse,
et l'écart est imprimé. C'est la différence entre un compteur qui déclare une
propriété et un compteur qui l'applique.

Sur une passe complète (sans `--fiche`), `fichesDemandees == fichesDuPdf`, et
l'égalité du contrat § 10.4 est donc celle-ci même.

POURQUOI L'ÉCART N'EST PAS UN CHAMP DU JSON
--------------------------------------------
Le contrat demande deux choses qui se heurtent : que le manifeste « porte les
deux comptes et leur écart » (§ 3.7, C4), et que **le manifeste du niveau 1
reste identique au bit près** après refactorisation (§ 3.7, et § 10.4 qui en
fait le chiffre du lot). Ajouter un champ casserait la seconde, qui est la plus
forte et la seule mécaniquement vérifiable.

Les deux comptes sont donc portés par `fichesIngerees` et `fichesRefusees`,
l'écart est **calculé, imprimé, et opposable** : il conditionne l'écriture. Un
écart non nul ne produit pas un manifeste avec un vilain champ, il ne produit
aucun manifeste. Ce point est signalé comme un défaut du contrat dans le rapport
du lot.

DÉTERMINISME
------------
Aucun horodatage, aucun aléa, aucun chemin absolu. Deux exécutions donnent deux
fichiers identiques octet pour octet — c'est ce qui permet d'en faire une
référence de test (annexe T § T2).
"""

from __future__ import annotations

import json
from pathlib import Path


class ComptabiliteOuverte(Exception):
    """La comptabilité des fiches ne ferme pas : on n'écrit aucun manifeste."""


def ecrire_json(chemin: Path, donnees: dict) -> None:
    """Écriture déterministe : UTF-8, LF, indentation 2, ordre d'insertion."""
    chemin.parent.mkdir(parents=True, exist_ok=True)
    with chemin.open("w", encoding="utf-8", newline="\n") as flux:
        json.dump(donnees, flux, ensure_ascii=False, indent=2, sort_keys=False)
        flux.write("\n")


def verifier_destination(destination: Path, racine: Path) -> None:
    """Garde-fou dur : on n'écrit QUE sous `contenu/brouillons/`.

    Annexe P § 6.4 et CLAUDE.md : aucune écriture directe dans
    `contenu/exercices/`, `contenu/habillages/` ou `contenu/audio/`.
    """
    autorisee = (racine / "contenu" / "brouillons").resolve()
    cible = destination.resolve()
    if autorisee != cible and autorisee not in cible.parents:
        raise SystemExit(
            f"REFUS — destination {cible} hors de {autorisee}. Tout contenu "
            "produit par un agent passe par contenu/brouillons/ puis par la "
            "relecture parent (annexe P § 6.4).")


def ecart_de_comptabilite(fiches_demandees: int, ingerees: int,
                          refusees: int) -> int:
    """L'écart qui doit valoir 0. Positif : des fiches ont disparu."""
    return fiches_demandees - (ingerees + refusees)


def composer(nom_source: str, niveau: int, fiches_du_pdf: int,
             fiches_demandees: int, reussies: list[dict], refusees: list[dict],
             agregats: dict, regles_de_structure: dict) -> dict:
    """Le manifeste, dans l'ORDRE DE CLÉS figé par le manifeste du niveau 1.

    L'ordre n'est pas une coquetterie : c'est lui qui rend la comparaison
    octet-pour-octet possible, et donc la neutralité de la refactorisation
    mesurable plutôt qu'affirmée.
    """
    return {
        "source": nom_source,
        "niveau": niveau,
        "fichesDuPdf": fiches_du_pdf,
        "fichesDemandees": fiches_demandees,
        "fichesIngerees": len(reussies),
        "fichesRefusees": len(refusees),
        **agregats,
        "reglesDeStructure": regles_de_structure,
        "fiches": reussies,
        "refus": refusees,
    }


def ecrire_manifeste(chemin: Path, manifeste: dict) -> int:
    """Écrit le manifeste — **si et seulement si** la comptabilité ferme.

    :returns: l'écart mesuré, toujours 0 en cas de succès.
    :raises ComptabiliteOuverte: si des fiches ont disparu du décompte.
    """
    ecart = ecart_de_comptabilite(manifeste["fichesDemandees"],
                                  manifeste["fichesIngerees"],
                                  manifeste["fichesRefusees"])
    if ecart != 0:
        raise ComptabiliteOuverte(
            f"comptabilité ouverte sur le niveau {manifeste['niveau']} : "
            f"{manifeste['fichesIngerees']} ingérée(s) + "
            f"{manifeste['fichesRefusees']} refusée(s) ≠ "
            f"{manifeste['fichesDemandees']} demandée(s), écart = {ecart}. "
            "AUCUN manifeste n'est écrit : une fiche traitée à moitié est pire "
            "qu'une fiche refusée.")
    ecrire_json(chemin, manifeste)
    return ecart


def agreger(manifestes: list[dict]) -> dict:
    """Le manifeste global de `scripts/ingerer.mjs`, tous niveaux confondus.

    Il porte le compte par niveau ET le total, plus le décompte des motifs de
    refus : c'est ce qui permet de lire « 90 fiches traitées ou refusées avec
    motif » sans rouvrir les sept manifestes.
    """
    motifs: dict[str, int] = {}
    for manifeste in manifestes:
        for refus in manifeste["refus"]:
            code = refus.get("code", "sans-code")
            motifs[code] = motifs.get(code, 0) + 1
    total_pdf = sum(m["fichesDuPdf"] for m in manifestes)
    total_ing = sum(m["fichesIngerees"] for m in manifestes)
    total_ref = sum(m["fichesRefusees"] for m in manifestes)
    return {
        "niveaux": [
            {"niveau": m["niveau"], "source": m["source"],
             "fichesDuPdf": m["fichesDuPdf"],
             "fichesIngerees": m["fichesIngerees"],
             "fichesRefusees": m["fichesRefusees"]}
            for m in sorted(manifestes, key=lambda m: m["niveau"])
        ],
        "fichesDuCorpus": total_pdf,
        "fichesIngerees": total_ing,
        "fichesRefusees": total_ref,
        "ecart": total_pdf - (total_ing + total_ref),
        "refusParMotif": dict(sorted(motifs.items())),
    }


def _principal(argv: list[str]) -> int:
    """`python manifeste.py <dossier-brouillons>` — agrège les manifestes de niveau.

    Ce point d'entrée existe pour que `scripts/ingerer.mjs` n'ait pas à
    RÉIMPLANTER `agreger` en JavaScript : deux implantations de la même
    comptabilité, c'est deux vérités, et c'est l'une des deux qui se trompera.
    """
    import sys

    if len(argv) != 1:
        print("usage : python manifeste.py <dossier contenu/brouillons>",
              file=sys.stderr)
        return 2
    dossier = Path(argv[0]).resolve()
    manifestes = []
    for chemin in sorted(dossier.glob("niveau-*/manifeste.json")):
        manifestes.append(json.loads(chemin.read_text(encoding="utf-8")))
    if not manifestes:
        print(f"aucun manifeste de niveau sous {dossier}", file=sys.stderr)
        return 2
    global_ = agreger(manifestes)
    ecrire_json(dossier / "manifeste.json", global_)
    print(json.dumps(global_, ensure_ascii=False, indent=2))
    return 0 if global_["ecart"] == 0 else 1


if __name__ == "__main__":
    import sys

    for _flux in (sys.stdout, sys.stderr):
        if hasattr(_flux, "reconfigure"):
            _flux.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(_principal(sys.argv[1:]))
