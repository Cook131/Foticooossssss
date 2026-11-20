import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

type Sidecar = {
  alt?: string;
  camera?: string;
  lens?: string;
  settings?: string;
  place?: string;
  by?: string;
  date?: string;
};

export type Photo = Required<Sidecar> & {
  file: string;
  img: ImageMetadata;
  full: string;
};

const images = import.meta.glob<{ default: ImageMetadata }>(
  "../photos/*.{jpg,jpeg,png,webp,avif}",
  { eager: true }
);
const sidecars = import.meta.glob<{ default: Sidecar }>("../photos/*.json", {
  eager: true,
});

const fileName = (p: string) => p.split("/").pop()!;
const stem = (f: string) => f.replace(/\.[^.]+$/, "");
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})[_-]?/;

// Las fotos se nombran "AAAA-MM-DD_descripcion.webp"; de ahí salen fecha y texto alternativo.
export async function loadPhotos(): Promise<Photo[]> {
  const photos = await Promise.all(
    Object.entries(images).map(async ([path, mod]) => {
      const file = fileName(path);
      const name = stem(file);
      const meta = sidecars[`../photos/${name}.json`]?.default ?? {};
      const fallbackAlt = name.replace(DATE_PREFIX, "").replace(/[_-]+/g, " ").trim() || name;

      return {
        file,
        img: mod.default,
        full: (await getImage({ src: mod.default, width: 1600, format: "webp" })).src,
        alt: meta.alt || fallbackAlt,
        camera: meta.camera ?? "",
        lens: meta.lens ?? "",
        settings: meta.settings ?? "",
        place: meta.place ?? "",
        by: meta.by ?? "",
        date: meta.date || name.match(DATE_PREFIX)?.[1] || "",
      } satisfies Photo;
    })
  );
  // Más recientes primero; las que no tienen fecha van al final.
  return photos.sort((a, b) => b.date.localeCompare(a.date) || b.file.localeCompare(a.file));
}
