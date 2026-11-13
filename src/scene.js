// scene.js — el VIDEO. Para un tema nuevo se reescribe solo este archivo:
// 1) objetos  2) línea de tiempo (poses de cámara + subtítulos)  3) update(t)
import * as THREE from 'three';
import { PALETTE as P, toon, mesh, buildWorld, cloud, tree, brickTexture, polyCurve, drawTube, flowBeads,
  cameraAt, captions, inkRenderer, ramp, smooth, lerp, clamp, easeOutBack } from './kit.js';

export const META = { width: 1080, height: 1920, fps: 30, duration: 14 };

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, META.width / META.height, 0.1, 300);
const ink = inkRenderer(document.getElementById('gl'), META.width, META.height);
buildWorld(scene);
scene.add(cloud(-14, 17, -60, 4), cloud(16, 21, -70, 5), cloud(2, 26, -80, 4), tree().translateX(-5.2).translateZ(-0.5));

/* ---------- 1) objetos ---------- */
// casa
const house = mesh(new THREE.BoxGeometry(6, 3.2, 5), toon('#ffffff', { map: brickTexture(P.wall, P.mortar, [3, 2]) }));
house.position.y = 1.6; scene.add(house);
const slab = mesh(new THREE.BoxGeometry(6.5, 0.18, 5.5), toon('#cfd2cf')); slab.position.y = 3.29; scene.add(slab);
const door = mesh(new THREE.BoxGeometry(1, 2, 0.08), toon('#8a5a3c')); door.position.set(-1.5, 1, 2.52); scene.add(door);
const win = mesh(new THREE.BoxGeometry(1.1, 0.9, 0.08), toon('#9fc7e6')); win.position.set(0.1, 1.9, 2.52); scene.add(win);

// base del tanque en el techo
const stand = new THREE.Group();
const top = mesh(new THREE.BoxGeometry(1.7, 0.1, 1.7), toon('#b9bcba')); top.position.y = 0.6; stand.add(top);
[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(([x, z]) => { const l = mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), toon('#b9bcba')); l.position.set(x, 0.3, z); stand.add(l); });
stand.position.set(1.8, 3.38, 0.8); scene.add(stand);

// tanque
const tank = new THREE.Group();
const body = mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.05, 28), toon('#3a3d44')); body.position.y = 0.525; tank.add(body);
const lid = mesh(new THREE.SphereGeometry(0.72, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon('#3a3d44')); lid.position.y = 1.05; lid.scale.y = 0.35; tank.add(lid);
const cap = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), toon('#22242a')); cap.position.y = 1.32; tank.add(cap);
const band = mesh(new THREE.CylinderGeometry(0.735, 0.735, 0.12, 28), toon(P.accent)); band.position.y = 0.6; tank.add(band);
scene.add(tank);
const ROOF = new THREE.Vector3(1.8, 4.03, 0.8), FLOOR = new THREE.Vector3(4.7, 0, 2.6);

// llave + chorro
const FAUCET = new THREE.Vector3(1.8, 0.95, 2.5);
const tapA = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10), toon('#c9a14a')); tapA.rotation.x = Math.PI / 2; tapA.position.set(FAUCET.x, FAUCET.y, 2.7); scene.add(tapA);
const tapB = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 10), toon('#c9a14a')); tapB.position.set(FAUCET.x, FAUCET.y - 0.07, 2.88); scene.add(tapB);
const SPOUT = new THREE.Vector3(FAUCET.x, FAUCET.y - 0.15, 2.88);
const water = new THREE.MeshBasicMaterial({ color: P.accent, fog: false });
const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1, 12), water); scene.add(stream);
const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: '#58c6f2', transparent: true, opacity: 0.85 }));
puddle.rotation.x = -Math.PI / 2; puddle.position.set(SPOUT.x, 0.015, SPOUT.z); scene.add(puddle);
const drops = [0, 1].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), water); scene.add(d); return d; });

// tubería (techo → llave) y manguera (suelo → llave)
const pipeCurve = polyCurve([[1.8, 4.2, 1.5], [1.8, 4.2, 2.2], [1.8, 3.6, 2.62], [1.8, 3.3, 2.62], [1.8, 2.2, 2.62], [1.8, 1.0, 2.62], [1.8, 0.95, 2.62]]);
const pipe = drawTube(pipeCurve, 0.06, toon('#f1ede2')); scene.add(pipe);
const beads = flowBeads(pipeCurve, { count: 11, radius: 0.07, speed: 0.33 }); scene.add(beads);
const hose = drawTube(polyCurve([[4.0, 0.2, 2.75], [3.2, 0.08, 2.95], [2.3, 0.08, 2.95], [1.95, 0.5, 2.75], [1.86, 0.95, 2.62]], 0.5), 0.045, toon('#6d8a4a')); scene.add(hose);

// regla de altura
const ruler = new THREE.Group();
const rmat = new THREE.MeshBasicMaterial({ color: P.danger, fog: false });
const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), rmat); bar.position.y = 0.5; ruler.add(bar);
[0, 1].forEach((y) => { const k = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.05), rmat); k.position.y = y; ruler.add(k); });
ruler.position.set(3.35, FAUCET.y, 2.75); scene.add(ruler);
const RULER_H = 4.4 - FAUCET.y;

// personaje: garrafón con ojos (perfil torneado, sin rig)
const jug = new THREE.Group();
const prof = [[0, 0], [0.27, 0], [0.3, 0.05], [0.3, 0.5], [0.26, 0.6], [0.1, 0.69], [0.1, 0.78], [0, 0.78]].map(([x, y]) => new THREE.Vector2(x, y));
jug.add(mesh(new THREE.LatheGeometry(prof, 28), toon('#a9defa')));
const jcap = mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.09, 16), toon('#2c6fd6')); jcap.position.y = 0.8; jug.add(jcap);
[-0.1, 0.1].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), new THREE.MeshBasicMaterial({ color: P.ink })); e.position.set(x, 0.38, 0.285); jug.add(e); });
jug.position.set(0.75, 0, 3.7); jug.rotation.y = 0.35; scene.add(jug);

/* ---------- 2) línea de tiempo ---------- */
const POSES = [
  { t: 0.0, pos: [7.5, 6.2, 14.5], look: [0.9, 2.4, 0.6] },
  { t: 2.0, pos: [6.6, 5.6, 13.2], look: [0.9, 2.4, 0.6] },
  { t: 3.3, pos: [4.6, 2.9, 14.6], look: [2.8, 1.1, 2.6], fov: 44 },
  { t: 5.4, pos: [4.2, 2.7, 14.0], look: [2.8, 1.1, 2.6], fov: 44 },
  { t: 6.9, pos: [8.0, 6.6, 13.5], look: [2.3, 3.3, 1.4], fov: 40 },
  { t: 8.9, pos: [5.8, 3.7, 12.0], look: [1.9, 2.6, 2.4], fov: 38 },
  { t: 10.6, pos: [7.2, 3.6, 12.0], look: [2.1, 2.7, 2.2] },
  { t: 11.7, pos: [7.0, 3.5, 11.6], look: [2.1, 2.7, 2.2] },
  { t: 12.7, pos: [3.5, 1.9, 9.6], look: [1.35, 0.75, 3.2], fov: 36 },
  { t: 14.0, pos: [3.9, 2.2, 10.2], look: [1.35, 0.8, 3.2], fov: 36 },
];
const CUES = [
  { from: 0.15, to: 2.0, text: '¿por qué el tanque\nva en el techo?' },
  { from: 2.7, to: 3.9, text: 'en el suelo' },
  { from: 3.9, to: 5.4, text: 'sale un hilito', color: 'danger' },
  { from: 5.7, to: 7.2, text: 'súbelo al techo' },
  { from: 7.4, to: 9.2, text: 'el agua baja sola' },
  { from: 9.5, to: 11.7, text: 'más altura,\nmás presión' },
  { from: 12.0, to: 13.95, text: 'la gravedad\ntrabaja gratis' },
];
const capEl = document.getElementById('cap');

/* ---------- 3) estado en el tiempo t ---------- */
function update(t) {
  // tanque: techo → suelo (2.0–2.6) → techo (5.6–6.4), con arco y rebote
  const down = smooth(ramp(t, 2.0, 2.6)), up = ramp(t, 5.6, 6.4);
  const k = t < 5.6 ? down : 1 - smooth(up);                 // 0 = techo, 1 = suelo
  tank.position.lerpVectors(ROOF, FLOOR, k);
  tank.position.y += Math.sin(Math.PI * k) * 1.6;            // arco del salto
  const land = t < 5.6 ? ramp(t, 2.6, 2.95) : ramp(t, 6.4, 6.8);
  const sq = (t > 2.6 && t < 2.95) || (t > 6.4 && t < 6.8) ? Math.sin(land * Math.PI) * 0.16 : 0;
  tank.scale.set(1 + sq, 1 - sq, 1 + sq);

  // tubería principal: llena en el gancho, se recoge, y se dibuja de nuevo 7.2–8.8
  const drawn = t < 2.0 ? 1 : t < 2.35 ? 1 - ramp(t, 2.0, 2.35) : smooth(ramp(t, 7.2, 8.8));
  pipe.userData.setProgress(drawn);
  hose.userData.setProgress(t < 5.6 ? ramp(t, 2.8, 3.3) : 1 - ramp(t, 5.6, 5.9));
  const flowing = t < 2.0 ? 1 : ramp(t, 8.9, 9.6);
  beads.userData.update(t, t < 2.0 ? 1 : ramp(t, 8.8, 9.9), t < 2.0 ? 1 - ramp(t, 1.8, 2.0) : flowing);

  // chorro fuerte / goteo
  const strong = t < 2.0 ? 1 - ramp(t, 1.85, 2.05) : smooth(ramp(t, 9.5, 10.0));
  const len = (SPOUT.y - 0.02) * strong;
  stream.visible = strong > 0.01; stream.scale.set(1, Math.max(len, 0.001), 1); stream.position.set(SPOUT.x, SPOUT.y - len / 2, SPOUT.z);
  puddle.scale.setScalar(Math.max(0.001, 0.55 * (t < 2.0 ? strong : smooth(ramp(t, 9.8, 11.5))) + 0.12 * ramp(t, 3.4, 5.4) * (t < 9.8 ? 1 : 0)));
  drops.forEach((d, i) => {
    const on = t > 3.3 && t < 5.6, ph = (t * 1.25 + i * 0.5) % 1;
    d.visible = on; d.position.set(SPOUT.x, SPOUT.y - ph * ph * (SPOUT.y - 0.04), SPOUT.z);
  });

  // regla de altura
  const rk = easeOutBack(ramp(t, 9.6, 10.3)) * (1 - ramp(t, 11.8, 12.1));
  ruler.visible = rk > 0.01; ruler.scale.set(1, Math.max(rk, 0.001) * RULER_H, 1);

  // personaje: triste en el suelo, salta cuando hay presión
  const sad = smooth(ramp(t, 3.6, 4.2)) * (1 - smooth(ramp(t, 5.5, 6.0)));
  const happy = t < 2.0 ? 1 : ramp(t, 9.8, 10.2);
  const hop = Math.abs(Math.sin(t * 5.2)) * 0.22 * happy;
  jug.position.y = hop; jug.rotation.z = -0.28 * sad;
  const js = 1 + (0.22 - hop) * 0.25 * happy; jug.scale.set(js, 2 - js, js);

  cameraAt(camera, POSES, t);
  captions(capEl, CUES, t);
}

window.META = META;
window.renderFrame = (t) => { update(t); ink.render(scene, camera); };
window.renderFrame(0);
window.READY = true;
