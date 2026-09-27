"""Assemble des suites de clips Ponts et vérifie leur phrase entendue localement.

Les Opus d'entrée ne sont jamais recréés : les assemblages reproduisent l'ordre
de `direSequence`, puis servent de témoins de contrôle dans les brouillons.
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

from faster_whisper import WhisperModel

RACINE = Path(__file__).resolve().parents[2]
PONTS = RACINE / 'contenu' / 'brouillons' / 'mathematiques' / 'audio' / 'ponts'
SORTIE = PONTS / 'assemblages'
RAPPORT_RENDU = PONTS / 'rapport-rendu.json'
RAPPORT = PONTS / 'rapport-qc-assemblages.json'
MODELE = RACINE / 'outils' / 'bin' / 'tts' / 'whisper' / 'models--Systran--faster-whisper-large-v3' / 'snapshots' / 'edaa852ec7e145841d8ffdb056a99866b5f0a478'

spec = importlib.util.spec_from_file_location('qc_ponts', RACINE / 'scripts' / 'mathematiques' / 'qc-audio-ponts.py')
if spec is None or spec.loader is None:
    raise RuntimeError('Le contrôleur audio Ponts est introuvable.')
qc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qc)

ASSEMBLAGES = [
    {
        'cle': 'bornes-10-20-pas-10', 'role': 'phrase-runtime',
        'attendu': 'Place les bornes dix et vingt sur la rive graduée de dix en dix.',
        'sources': ['maths/ponts-bornes-v1-deux/segment-0', 'maths/nombres/10',
                    'maths/ponts-bornes-v1-deux/segment-2', 'maths/nombres/20',
                    'maths/ponts-bornes-v1-deux/segment-4', 'maths/nombres/10',
                    'maths/ponts-bornes-v1-deux/segment-6', 'maths/nombres/10'],
    },
    {
        'cle': 'gobi-portee-16', 'role': 'phrase-runtime',
        'attendu': 'La portée mesure seize centimètres. Cherche des planches raccordées.',
        'sources': ['maths/ponts-planches-v1-demo/segment-0', 'maths/gobi/nombres/16',
                    'maths/ponts-planches-v1-demo/segment-2'],
        'nombre': 16,
        'temoin': 'gobi-portee-6',
    },
    {
        'cle': 'gobi-portee-6', 'role': 'temoin-negatif',
        'attendu': 'La portée mesure six centimètres. Cherche des planches raccordées.',
        'sources': ['maths/ponts-planches-v1-demo/segment-0', 'maths/gobi/nombres/6',
                    'maths/ponts-planches-v1-demo/segment-2'],
        'nombre': 6,
        'substitutionDe': 'gobi-portee-16',
    },
    {
        'cle': 'tablier-1', 'role': 'phrase-runtime',
        'attendu': 'Assemble des modules pour franchir un centimètres.',
        'sources': ['maths/ponts-tablier-v1/segment-0', 'maths/nombres/1',
                    'maths/ponts-tablier-v1/segment-2'],
        'nombre': 1,
        'temoin': 'tablier-2',
    },
    {
        'cle': 'tablier-2', 'role': 'temoin-negatif',
        'attendu': 'Assemble des modules pour franchir deux centimètres.',
        'sources': ['maths/ponts-tablier-v1/segment-0', 'maths/nombres/2',
                    'maths/ponts-tablier-v1/segment-2'],
        'nombre': 2,
        'substitutionDe': 'tablier-1',
    },
    {
        'cle': 'gobi-compte-10', 'role': 'phrase-runtime',
        'attendu': 'Compte de dix en dix sur la rive.',
        'sources': ['maths/ponts-bornes-v1-indice/segment-0', 'maths/gobi/nombres/10',
                    'maths/ponts-bornes-v1-indice/segment-2', 'maths/gobi/nombres/10',
                    'maths/ponts-bornes-v1-indice/segment-4'],
    },
]

def lire_sources() -> dict:
    rendu = json.loads(RAPPORT_RENDU.read_text(encoding='utf-8'))
    return {clip['cle']: RACINE / clip['fichier'] for clip in rendu['clips'] if clip['ok']}

def assembler(definition: dict, sources: dict) -> Path:
    SORTIE.mkdir(parents=True, exist_ok=True)
    destination = SORTIE / f"{definition['cle']}.opus"
    liste = SORTIE / f"{definition['cle']}.concat.txt"
    chemins = [sources[cle] for cle in definition['sources']]
    if not all(chemin.exists() for chemin in chemins):
        raise RuntimeError(f"Clip absent pour {definition['cle']}")
    liste.write_text(''.join(f"file '{chemin.as_posix()}'\n" for chemin in chemins), encoding='utf-8')
    commande = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(liste),
                '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-application', 'voip', str(destination)]
    resultat = subprocess.run(commande, text=True, capture_output=True, check=False)
    liste.unlink(missing_ok=True)
    if resultat.returncode != 0:
        raise RuntimeError(f"Assemblage {definition['cle']} refusé : {resultat.stderr[:400]}")
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(destination), '-f', 'null', '-'], check=True)
    return destination

def main() -> int:
    if not RAPPORT_RENDU.exists() or not MODELE.exists():
        print('Rendu Ponts ou modèle local absent.', file=sys.stderr)
        return 2
    sources = lire_sources()
    model = WhisperModel(str(MODELE), device='cpu', compute_type='int8')
    details = []
    for definition in ASSEMBLAGES:
        audio = assembler(definition, sources)
        segments, _ = model.transcribe(str(audio), language='fr', beam_size=5, vad_filter=False,
                                      condition_on_previous_text=False)
        entendu = ' '.join(segment.text for segment in segments)
        mesure = qc.evaluer(definition['cle'], definition['attendu'], entendu)
        details.append({**definition, 'fichier': str(audio.relative_to(RACINE)).replace('\\', '/'), **mesure})
    par_cle = {detail['cle']: detail for detail in details}
    distinction = []
    for detail in details:
        if 'substitutionDe' not in detail:
            continue
        original = par_cle[detail['substitutionDe']]
        mot_temoin = qc.nombre_en_francais(detail['nombre'])
        mot_original = qc.nombre_en_francais(original['nombre'])
        mots_entendus = detail['entendu'].split()
        trouve_temoin = mot_temoin in ' '.join(mots_entendus)
        trouve_original = mot_original in ' '.join(mots_entendus)
        distinction.append({
            'temoin': detail['cle'], 'original': original['cle'],
            'nombreTemoin': mot_temoin, 'nombreOriginal': mot_original,
            'scoreTemoin': detail['score'], 'entendTemoin': trouve_temoin, 'entendOriginal': trouve_original,
            'distingue': detail['score'] >= 0.85 and trouve_temoin and not trouve_original,
        })
    echecs = [detail['cle'] for detail in details if detail['score'] < 0.85]
    echecs += [f"distinction:{ligne['temoin']}" for ligne in distinction if not ligne['distingue']]
    RAPPORT.write_text(json.dumps({
        'version': 1, 'instrument': 'faster-whisper/large-v3/cpu-int8-local', 'mode': 'assemblages-runtime',
        'seuil': 0.85, 'details': details, 'distinction': distinction, 'echecs': echecs,
        'limite': 'Ces assemblages vérifient des clips juxtaposés. Le visa parent reste nécessaire pour le rythme et la compréhension CE1.',
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"QC assemblages : {len(details)} phrases, {len(echecs)} échecs.")
    return 1 if echecs else 0

if __name__ == '__main__':
    sys.exit(main())
