// render.mjs — graba la página cuadro por cuadro.  uso: node render.mjs salida.mp4 [desde hasta] | node render.mjs --stills 1,4.5,10
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--hide-scrollbars'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text())); page.on('pageerror', (e) => console.log('[error]', e.message));
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.goto('file://' + path.resolve('index.html') + (process.env.HASH || ''));
await page.waitForFunction('window.READY === true', { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
const META = await page.evaluate(() => window.META);
const shot = async (t) => { await page.evaluate((t) => window.renderFrame(t), t); return page.screenshot({ type: 'jpeg', quality: 92 }); };
if (args[0] === '--stills') {
  for (const t of args[1].split(',').map(Number)) writeFileSync(`still_${t}.jpg`, await shot(t));
} else {
  const out = args[0], from = Number(args[1] ?? 0), to = Number(args[2] ?? META.duration), tmp = out.replace(/\.mp4$/, '.part.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(META.fps), '-i', '-', '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now(), n0 = Math.round(from * META.fps), n1 = Math.round(to * META.fps);
  for (let f = n0; f < n1; f++) {
    if (!ff.stdin.write(await shot(f / META.fps))) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - n0) % 60 === 0) console.log(`cuadro ${f}/${n1}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  if (code === 0) renameSync(tmp, out); else process.exitCode = 1;
}
await browser.close();
