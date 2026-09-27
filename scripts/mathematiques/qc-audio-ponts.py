"""Transcription inverse locale des brouillons Ponts, sans téléchargement ni manifeste officiel."""
import difflib
import json
import sys
import unicodedata
from pathlib import Path

from faster_whisper import WhisperModel

RACINE = Path(__file__).resolve().parents[2]
PONTS = RACINE / 'contenu' / 'brouillons' / 'mathematiques' / 'audio' / 'ponts'
RAPPORT_RENDU = PONTS / 'rapport-rendu.json'
RAPPORT_QC = PONTS / 'rapport-qc.json'
MODELE = RACINE / 'outils' / 'bin' / 'tts' / 'whisper' / 'models--Systran--faster-whisper-large-v3' / 'snapshots' / 'edaa852ec7e145841d8ffdb056a99866b5f0a478'
NOMBRES_DIFFICILES = {0, 1, 10, 11, 16, 17, 20, 21, 30, 40, 50, 70, 71, 80, 90, 100, 110, 200, 300, 1000}

def nombre_en_francais(nombre: int) -> str:
    """Même écriture que le renderer : Whisper peut préférer « 230 »."""
    unites = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
    dix_a_seize = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
    dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']
    if nombre < 10:
        return unites[nombre]
    if nombre < 17:
        return dix_a_seize[nombre - 10]
    if nombre < 20:
        return f'dix {unites[nombre - 10]}'
    if nombre < 70:
        dizaine, unite = divmod(nombre, 10)
        return dizaines[dizaine] if unite == 0 else f"{dizaines[dizaine]} {'et un' if unite == 1 else unites[unite]}"
    if nombre < 80:
        return f'soixante {nombre_en_francais(nombre - 60)}'
    if nombre < 100:
        return 'quatre vingts' if nombre == 80 else f'quatre vingt {nombre_en_francais(nombre - 80)}'
    if nombre == 1000:
        return 'mille'
    centaine, reste = divmod(nombre, 100)
    prefixe = 'cent' if centaine == 1 else f'{unites[centaine]} cents'
    if reste == 0:
        return prefixe
    return f"{prefixe.rstrip('s')} {nombre_en_francais(reste)}"

def normaliser(texte: str) -> str:
    texte = ''.join(c for c in unicodedata.normalize('NFD', texte.lower()) if unicodedata.category(c) != 'Mn')
    texte = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in texte)
    return ' '.join(nombre_en_francais(int(mot)) if mot.isdigit() and 0 <= int(mot) <= 1000 else mot for mot in texte.split())

def evaluer(cle: str, attendu: str, entendu: str) -> dict:
    attendu_normalise = normaliser(attendu)
    entendu_normalise = normaliser(entendu)
    score = difflib.SequenceMatcher(None, attendu_normalise, entendu_normalise).ratio() if attendu_normalise else 0.0
    if len(attendu_normalise.split()) < 3 and attendu_normalise in entendu_normalise.split():
        score = 1.0
    return {'cle': cle, 'attendu': attendu_normalise, 'entendu': entendu_normalise, 'score': round(score, 4)}

def ecrire_rapport(details: list[dict]) -> int:
    incorrects = [detail for detail in details if detail['score'] < 0.85]
    RAPPORT_QC.write_text(json.dumps({
        'version': 1, 'instrument': 'faster-whisper/large-v3/cpu-int8-local', 'mode': 'échantillon',
        'controles': len(details), 'segmentsFixes': sum('/nombres/' not in d['cle'] for d in details),
        'nombresDifficiles': sum('/nombres/' in d['cle'] for d in details),
        'seuil': 0.85, 'incorrects': incorrects, 'details': details,
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'QC inverse : {len(details)} clips, {len(incorrects)} sous 0,85.')
    return 1 if incorrects else 0

def main() -> int:
    if '--revalider' in sys.argv:
        if not RAPPORT_QC.exists():
            print('Rapport QC absent.', file=sys.stderr)
            return 2
        precedent = json.loads(RAPPORT_QC.read_text(encoding='utf-8'))
        return ecrire_rapport([evaluer(detail['cle'], detail['attendu'], detail['entendu']) for detail in precedent['details']])
    if not RAPPORT_RENDU.exists() or not MODELE.exists():
        print('Rapport de rendu ou modèle large-v3 local absent.', file=sys.stderr)
        return 2
    rendu = json.loads(RAPPORT_RENDU.read_text(encoding='utf-8'))
    selection = []
    for clip in rendu['clips']:
        cle = clip['cle']
        if '/nombres/' not in cle:
            selection.append(clip)
        elif int(cle.rsplit('/', 1)[1]) in NOMBRES_DIFFICILES:
            selection.append(clip)
    modele = WhisperModel(str(MODELE), device='cpu', compute_type='int8')
    details = []
    for clip in selection:
        attendu = normaliser(clip['texte'])
        chemin = RACINE / clip['fichier']
        segments, _ = modele.transcribe(str(chemin), language='fr', beam_size=5, vad_filter=False,
            condition_on_previous_text=False, no_speech_threshold=1.0 if len(attendu.split()) < 3 else 0.6)
        entendu = normaliser(' '.join(segment.text for segment in segments))
        details.append(evaluer(clip['cle'], attendu, entendu))
    return ecrire_rapport(details)

if __name__ == '__main__':
    sys.exit(main())
