# reels-code-3d

Videos explicativos verticales en 3D toon hechos por código (Three.js + Chrome sin pantalla + ffmpeg).

- `src/kit.js`: piezas reutilizables (materiales toon, texturas, cámara por poses, subtítulos, contorno de tinta).
- `src/rocket.js`, `src/scene.js`: un archivo por video.
- `video.json`: qué video grabar, su duración y en cuántos tramos.
- `.github/workflows/render.yml`: graba los tramos en paralelo, los une y deja el MP4 en la rama `output`.

Local: `npm ci`, `ENTRY=src/rocket.js npm run bundle`, `node render.mjs --stills 1,30,60`, `node render.mjs video.mp4`.
