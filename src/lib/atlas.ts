import { feature } from "topojson-client";
import { geoBounds, geoContains, geoNaturalEarth1 } from "d3-geo";
import world from "world-atlas/land-110m.json";

export interface PinInput {
  lat: number;
  lon: number;
  label: string;
}

export type Seg = { t: string; pin?: boolean };

export interface AtlasData {
  cols: number;
  rows: Seg[][];
  pins: { n: string; label: string }[];
}

const COLS = 140; // caracteres de ancho
const CHAR_ASPECT = 2; // alto/ancho de un carácter (line-height 1.2 con fuente monoespaciada)
const SX = 2; // submuestras horizontales por celda
const SY = 3; // submuestras verticales por celda
const MIN_LAT = -58; // recorta la Antártida
const RAMP = " .:+*#"; // de vacío a tierra densa

const marker = (i: number) => (i < 9 ? String(i + 1) : String.fromCharCode(56 + i)); // 1-9, luego A, B...

// Divide la tierra en polígonos y descarta rápido los que quedan lejos del punto
// (probar toda la masa terrestre en cada punto tardaba más de 10 s).
function landTest() {
  const land = feature(world as any, (world as any).objects.land) as any;
  const polys: { geom: any; w: number; s: number; e: number; n: number }[] = [];
  const add = (coordinates: any) => {
    const geom = { type: "Polygon", coordinates };
    const [[w, s], [e, n]] = geoBounds(geom as any);
    polys.push({ geom, w, s, e, n });
  };
  const visit = (g: any): void => {
    if (g.type === "Polygon") add(g.coordinates);
    else if (g.type === "MultiPolygon") g.coordinates.forEach(add);
    else if (g.type === "GeometryCollection") g.geometries.forEach(visit);
    else if (g.type === "Feature") visit(g.geometry);
    else if (g.type === "FeatureCollection") g.features.forEach(visit);
  };
  visit(land);

  return ([lon, lat]: [number, number]) =>
    polys.some(
      (p) =>
        lat >= p.s &&
        lat <= p.n &&
        (p.w <= p.e ? lon >= p.w && lon <= p.e : lon >= p.w || lon <= p.e) &&
        geoContains(p.geom, [lon, lat])
    );
}

// Todo esto corre en el build: al navegador solo llega texto.
export function buildAtlas(pins: PinInput[]): AtlasData {
  const W = 960;
  const projection = geoNaturalEarth1().fitWidth(W, { type: "Sphere" });
  const bottom = projection([0, MIN_LAT])![1];
  const cellW = W / COLS;
  const cellH = cellW * CHAR_ASPECT;
  const nRows = Math.ceil(bottom / cellH);

  const isLand = landTest();

  const grid: string[][] = [];
  for (let r = 0; r < nRows; r++) {
    const line: string[] = [];
    for (let c = 0; c < COLS; c++) {
      let hits = 0;
      for (let j = 0; j < SY; j++) {
        for (let i = 0; i < SX; i++) {
          const x = (c + (i + 0.5) / SX) * cellW;
          const y = (r + (j + 0.5) / SY) * cellH;
          const ll = projection.invert!([x, y]);
          if (!ll || !Number.isFinite(ll[0]) || !Number.isFinite(ll[1]) || ll[1] < MIN_LAT) continue;
          if (isLand(ll)) hits++;
        }
      }
      line.push(RAMP[Math.ceil((hits / (SX * SY)) * (RAMP.length - 1))]);
    }
    grid.push(line);
  }

  const placed = pins.map((p, i) => {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error(`El pin "${p.label}" necesita "lat" y "lon" numéricos en src/data/site.json`);
    }
    const xy = projection([lon, lat]);
    const col = xy ? Math.min(COLS - 1, Math.max(0, Math.floor(xy[0] / cellW))) : -1;
    const row = xy ? Math.min(nRows - 1, Math.max(0, Math.floor(xy[1] / cellH))) : -1;
    return { n: marker(i), label: p.label, row, col };
  });

  // Cada fila se parte en tramos de texto y marcadores de pin.
  const rows: Seg[][] = grid.map((line, r) => {
    const here = placed.filter((p) => p.row === r).sort((a, b) => a.col - b.col);
    const segs: Seg[] = [];
    let from = 0;
    for (const p of here) {
      if (p.col < from) continue;
      if (p.col > from) segs.push({ t: line.slice(from, p.col).join("") });
      segs.push({ t: p.n, pin: true });
      from = p.col + 1;
    }
    if (from < line.length) segs.push({ t: line.slice(from).join("") });
    return segs;
  });

  return { cols: COLS, rows, pins: placed.map((p) => ({ n: p.n, label: p.label })) };
}
