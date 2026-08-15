"""Busca usos de const/let de nivel superior ANTES de su declaración.

node --check no ve esto: sintácticamente es válido y solo truena al correr.
Nos mordió dos veces seguidas —t0 y ESCALA— así que ahora se revisa siempre.
"""
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
js = re.findall(r'<script>(.*?)</script>', s, re.S)[-1]
lineas = js.split('\n')

# ¿qué líneas están DENTRO de una función? Ahí una referencia adelantada es
# legítima, porque se evalúa después. Fuera, se evalúa al cargar.
dentro, prof, pilaFn = [], 0, []
for ln in lineas:
    limpia = re.sub(r'//.*', '', ln)
    esFn = re.search(r'\b(function\b|=>)', limpia) is not None
    dentro.append(len(pilaFn) > 0)
    for ch in limpia:
        if ch == '{':
            prof += 1
            if esFn and not pilaFn: pilaFn.append(prof)
        elif ch == '}':
            if pilaFn and prof == pilaFn[-1]: pilaFn.pop()
            prof -= 1

decls = {}
for i, ln in enumerate(lineas):
    m = re.match(r'^(?:const|let)\s+([A-Za-z_$][\w$]*)', ln)
    if m and not dentro[i]:
        decls.setdefault(m.group(1), i)

problemas = []
for nombre, li in decls.items():
    for i, ln in enumerate(lineas[:li]):
        if dentro[i]: continue
        if re.search(r'\b' + re.escape(nombre) + r'\b', re.sub(r'//.*|/\*.*?\*/', '', ln)):
            problemas.append((nombre, i + 1, li + 1, lineas[i].strip()[:64]))
            break

if problemas:
    print('USOS ANTES DE LA DECLARACIÓN (ReferenceError al cargar):')
    for n, u, d, t in problemas:
        print('  %-14s se usa en la línea %d y se declara en la %d' % (n, u, d))
        print('                 %s' % t)
    sys.exit(1)
print('  ningún const/let de nivel superior se usa antes de declararse')
