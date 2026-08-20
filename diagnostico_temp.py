data = open('/tmp/respuesta.html', encoding='utf-8', errors='replace').read()
start = data.find('userHtml')
end = data.find('"ncc"')
if start != -1 and end != -1:
    snippet = data[start:end]
    print('LONGITUD DEL BLOQUE userHtml (caracteres):', len(snippet))
    print('ULTIMOS 400 CARACTERES:')
    print(snippet[-400:])
else:
    print('NO SE ENCONTRO EL BLOQUE userHtml')
