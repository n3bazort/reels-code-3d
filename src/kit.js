// kit.js — piezas reutilizables del estilo "explicativo 3D toon".
// Todo es determinista: nada depende del reloj real, solo del tiempo t (segundos).
import * as THREE from 'three';

/* ---------- utilidades ---------- */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { k = clamp(k); return k * k * k * (k * (k * 6 - 15) + 10); };
export const ramp = (t, a, b) => clamp((t - a) / (b - a));           // 0→1 entre a y b
export const easeOutBack = (k) => { k = clamp(k); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export function rng(seed) {                                           // aleatorio con semilla
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------- paleta por defecto (cámbiala por tema) ---------- */
export const PALETTE = {
  skyTop: '#5f9be0', skyBottom: '#f4f1e6',
  sandA: '#e2c693', sandB: '#d2b782',
  wall: '#e6e6e1', mortar: '#c6c9c5',
  ink: '#2a2622', accent: '#2fb7f5', accentGlow: '#bff0ff', danger: '#df3b30',
  leaf: '#7cc4a0', trunk: '#b6763f',
  textDark: '#1c1a17', textHalo: '#fff6e0',
};

/* ---------- materiales toon ---------- */
let _grad;
function gradientMap() {
  if (_grad) return _grad;
  const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  _grad = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  _grad.minFilter = _grad.magFilter = THREE.NearestFilter;
  _grad.needsUpdate = true;
  return _grad;
}
export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...opts });
}
export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; return m;
}

/* ---------- texturas procedurales (canvas) ---------- */
function canvasTex(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]); t.anisotropy = 8;
  return t;
}
// Arena en dos tonos con manchas (ruido de valor umbralizado, se repite sin costura)
export function sandTexture(a = PALETTE.sandA, b = PALETTE.sandB, repeat = [5, 5], seed = 7) {
  return canvasTex(512, (g, S) => {
    const r = rng(seed), G = 8, grid = [];
    for (let i = 0; i < G * G; i++) grid.push(r());
    const at = (x, y) => grid[((y % G + G) % G) * G + ((x % G + G) % G)];
    const noise = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
      return lerp(lerp(at(xi, yi), at(xi + 1, yi), fx), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), fx), fy);
    };
    const img = g.createImageData(S, S), ca = new THREE.Color(a), cb = new THREE.Color(b);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S * G, v = y / S * G;
      const n = noise(u, v) * 0.65 + noise(u * 2, v * 2) * 0.35;
      const c = n > 0.52 ? cb : ca, i = (y * S + x) * 4;
      // getHexString trabaja en sRGB; convertimos a bytes sRGB
      const hex = c.getHex(THREE.SRGBColorSpace);
      img.data[i] = hex >> 16; img.data[i + 1] = (hex >> 8) & 255; img.data[i + 2] = hex & 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, repeat);
}
// Bloques/ladrillo en aparejo corrido
export function brickTexture(base = PALETTE.wall, mortar = PALETTE.mortar, repeat = [2, 2], seed = 3) {
  return canvasTex(512, (g, S) => {
    const r = rng(seed), rows = 8, cols = 4, bh = S / rows, bw = S / cols;
    g.fillStyle = mortar; g.fillRect(0, 0, S, S);
    for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh, k = 0.94 + r() * 0.06;
      const c = new THREE.Color(base).multiplyScalar(k);
      g.fillStyle = '#' + c.getHexString(THREE.SRGBColorSpace);
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }, repeat);
}

/* ---------- cielo, suelo, luces ---------- */
export function skyTexture(top = PALETTE.skyTop, bottom = PALETTE.skyBottom) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, top); gr.addColorStop(0.55, bottom); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildWorld(scene, P = PALETTE) {
  scene.background = skyTexture(P.skyTop, P.skyBottom);
  scene.fog = new THREE.Fog(new THREE.Color(P.skyBottom), 38, 110);
  const ground = mesh(new THREE.PlaneGeometry(400, 400), toon('#ffffff', { map: sandTexture(P.sandA, P.sandB, [22, 22]) }), { cast: false });
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const hemi = new THREE.HemisphereLight('#ffffff', '#8fa3c4', 1.25); scene.add(hemi);   // relleno azulado = sombras frías
  const sun = new THREE.DirectionalLight('#fff3da', 2.3);
  sun.position.set(-9, 16, 11); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun);
  return { ground, sun, hemi };
}
export function cloud(x, y, z, s = 1) {                               // nube plana de esferas
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  [[0, 0, 1], [1.1, 0.1, 0.8], [-1.1, 0, 0.75], [0.4, 0.5, 0.7]].forEach(([dx, dy, r]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); b.position.set(dx, dy, 0); b.scale.z = 0.3; g.add(b);
  });
  g.position.set(x, y, z); g.scale.setScalar(s); return g;
}
export function tree(P = PALETTE, seed = 5) {
  const g = new THREE.Group(), r = rng(seed);
  const trunk = mesh(new THREE.CylinderGeometry(0.13, 0.18, 2.6, 10), toon(P.trunk)); trunk.position.y = 1.3; g.add(trunk);
  const geo = new THREE.IcosahedronGeometry(1.05, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.88 + r() * 0.24; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.9, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const top = mesh(geo, toon(P.leaf)); top.position.y = 3.1; g.add(top);
  return g;
}

/* ---------- tubos que se dibujan y "flujo" que viaja ---------- */
export function polyCurve(points, tension = 0.06) {                   // esquinas casi rectas
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', tension);
}
export function drawTube(curve, radius, material, segments = 160) {
  const radial = 10, m = mesh(new THREE.TubeGeometry(curve, segments, radius, radial, false), material);
  m.userData.setProgress = (k) => { m.geometry.setDrawRange(0, Math.floor(clamp(k) * segments) * radial * 6); m.visible = k > 0.001; };
  return m;
}
// Cuentas brillantes que recorren una curva (corriente, agua, datos, dinero…)
export function flowBeads(curve, { count = 12, radius = 0.09, color = PALETTE.accentGlow, speed = 0.25 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, fog: false });
  for (let i = 0; i < count; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), mat); b.renderOrder = 10; g.add(b); }
  g.userData.update = (t, upTo = 1, opacity = 1) => {
    mat.opacity = opacity; g.visible = opacity > 0.01;
    g.children.forEach((b, i) => {
      const u = ((i / count + t * speed) % 1 + 1) % 1;
      b.visible = u <= upTo; if (b.visible) b.position.copy(curve.getPointAt(u));
    });
  };
  return g;
}

/* ---------- cámara por poses ---------- */
// poses: [{ t, pos:[x,y,z], look:[x,y,z], fov? }] — interpola con suavizado + deriva constante
export function cameraAt(camera, poses, t) {
  let i = 0; while (i < poses.length - 2 && t > poses[i + 1].t) i++;
  const a = poses[i], b = poses[Math.min(i + 1, poses.length - 1)];
  const k = smooth(ramp(t, a.t, b.t));
  const pos = new THREE.Vector3(...a.pos).lerp(new THREE.Vector3(...b.pos), k);
  const look = new THREE.Vector3(...a.look).lerp(new THREE.Vector3(...b.look), k);
  const edge = Math.sin(Math.PI * ramp(t, poses[0].t, poses[poses.length - 1].t));   // deriva = 0 en los extremos (loop)
  pos.x += Math.sin(t * 0.7) * 0.12 * edge; pos.y += Math.sin(t * 0.53 + 1) * 0.07 * edge;   // nunca queda quieta
  camera.fov = lerp(a.fov ?? 34, b.fov ?? 34, k); camera.updateProjectionMatrix();
  camera.position.copy(pos); camera.lookAt(look);
}

/* ---------- subtítulos palabra por palabra (HTML encima del canvas) ---------- */
// cues: [{ from, to, text, color?: 'danger'|'light' }]  — usa "\n" para dos líneas
export function captions(el, cues, t) {
  const cue = cues.find((c) => t >= c.from && t < c.to);
  if (!cue) { el.innerHTML = ''; el.dataset.k = ''; return; }
  const key = cue.from + cue.text;
  if (el.dataset.k !== key) {
    el.dataset.k = key; el.className = 'cap ' + (cue.color || '');
    el.innerHTML = cue.text.split('\n').map((line) => '<div>' + line.split(' ').map((w) => `<span>${w}</span>`).join(' ') + '</div>').join('');
  }
  const out = ramp(t, cue.to - 0.22, cue.to);
  el.querySelectorAll('span').forEach((s, i) => {
    const k = smooth(ramp(t, cue.from + i * 0.11, cue.from + i * 0.11 + 0.16));
    s.style.opacity = k * (1 - out);
    s.style.transform = `translateY(${(1 - k) * 18}px)`;
    s.style.filter = out > 0 ? `blur(${out * 6}px)` : 'none';
  });
}

/* ---------- render con contorno de tinta (bordes por profundidad) ---------- */
export function inkRenderer(canvas, w, h, ink = PALETTE.ink) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.HalfFloatType });
  rt.depthTexture = new THREE.DepthTexture(w, h);
  const rtN = new THREE.WebGLRenderTarget(w, h, { samples: 4 });   // pase de normales: aristas y contactos
  const normalMat = new THREE.MeshNormalMaterial();
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, tNormal: { value: rtN.texture }, px: { value: new THREE.Vector2(1 / w, 1 / h) },
      near: { value: 0.1 }, far: { value: 300 }, ink: { value: new THREE.Color(ink) }, width: { value: 1.4 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tColor, tDepth, tNormal; uniform vec2 px; uniform float near, far, width; uniform vec3 ink;
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
      void main(){
        vec3 col = texture2D(tColor, vUv).rgb;
        float d = lin(vUv); vec2 o = px * width;
        // laplaciano de la profundidad: marca siluetas y saltos, ignora planos inclinados
        float lap = lin(vUv + vec2(o.x, 0.0)) + lin(vUv - vec2(o.x, 0.0)) + lin(vUv + vec2(0.0, o.y)) + lin(vUv - vec2(0.0, o.y)) - 4.0 * d;
        float edge = smoothstep(0.012, 0.035, abs(lap) / d);
        vec3 n = texture2D(tNormal, vUv).rgb;
        float nd = distance(n, texture2D(tNormal, vUv + vec2(o.x, 0.0)).rgb) + distance(n, texture2D(tNormal, vUv - vec2(o.x, 0.0)).rgb)
                 + distance(n, texture2D(tNormal, vUv + vec2(0.0, o.y)).rgb) + distance(n, texture2D(tNormal, vUv - vec2(0.0, o.y)).rgb);
        edge = max(edge, smoothstep(0.25, 0.7, nd));
        edge *= 1.0 - smoothstep(30.0, 70.0, d);            // sin tinta en el horizonte
        gl_FragColor = vec4(mix(col, ink, edge * 0.85), 1.0);
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return {
    renderer,
    render(scene, camera) {
      mat.uniforms.near.value = camera.near; mat.uniforms.far.value = camera.far;
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null; scene.overrideMaterial = normalMat;
      renderer.setRenderTarget(rtN); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
      renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
    },
  };
}

/* ---------- opcional: transición día ↔ noche ---------- */
// k: 0 = día, 1 = noche. Llamar en update(t), p. ej. setTimeOfDay(scene, world, smooth(ramp(t, 20, 22)))
export function setTimeOfDay(scene, world, k, P = PALETTE) {
  const mix = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), k);
  const top = mix(P.skyTop, '#1f2a4d'), bottom = mix(P.skyBottom, '#56597a');
  const g = scene.background.image.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#' + top.getHexString()); gr.addColorStop(0.55, '#' + bottom.getHexString()); gr.addColorStop(1, '#' + bottom.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); scene.background.needsUpdate = true;
  scene.fog.color.copy(bottom);
  world.sun.intensity = lerp(2.3, 0.35, k); world.sun.color.copy(mix('#fff3da', '#9fb4ff'));
  world.hemi.intensity = lerp(1.25, 0.6, k); world.hemi.color.copy(mix('#ffffff', '#7f8fc8'));
}

/* ---------- opcional: panel 2D de pulsos (tipo osciloscopio) ---------- */
// Muestra un pulso cada `period` segundos entre from y to. Requiere <div id="panel"> en index.html.
export function pulsePanel(el, t, { from, to, period = 1, label = '' }) {
  const k = smooth(ramp(t, from, from + 0.3)) * (1 - ramp(t, to - 0.3, to));
  el.style.opacity = k; el.style.transform = `scale(${0.9 + 0.1 * k})`;
  if (k <= 0) { el.innerHTML = ''; return; }
  const W = 900, H = 300, base = 215, lt = t - from, speed = 190, head = 760;
  let d = `M0 ${base}`;
  for (let n = 0; n * period <= lt; n++) { const x = head - (lt - n * period) * speed; if (x > 0) d += ` L${x} ${base} L${x} 70 L${x} ${base}`; }
  d += ` L${head} ${base}`;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path d="${d}" fill="none" stroke="#e6ff5a" stroke-width="6" stroke-linejoin="round"/>`
    + `<circle cx="${head}" cy="${base}" r="9" fill="#e6ff5a"/><text x="30" y="54" fill="#fff6e0" font-family="Cap" font-size="34">${label}</text></svg>`;
}
