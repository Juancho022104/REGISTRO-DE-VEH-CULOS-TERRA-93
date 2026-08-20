# Proyecto: Registro de Vehículos - Zona de Cargadores (Terra 93 PH)

Formulario web independiente en Google Apps Script. Guarda las
solicitudes en la hoja `Registro_Vehiculos_Cargadores` de un Google
Sheets externo (abierto por ID, no vinculado) y los anexos en carpetas
de Drive organizadas por apartamento.

## Regla obligatoria: la página inicial de `doGet()` debe ser pequeña

**Motivo (lección aprendida):** cuando una web app de Apps Script se
publica con el modo de entrega "iframe sandbox" (el que usa Google por
defecto), la primera página que entrega `doGet()` se empaqueta entera
dentro de un bloque de texto que Google inyecta en un iframe de otro
dominio (`googleusercontent.com`). Ese empaquetado tiene un **límite de
tamaño no documentado**. Si el HTML/CSS/JS combinado de esa primera
página lo supera, Google la **trunca silenciosamente, sin ningún error
visible** — el navegador recibe HTML roto a la mitad y la página queda
en blanco. No hay excepción, no hay log de error, nada: solo una
página vacía.

Esto ya pasó en este proyecto: un formulario grande (6 secciones,
firma digital, subida de 6 anexos) embebido directo en `Index.html` +
`CSS.html` + `JS.html` producía una página en blanco. Se confirmó con
`curl` directo contra la URL `/exec` (necesario porque el navegador no
mostraba ningún error) que el contenido se cortaba siempre en el mismo
byte, sin importar el contenido exacto ni el número de versión
desplegada.

**Regla a seguir en este proyecto y en cualquier otro Apps Script
similar:**

1. La página que sirve `doGet()` (`Index.html` + su CSS + su JS
   inline) debe ser **mínima**: un esqueleto de página, sin el
   contenido pesado del formulario.
2. Cualquier HTML grande (formularios largos, tablas, listas) se sirve
   **bajo demanda** con `google.script.run`, nunca embebido en la
   página inicial. Patrón usado aquí:
   - `Code.js` expone una función tipo `obtenerFormularioHTML()` que
     devuelve `HtmlService.createHtmlOutputFromFile("Formulario").getContent()`.
   - `JS.html` en `window.onload` llama a
     `google.script.run.withSuccessHandler(...).obtenerFormularioHTML()`
     y mete el resultado en `innerHTML` de un contenedor vacío.
   - El contenido pesado vive en un archivo `.html` aparte (ej.
     `Formulario.html`) que **no** se incluye en `Index.html`.
3. Antes de agregar más secciones/campos a un formulario existente,
   verificar que `Index.html + CSS.html + JS.html` (lo que sí va en la
   página inicial) se mantenga pequeño. Si crece mucho, mover más
   contenido a archivos servidos por RPC.
4. El workflow de despliegue (`.github/workflows/deploy.yml`) incluye
   un paso que mide ese tamaño combinado y **falla el despliegue** si
   supera el umbral de seguridad — ver el paso "Verificar tamaño de la
   página inicial". Si ese paso falla, la solución es mover contenido
   a un archivo servido por RPC, no subir el umbral.

## Otras notas operativas

- `clasp push` (lo hace el GitHub Action en cada push a `main`) solo
  sube el código fuente al proyecto de Apps Script. **No** actualiza la
  implementación (deployment) ya publicada. Después de cada cambio de
  código, hay que entrar al editor de Apps Script → Implementar →
  Administrar implementaciones → editar → "Nueva versión" → Implementar,
  para que el cambio se vea reflejado en la URL pública `/exec`.
- Si se agrega un nuevo scope de OAuth en `appsscript.json` (por
  ejemplo Drive), hay que ejecutar manualmente, una vez, desde el
  editor, alguna función que use ese servicio (no basta con una función
  vacía tipo "probar conexión") para que aparezca la pantalla de
  autorización y el dueño del script la acepte.
