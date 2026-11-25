// Uso: npm run resize -- <carpeta-con-originales> [lado-largo-px] [calidad]
// Convierte a webp (rotando según EXIF), lo deja en src/photos y crea un .json
// con los campos de metadata para rellenar (place, camera, lens, settings, by, alt).
// sharp NO conserva el EXIF al convertir: así no se publica la ubicación GPS por accidente.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , inDir, maxSide = "2200", quality = "88"] = process.argv;
if (!inDir) {
  console.error("Uso: npm run resize -- <carpeta> [lado-largo-px=2200] [calidad=88]");
  process.exit(1);
}

const OUT = "src/photos";
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(inDir).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f));
if (files.length === 0) {
  console.error(`No encontré imágenes en ${inDir}`);
  process.exit(1);
}

const template = { alt: "", place: "", camera: "", lens: "", settings: "", by: "" };

for (const file of files) {
  const name = path.parse(file).name;
  const dest = path.join(OUT, name + ".webp");
  if (fs.existsSync(dest)) {
    console.log(`= ya existe, omito: ${dest}`);
    continue;
  }
  await sharp(path.join(inDir, file))
    .rotate()
    .resize({ width: +maxSide, height: +maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality: +quality })
    .toFile(dest);

  const sidecar = path.join(OUT, name + ".json");
  if (!fs.existsSync(sidecar)) {
    fs.writeFileSync(sidecar, JSON.stringify(template, null, 2) + "\n");
  }
  console.log(`+ ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
}
