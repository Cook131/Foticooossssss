# photo dump

Galería hecha con Astro, desplegada en GitHub Pages. Diseño: sketchup de ventanitas retro.

## Qué se edita

- `src/data/site.json`: nombre del sitio, color de acento, los dos nombres, texto de "about" y los pines del atlas.
- `src/photos/`: las fotos (`.webp`) y, opcionalmente, un `.json` con el mismo nombre por foto.

## Subir fotos

1. Nombra los originales `AAAA-MM-DD_descripcion.jpg` (la fecha define el orden y el texto alternativo).
2. Redimensiona y convierte a webp: `npm run resize -- /ruta/a/originales`
   (opcional: `[lado-largo-px] [calidad]`, por defecto 2200 y 80).
3. Abre los `.json` que se crearon en `src/photos` y rellena lo que quieras mostrar en el visor:

   ```json
   { "alt": "Descripción corta", "place": "Tokyo, JP", "camera": "Canon AE-1",
     "lens": "50mm f/1.8", "settings": "f/8 · 1/250 · ISO 400", "by": "Nombre" }
   ```

   Lo que quede vacío se muestra como "—". La fecha sale del nombre del archivo
   (o ponla en el `.json` como `"date": "2026-10-01"`).
4. Commit y push a `main`; el sitio se actualiza solo en 1-2 minutos.

El script quita el EXIF al convertir (incluida la ubicación GPS), así que el lugar
se escribe a mano en el `.json`.

## Desarrollo local

```bash
npm install
npm run dev
```
