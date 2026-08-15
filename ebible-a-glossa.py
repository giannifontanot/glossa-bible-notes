#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ebible-a-glossa.py — convierte los USFM de eBible.org al formato de datos
que consume el lector Glossa.

Uso:
    python ebible-a-glossa.py                      # Marcos, VBL + RVR1909
    python ebible-a-glossa.py --libros MRK LUK JHN
    python ebible-a-glossa.py --libros TODOS       # la Biblia completa
    python ebible-a-glossa.py --salida prueba.js   # sin pisar el bueno

Solo usa la biblioteca estándar: urllib para bajar y zipfile para abrir.
No hace falta instalar nada.

Licencias — importante, y va en el archivo generado:
  · spaRV1909 (Reina Valera 1909): dominio público.
  · spavbl (Versión Biblia Libre): CC BY-SA 4.0, de Jonathan Gallagher y
    Shelly Barrios de Ávila. Obliga a dar crédito y a no alterar el texto.
    Si distribuyes Glossa con este texto, el crédito tiene que ir visible.
"""

import argparse, io, json, os, re, sys, unicodedata, urllib.request, zipfile

VERSIONES = {
    'vbl':    {'id': 'spavbl',
               'nombre': 'Versión Biblia Libre',
               'abrev': 'VBL',
               'licencia': 'CC BY-SA 4.0 — Jonathan Gallagher y Shelly Barrios de Ávila'},
    'rv1909': {'id': 'spaRV1909',
               'nombre': 'Reina Valera 1909',
               'abrev': 'RVR1909',
               'licencia': 'Dominio público'},
    'bes':    {'id': 'spabes',
               'nombre': 'La Biblia en Español Sencillo',
               'abrev': 'BES',
               'licencia': 'CC BY 4.0 — AudioBiblia.org / Irma Flores'},
    'pdt':    {'id': 'spapdt',
               'nombre': 'Palabra de Dios para ti',
               'abrev': 'PDT',
               'licencia': 'CC BY-SA 4.0 — Asociación Bíblica Latinoamericana'},

    # --- inglés ---
    # Las tres están en dominio público, que es la situación más limpia que
    # hay: no obligan a nada. La BSB se liberó el 30 de abril de 2023 bajo
    # CC0; la WEB y la MSB nacieron sin copyright.
    'bsb':    {'id': 'engbsb',
               'nombre': 'Berean Standard Bible',
               'abrev': 'BSB',
               'licencia': 'Dominio público (CC0 desde 2023-04-30)'},
    'web':    {'id': 'engwebp',
               'nombre': 'World English Bible',
               'abrev': 'WEB',
               'licencia': 'Dominio público'},
    'msb':    {'id': 'engmsb',
               'nombre': 'Majority Standard Bible',
               'abrev': 'MSB',
               'licencia': 'Dominio público'},
}
# Por omisión se bajan solo dos; para todas: --versiones vbl rv1909 bsb web
POR_OMISION = ['vbl', 'rv1909']

# Los USFM usan códigos de tres letras; aquí solo los nombres en español de
# los que se piden. Se puede ampliar sin tocar nada más.
NOMBRES = {
    'GEN':'Génesis','EXO':'Éxodo','LEV':'Levítico','NUM':'Números','DEU':'Deuteronomio',
    'JOS':'Josué','JDG':'Jueces','RUT':'Rut','1SA':'1 Samuel','2SA':'2 Samuel',
    '1KI':'1 Reyes','2KI':'2 Reyes','1CH':'1 Crónicas','2CH':'2 Crónicas','EZR':'Esdras',
    'NEH':'Nehemías','EST':'Ester','JOB':'Job','PSA':'Salmos','PRO':'Proverbios',
    'ECC':'Eclesiastés','SNG':'Cantares','ISA':'Isaías','JER':'Jeremías','LAM':'Lamentaciones',
    'EZK':'Ezequiel','DAN':'Daniel','HOS':'Oseas','JOL':'Joel','AMO':'Amós','OBA':'Abdías',
    'JON':'Jonás','MIC':'Miqueas','NAM':'Nahúm','HAB':'Habacuc','ZEP':'Sofonías',
    'HAG':'Hageo','ZEC':'Zacarías','MAL':'Malaquías',
    'MAT':'Mateo','MRK':'Marcos','LUK':'Lucas','JHN':'Juan','ACT':'Hechos',
    'ROM':'Romanos','1CO':'1 Corintios','2CO':'2 Corintios','GAL':'Gálatas','EPH':'Efesios',
    'PHP':'Filipenses','COL':'Colosenses','1TH':'1 Tesalonicenses','2TH':'2 Tesalonicenses',
    '1TI':'1 Timoteo','2TI':'2 Timoteo','TIT':'Tito','PHM':'Filemón','HEB':'Hebreos',
    'JAS':'Santiago','1PE':'1 Pedro','2PE':'2 Pedro','1JN':'1 Juan','2JN':'2 Juan',
    '3JN':'3 Juan','JUD':'Judas','REV':'Apocalipsis',
}

# Atajos para --libros. El orden de NOMBRES es el canónico, así que el corte
# entre los dos Testamentos es simplemente dónde empieza Mateo: no hay que
# escribir las dos listas a mano ni mantenerlas sincronizadas.
ORDEN = list(NOMBRES)
ANTIGUO = ORDEN[:ORDEN.index('MAT')]
NUEVO   = ORDEN[ORDEN.index('MAT'):]
GRUPOS = {
    'AT': ANTIGUO, 'ANTIGUO': ANTIGUO, 'OT': ANTIGUO,     # Antiguo Testamento
    'NT': NUEVO,   'NUEVO':   NUEVO,                      # Nuevo Testamento
    'EVANGELIOS': ['MAT', 'MRK', 'LUK', 'JHN'],
    'PABLO': ['ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH',
              '1TI','2TI','TIT','PHM'],
}


def resolver_libros(pedidos):
    """Convierte lo que se pidió en --libros a un conjunto de códigos USFM.

    Acepta códigos sueltos (MRK), atajos de grupo (NT, AT, EVANGELIOS, PABLO)
    y la palabra TODOS, y se pueden mezclar: --libros NT PSA PRO.

    Valida cada código. Antes no lo hacía, y un dedazo como MARK o MRC pasaba
    en silencio: el script no encontraba ese libro en el USFM, no protestaba,
    y escribía un archivo vacío. Un error que no avisa es peor que uno que
    truena."""
    if any(p.upper() == 'TODOS' for p in pedidos):
        return 'TODOS'
    salida = set()
    for p in pedidos:
        k = p.upper()
        if k in GRUPOS:
            salida.update(GRUPOS[k])
        elif k in NOMBRES:
            salida.add(k)
        else:
            cerca = [c for c in NOMBRES if c.startswith(k[:2])]
            raise SystemExit(
                '\nNo conozco el libro "%s".\n'
                'Códigos parecidos: %s\n'
                'Atajos: TODOS, AT, NT, EVANGELIOS, PABLO\n'
                % (p, ', '.join(cerca) if cerca else '(ninguno)'))
    return salida


URLS_ZIP = [
    'https://ebible.org/Scriptures/{id}_usfm.zip',
    'https://ebible.org/Scriptures/{id}_usfm.zip'.lower(),
]


# ---------------------------------------------------------------- descarga
def bajar_zip(vid, cache='.cache-ebible'):
    os.makedirs(cache, exist_ok=True)
    destino = os.path.join(cache, vid + '_usfm.zip')
    if os.path.exists(destino) and os.path.getsize(destino) > 1000:
        print('  · usando copia local:', destino)
        return destino
    ultimo_error = None
    for plantilla in URLS_ZIP:
        url = plantilla.format(id=vid)
        try:
            print('  · bajando', url)
            req = urllib.request.Request(url, headers={'User-Agent': 'glossa-converter/1.0'})
            with urllib.request.urlopen(req, timeout=90) as r, open(destino, 'wb') as f:
                f.write(r.read())
            return destino
        except Exception as e:
            ultimo_error = e
    raise SystemExit(
        '\nNo pude bajar el USFM de "%s" (%s).\n'
        'Bájalo a mano desde https://ebible.org/find/details.php?id=%s\n'
        'y guárdalo como %s\n' % (vid, ultimo_error, vid, destino))


# ------------------------------------------------------------ USFM a texto
# ---------------------------------------------------------------- limpieza
#
# Regla de oro: los marcadores se borran, el TEXTO nunca. La versión anterior
# emparejaba aperturas con cierres usando un backreference —\\X ... \\X*— y eso
# se rompía con los marcadores anidados del USFM (\\wj “...\\+w it\\+w*...\\wj*):
# un cierre interior cerraba una apertura exterior y todo lo que había en medio
# se descartaba. No sobraban marcas: FALTABAN palabras del versículo, que es
# muchísimo peor porque no se nota leyendo por encima.
#
# Ahora no hay emparejamiento. Solo dos clases de marcador:
#   · los que se llevan su contenido (notas al pie, referencias, ilustraciones)
#   · todos los demás, de los que se borra la marca y se conserva lo de adentro

# Marcadores cuyo contenido NO es texto bíblico y se va completo.
RE_NOTA      = re.compile(r'\\(f|fe|ef|x|ex|fig|rq|va|vp)\b.*?\\\1\*', re.S)
# Hitos de alineación y demás: \zaln-s |x-strong="G2424"\*  ...  \zaln-e\*
RE_HITO      = re.compile(r'\\[a-zA-Z][\w-]*-[se]\b[^\\]*?\\\*')
# Atributos USFM: van de la barra vertical hasta el siguiente marcador.
#   \w diciendo|strong="G3004"\w*   ->   \w diciendo\w*
RE_ATRIB     = re.compile(r'\|[^\\\n]*')
# Cualquier marcador que quede, de apertura o de cierre. Solo la marca.
RE_MARCA     = re.compile(r'\\\+?[a-zA-Z0-9\-]+\*?')
RE_ESPACIOS  = re.compile(r'[ \t\u00a0]+')


def limpiar(t):
    t = RE_NOTA.sub(' ', t)
    t = RE_HITO.sub(' ', t)
    t = RE_ATRIB.sub('', t)
    t = RE_MARCA.sub(' ', t)
    t = t.replace('\n', ' ')
    t = RE_ESPACIOS.sub(' ', t).strip()
    t = re.sub(r'\s+([,.;:!?»”’])', r'\1', t)
    return re.sub(r'([«“¿¡])\s+', r'\1', t)


# Marcadores de bloque cuyo CONTENIDO es un encabezado, no texto del versículo:
# títulos de sección, referencias del título, encabezados de salmo, etc. En el
# USFM van en su propia línea, ENTRE dos versículos:
#
#     \v 27 Indeed, no one can enter a strong man's house...
#     \s1 The Unpardonable Sin
#     \r (Matthew 12:31-32)
#     \v 28 Truly I tell you...
#
# El parser metía toda línea suelta al versículo abierto, así que el título del
# bloque SIGUIENTE acababa dentro del versículo ANTERIOR. En la BSB eso ensució
# más de trescientos versículos.
RE_ENCABEZADO = re.compile(
    r'\\(s\d?|ms\d?|mr|sr|sp|d|r|cl|cp|mt\d?|mte\d?|imt\d?|is\d?|io\d?|ip|iot|ie|'
    r'toc\d?|toca\d?|h|id|ide|rem|periph|b|nb)\b')


def parsear_usfm(texto):
    """Devuelve {capitulo: [versiculo1, versiculo2, ...]}."""
    caps, cap_actual, vers_actual, buffer = {}, None, None, []

    def cerrar_versiculo():
        if cap_actual is not None and vers_actual is not None:
            t = limpiar(' '.join(buffer))
            if t:
                caps.setdefault(cap_actual, {})[vers_actual] = t

    for linea in texto.split('\n'):
        mc = re.match(r'\\c\s+(\d+)', linea)
        if mc:
            cerrar_versiculo()
            buffer = []
            cap_actual, vers_actual = int(mc.group(1)), None
            continue
        mv = re.match(r'\\v\s+(\d+)(?:-(\d+))?\s*(.*)', linea)
        if mv:
            cerrar_versiculo()
            # los versículos unidos (\v 9-10) se guardan en el primer número
            vers_actual = int(mv.group(1))
            buffer = [mv.group(3)]
            continue
        if RE_ENCABEZADO.match(linea.strip()):
            continue                            # título de sección, no versículo
        if vers_actual is not None:
            buffer.append(linea)
    cerrar_versiculo()

    salida = {}
    for c, vs in caps.items():
        if not vs:
            continue
        tope = max(vs)
        salida[c] = [vs.get(i, '') for i in range(1, tope + 1)]
    return salida


def extraer(ruta_zip, libros):
    """Saca {LIBRO: {capitulo: [versiculos]}} del zip de una versión."""
    resultado = {}
    with zipfile.ZipFile(ruta_zip) as z:
        for nombre in z.namelist():
            if not nombre.lower().endswith(('.usfm', '.sfm')):
                continue
            crudo = z.read(nombre).decode('utf-8', errors='replace')
            mid = re.search(r'\\id\s+([A-Z0-9]{3})', crudo)
            if not mid:
                continue
            libro = mid.group(1)
            if libros != 'TODOS' and libro not in libros:
                continue
            caps = parsear_usfm(crudo)
            if caps:
                resultado[libro] = caps
    return resultado


# --------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--libros', nargs='+', default=['MRK'],
                    help='códigos USFM (MRK LUK JHN) o atajos: '
                         'TODOS, AT, NT, EVANGELIOS, PABLO')
    ap.add_argument('--salida', default='bibles-included.js')
    ap.add_argument('--versiones', nargs='+', default=POR_OMISION,
                    help='español: vbl rv1909 bes pdt · inglés: bsb web msb')
    args = ap.parse_args()

    libros = resolver_libros(args.libros)
    print('libros pedidos: %s' % ('los 66' if libros == 'TODOS' else '%d (%s)' % (
        len(libros), ', '.join(sorted(libros, key=ORDEN.index)))))
    datos = {'versiones': {}, 'libros': []}
    orden_libros, cuenta_caps = [], {}

    for clave in args.versiones:
        if clave not in VERSIONES:
            raise SystemExit('versión desconocida: ' + clave)
        v = VERSIONES[clave]
        print('%s (%s)' % (v['nombre'], v['id']))
        texto = extraer(bajar_zip(v['id']), libros)
        datos['versiones'][clave] = {
            'nombre': v['nombre'], 'abrev': v['abrev'],
            'licencia': v['licencia'], 'texto': texto,
        }
        for libro, caps in texto.items():
            if libro not in orden_libros:
                orden_libros.append(libro)
            cuenta_caps[libro] = max(cuenta_caps.get(libro, 0), max(caps))
        print('  · %d libro(s), %d versículos'
              % (len(texto), sum(len(c) for caps in texto.values() for c in caps.values())))

    datos['libros'] = [{'id': b, 'nombre': NOMBRES.get(b, b), 'capitulos': cuenta_caps[b]}
                       for b in orden_libros]

    # Aviso: si dos versiones no coinciden en cuántos versículos tiene un
    # capítulo, el anclaje por referencia va a cojear justo ahí.
    claves = list(datos['versiones'])
    if len(claves) > 1:
        a, b = claves[0], claves[1]
        for libro in orden_libros:
            ca = datos['versiones'][a]['texto'].get(libro, {})
            cb = datos['versiones'][b]['texto'].get(libro, {})
            for cap in sorted(set(ca) & set(cb)):
                if len(ca[cap]) != len(cb[cap]):
                    print('  ! %s %d: %s tiene %d versículos y %s tiene %d'
                          % (libro, cap, a, len(ca[cap]), b, len(cb[cap])))

    # Red de seguridad: si algún marcador nuevo se cuela, que se sepa ANTES
    # de escribir el archivo. Es lo que faltó la primera vez —los números de
    # Strong se fueron al lector sin que nada avisara.
    sospechosos = []
    for clave, v in datos['versiones'].items():
        for libro, caps in v['texto'].items():
            for cap, versos in caps.items():
                for i, t in enumerate(versos, 1):
                    # Ojo: NO se busca la palabra "strong". La buscaba antes y
                    # daba falsa alarma en las Biblias en inglés, donde "a
                    # strong man's house" es texto legítimo. Lo que delata un
                    # resto de USFM es la diagonal invertida o un atributo.
                    if '\\' in t or re.search(r'\|\s*[a-zA-Z\-]+\s*=', t):
                        sospechosos.append('%s %s %d:%d  %s' % (clave, libro, cap, i, t[:70]))
    if sospechosos:
        print('\n  !! %d versículo(s) traen marcas sin limpiar:' % len(sospechosos))
        for x in sospechosos[:8]:
            print('     ' + x)
        if len(sospechosos) > 8:
            print('     ... y %d más' % (len(sospechosos) - 8))
        print('     Revisa limpiar() antes de usar el archivo.')
    else:
        print('\n  texto limpio: sin marcadores, atributos ni números de Strong')

    js = ('/* Generado por ebible-a-glossa.py — no editar a mano.\n'
          '   Fuente: eBible.org\n'
          + ''.join('   %s: %s\n' % (v['nombre'], v['licencia'])
                    for v in datos['versiones'].values())
          + '*/\n'
          'window.GLOSSA_DATA = ' + json.dumps(datos, ensure_ascii=False) + ';\n')
    with open(args.salida, 'w', encoding='utf-8') as f:
        f.write(js)
    print('\nEscrito %s (%.1f KB)' % (args.salida, len(js.encode('utf-8')) / 1024))
    print('\nCréditos que hay que mostrar si distribuyes esto:')
    for v in datos['versiones'].values():
        print('  · %s — %s' % (v['nombre'], v['licencia']))


if __name__ == '__main__':
    main()
