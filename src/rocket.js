// Cohete que vuelve solo — guion tipo "cadena de peros", 70 s, con loop.
import * as THREE from 'three';
import { PALETTE, toon, mesh, buildWorld, cloud, cameraAt, captions, inkRenderer, ramp, smooth, lerp, easeOutBack, rng } from './kit.js';

export const META = { width: 1080, height: 1920, fps: 30, duration: 70 };
const P = { ...PALETTE, sandA: '#3f93d6', sandB: '#3787ca' };          // el "suelo" es el mar
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, META.width / META.height, 0.1, 300);
const ink = inkRenderer(document.getElementById('gl'), META.width, META.height);
const world = buildWorld(scene, P); world.ground.position.y = -0.5;
const SKY = 60, H = 9, R = 0.55;

/* ---------- 1) objetos ---------- */
const barge = mesh(new THREE.BoxGeometry(9, 0.6, 9), toon('#3b3f46')); barge.position.y = -0.3; scene.add(barge);
const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 40), new THREE.MeshBasicMaterial({ color: '#f2c230' })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
const splash = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true })); splash.rotation.x = -Math.PI / 2; splash.position.set(8, -0.45, 0); scene.add(splash);

const white = toon('#f4f4f1'), dark = toon('#2f3238');
const rocket = new THREE.Group(); scene.add(rocket);
const tube = mesh(new THREE.CylinderGeometry(R, R, H - 0.5, 28), white); tube.position.y = 0.5 + (H - 0.5) / 2; rocket.add(tube);
const eng = mesh(new THREE.CylinderGeometry(R * 0.98, R * 0.85, 0.5, 28), dark); eng.position.y = 0.25; rocket.add(eng);
const band = mesh(new THREE.CylinderGeometry(R + 0.01, R + 0.01, 1.2, 28), dark); band.position.y = H - 0.6; rocket.add(band);
[-0.2, 0.2].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshBasicMaterial({ color: P.ink })); e.position.set(x, 5.8, R - 0.02); rocket.add(e); });
const LEG = 2.33, legs = [], fins = [];
for (let i = 0; i < 4; i++) {
  const a = Math.PI / 4 + i * Math.PI / 2;
  const hinge = new THREE.Group(); hinge.position.set(Math.cos(a) * R, 1.5, Math.sin(a) * R); hinge.rotation.y = -a;
  const arm = new THREE.Group(); const lm = mesh(new THREE.BoxGeometry(0.14, LEG, 0.24), dark); lm.position.y = -LEG / 2; arm.add(lm); hinge.add(arm); rocket.add(hinge); legs.push(arm);
  const fh = new THREE.Group(); fh.position.set(Math.cos(a) * R, H - 1.5, Math.sin(a) * R); fh.rotation.y = -a;
  const fm = mesh(new THREE.BoxGeometry(0.95, 0.08, 0.75), toon('#6b7078')); fm.position.x = 0.47; fh.add(fm); rocket.add(fh); fins.push(fh);
}
const payload = new THREE.Group(); const pm = toon('#d9dde2');
const p1 = mesh(new THREE.CylinderGeometry(0.5, 0.5, 2, 24), pm); p1.position.y = 1; const p2 = mesh(new THREE.ConeGeometry(0.5, 1, 24), pm); p2.position.y = 2.5; payload.add(p1, p2); rocket.add(payload);
const flame = new THREE.Group(); const basic = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, fog: false });
const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.2, 16), basic('#ff8a1f')); f1.rotation.x = Math.PI; f1.position.y = -1.6;
const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.1, 16), basic('#ffe066')); f2.rotation.x = Math.PI; f2.position.y = -1.05; flame.add(f1, f2); rocket.add(flame);
const heat = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 14), basic('#ff6a1a', 0.75)); heat.position.y = -0.1; rocket.add(heat);
const puffs = [-1, 1].map((sx) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), basic('#ffffff', 0.9)); p.position.set(sx * (R + 0.45), H - 0.9, 0); rocket.add(p); return p; });

const r = rng(11), streakMat = basic('#ffffff', 0.7), streaks = [];
for (let i = 0; i < 34; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.4, 0.05), streakMat); s.userData = { x: r() * 16 - 8, z: r() * 10 - 9, o: r() * 28 }; if (Math.abs(s.userData.x) < 1.2) s.userData.x += 2.5; scene.add(s); streaks.push(s); }
const clouds = [0, 1, 2, 3].map((i) => { const c = cloud(i % 2 ? 9 : -9, 0, -26 - i * 5, 2.5 + i * 0.4); scene.add(c); return c; });
scene.add(cloud(-18, 16, -70, 5), cloud(20, 22, -80, 6));

/* ---------- 2) línea de tiempo (tiempos del locutor) ---------- */
const S = SKY, POSES = [
  { t: 0, pos: [10, 7, 25], look: [0, 4.6, 0] }, { t: 4, pos: [8.5, 6.5, 23], look: [0, 4.4, 0] },
  { t: 6.5, pos: [12, 8, 27], look: [5, 1.5, 0], fov: 40 }, { t: 9.8, pos: [12, 7.5, 26], look: [6, 0.5, 0], fov: 40 },
  { t: 12.3, pos: [6, S + 6, 24], look: [0, S + 5.5, 0] }, { t: 14.8, pos: [5, S + 6, 25], look: [0, S + 5, 0], fov: 38 },
  { t: 19, pos: [4, S + 5, 26], look: [0, S + 4.5, 0], fov: 38 }, { t: 24, pos: [-5, S + 6.5, 22], look: [0, S + 6, 0] },
  { t: 27.5, pos: [-4, S + 1, 21], look: [0, S + 2.5, 0] }, { t: 35, pos: [3, S + 1.5, 23], look: [0, S + 3, 0] },
  { t: 38.5, pos: [0, S + 5, 29], look: [0, S + 4.5, 0], fov: 40 }, { t: 43.5, pos: [5, S + 9.5, 17], look: [0, S + 7.6, 0] },
  { t: 45, pos: [5, S + 9.5, 17], look: [0, S + 7.6, 0] }, { t: 47.5, pos: [11, 8, 30], look: [0, 9, 0], fov: 42 },
  { t: 52.5, pos: [11, 9, 31], look: [0, 9, 0], fov: 44 }, { t: 58.9, pos: [9, 6, 24], look: [0, 4.5, 0] },
  { t: 63.5, pos: [7, 5, 21], look: [0, 4, 0] }, { t: 65.6, pos: [7, 4.5, 19], look: [0, 3, 0] },
  { t: 67.2, pos: [7, 4.5, 18], look: [0, 3, 0] }, { t: 70, pos: [10, 7, 25], look: [0, 4.6, 0] },
];
const CUES = [
  { from: 0.15, to: 2.1, text: '¿cómo aterriza de pie' }, { from: 2.1, to: 4.3, text: 'un edificio\nde 14 pisos?' },
  { from: 5.2, to: 7.9, text: 'se usaba una vez' }, { from: 8.0, to: 9.9, text: 'terminaba en el mar', color: 'danger' },
  { from: 10.7, to: 11.9, text: 'desde cero' }, { from: 12.5, to: 14.7, text: 'suelta su carga' },
  { from: 15.3, to: 17.6, text: 'sin control', color: 'danger' }, { from: 17.8, to: 19.8, text: 'miles de km/h', color: 'danger' },
  { from: 20.4, to: 23.4, text: 'se da la vuelta' }, { from: 23.7, to: 25.4, text: 'propulsores\nde nitrógeno' },
  { from: 26.3, to: 30.3, text: 'el aire lo quema', color: 'danger' }, { from: 31.2, to: 33.7, text: 'frena antes' },
  { from: 34.1, to: 35.8, text: 'encendido\nde reentrada' }, { from: 36.8, to: 39.7, text: 'sin dirección', color: 'danger' },
  { from: 40.8, to: 43.4, text: 'cuatro rejillas' }, { from: 43.8, to: 45.3, text: 'aletas de rejilla' },
  { from: 46.1, to: 48.0, text: 'no puede flotar', color: 'danger' }, { from: 48.4, to: 52.5, text: 'pesa muy poco', color: 'danger' },
  { from: 53.0, to: 55.6, text: 'en el último segundo' }, { from: 56.0, to: 59.3, text: 'velocidad cero' },
  { from: 60.3, to: 63.4, text: 'se cae solo', color: 'danger' }, { from: 64.4, to: 65.8, text: 'cuatro patas' },
  { from: 66.3, to: 69.5, text: 'listo para volar\notra vez' },
];
const capEl = document.getElementById('cap'), panel = document.getElementById('panel');
Object.assign(panel.style, { top: '1560px', left: '190px', width: '700px', height: '150px' });

/* ---------- 3) estado en t ---------- */
function state(t) {
  const s = { legs: 1, fins: 1, flame: 0, fw: 1, heat: 0, puff: 0, show: true, th: 0, base: null, center: null };
  if (t < 4.3) { s.base = [0, 0]; s.th = Math.sin(t * 9) * 0.03 * ramp(t, 3.7, 4.3); }
  else if (t < 10.2) { const k = smooth(ramp(t, 4.3, 5.4)), sl = smooth(ramp(t, 5.5, 9.4)); s.th = -1.5708 * k - sl * 0.5; s.base = [sl * 7, -sl * 4.5]; s.legs = s.fins = 1 - ramp(t, 4.3, 4.9); s.show = t < 9.9; }
  else if (t < 45.2) {
    s.legs = 0; s.fins = t < 40.8 ? 0 : easeOutBack(ramp(t, 40.8, 41.6));
    s.th = t < 15.3 ? 0 : t < 20.4 ? 1.9 * (t - 15.3) : lerp(9.69, 4 * Math.PI, smooth(ramp(t, 20.4, 23.2)));
    const dk = ramp(t, 36.8, 37.6) * (1 - smooth(ramp(t, 40.8, 42.6))), ph = (t - 36.8) * 1.7;
    s.heat = smooth(ramp(t, 25.6, 28.5)) * (1 - smooth(ramp(t, 31.4, 33.2)));
    s.th += Math.sin(ph + 0.6) * 0.3 * dk;
    s.center = [Math.sin(ph) * 2 * dk + Math.sin(t * 43) * 0.06 * s.heat, SKY + H / 2];
    s.flame = ramp(t, 31.2, 31.6) * (1 - ramp(t, 35.2, 35.7)); s.fw = 1.5;
    s.puff = ramp(t, 20.4, 20.7) * (1 - ramp(t, 22.8, 23.3));
  } else if (t < 52.4) {
    const y = t < 47 ? lerp(SKY, 16, smooth(ramp(t, 45.2, 47))) : t < 49.2 ? lerp(16, 5, smooth(ramp(t, 47, 49.2))) : lerp(5, 13, smooth(ramp(t, 49.2, 52.4)));
    s.base = [0, y]; s.legs = 0; s.flame = ramp(t, 47.2, 47.6); s.fw = 0.8;
  } else if (t < 58.9) {
    let y; if (t < 54.76) { const u = ramp(t, 52.4, 54.76); y = 13 + 5 * (1 - (1 - u) ** 2); } else if (t < 56.6) { const u = ramp(t, 54.76, 56.6); y = 18 - 8 * u * u; } else { const u = ramp(t, 56.6, 58.9); y = 10 * (1 - u) ** 2; }
    s.base = [0, y]; s.legs = 0; s.fw = t < 56.6 ? 0.8 : 1.25;
    s.flame = t < 56.6 ? 1 - ramp(t, 52.4, 52.7) : ramp(t, 56.6, 56.75) * (1 - ramp(t, 58.7, 58.9));
  } else {
    s.base = [0, 0]; s.legs = easeOutBack(ramp(t, 64.5, 65.3));
    const wob = ramp(t, 59.3, 60.3) * (1 - smooth(ramp(t, 64.6, 65.4)));
    s.th = Math.sin((t - 59.3) * 4.2) * (0.05 + 0.07 * ramp(t, 60, 63.5)) * wob;
  }
  if (s.center) s.base = [s.center[0] + Math.sin(s.th) * H / 2, s.center[1] - Math.cos(s.th) * H / 2];   // giro sobre el centro
  return s;
}
function update(t) {
  const s = state(t);
  rocket.visible = s.show; rocket.position.set(s.base[0], s.base[1], 0); rocket.rotation.z = s.th;
  legs.forEach((l) => { l.rotation.z = lerp(Math.PI, 0.873, s.legs); l.visible = s.legs > 0.02 || t > 10; });
  fins.forEach((f) => { f.scale.setScalar(Math.max(s.fins, 0.001)); f.visible = s.fins > 0.02; });
  payload.visible = t > 10.2 && t < 15.2; payload.position.y = H + Math.max(0, t - 13) ** 2 * 3; payload.scale.setScalar(1 - ramp(t, 14.4, 15.2));
  const fl = s.flame * (1 + Math.sin(t * 50) * 0.12); flame.visible = s.flame > 0.02; flame.scale.set(s.fw, Math.max(fl, 0.01) * (0.8 + s.fw * 0.3), s.fw);
  heat.visible = s.heat > 0.02; heat.scale.set(s.heat * 1.2, s.heat * 0.8 * (1 + Math.sin(t * 31) * 0.1), s.heat * 1.2);
  puffs.forEach((p, i) => { const k = s.puff * (0.6 + 0.4 * Math.abs(Math.sin(t * 14 + i * 2))); p.visible = k > 0.02; p.scale.setScalar(Math.max(k, 0.01)); });
  // sensación de caída: rayas y nubes que suben
  const sk = t < 45.2 ? ramp(t, 13.5, 15) : 1 - ramp(t, 46, 47.2), u = Math.max(0, t - 13.5), fall = u < 1 ? u * u / 2 : u - 0.5;
  const cy = (t < 10.2 || t > 47.2 ? SKY : rocket.position.y) + (t < 45.2 ? 0 : 4);
  streakMat.opacity = 0.7 * sk;
  streaks.forEach((m) => { m.visible = sk > 0.02 && t > 10; m.position.set(m.userData.x, cy - 10 + ((m.userData.o + fall * 30) % 28), m.userData.z); });
  clouds.forEach((c, i) => { c.position.y = SKY - 22 + ((i * 14 + fall * 9) % 56); });
  const sp = ramp(t, 5.6, 6.8); splash.visible = sp > 0 && sp < 1; splash.scale.setScalar(1 + sp * 4); splash.material.opacity = 1 - sp;
  // medidor de velocidad (53–59.6 s)
  const pk = smooth(ramp(t, 53, 53.4)) * (1 - ramp(t, 59.3, 59.7)); panel.style.opacity = pk;
  if (pk > 0) { const v = Math.abs(state(t + 0.02).base[1] - state(t - 0.02).base[1]) / 0.04, w = Math.min(1, v / 9) * 620;
    panel.innerHTML = `<svg viewBox="0 0 700 150" width="700" height="150"><text x="40" y="58" fill="#fff6e0" font-family="Cap" font-size="34">velocidad</text><rect x="40" y="84" width="620" height="30" rx="15" fill="#2a2e38"/><rect x="40" y="84" width="${w}" height="30" rx="15" fill="${v < 0.4 ? '#7be07b' : '#e6ff5a'}"/></svg>`; }
  // en altura el horizonte crema pasa a azul
  const hk = smooth(ramp(t, 10.5, 12.3)) * (1 - smooth(ramp(t, 45.2, 47.3))), bot = new THREE.Color(P.skyBottom).lerp(new THREE.Color('#9cc9f2'), hk);
  const g = scene.background.image.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, P.skyTop); gr.addColorStop(0.55, '#' + bot.getHexString()); gr.addColorStop(1, '#' + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); scene.background.needsUpdate = true; scene.fog.color.copy(bot);
  cameraAt(camera, POSES, t); captions(capEl, CUES, t);
}
window.META = META;
window.renderFrame = (t) => { update(t); ink.render(scene, camera); };
window.renderFrame(0); window.READY = true;
