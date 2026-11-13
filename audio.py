# audio.py — música + efectos sintetizados (sin samples). uso: python3 audio.py salida.wav
import os, sys, numpy as np
from scipy.io import wavfile
from scipy import signal
SR, DUR, BPM = 44100, 14.0, 100
beat = 60 / BPM; N = int(SR * DUR); out = np.zeros(N); rnd = np.random.default_rng(4)
def add(x, t, g=1.0):
    i = int(t * SR); x = x[:max(0, N - i)]; out[i:i + len(x)] += x * g
def env(n, a=0.005, d=0.3): t = np.arange(n) / SR; return np.minimum(t / a, 1) * np.exp(-t / d)
def tone(f, dur, d=0.3, wave='sine'):
    n = int(dur * SR); t = np.arange(n) / SR
    w = np.sin(2 * np.pi * f * t) if wave == 'sine' else signal.sawtooth(2 * np.pi * f * t, 0.5)
    return w * env(n, d=d)
def noise(dur, lo, hi):
    n = int(dur * SR); b, a = signal.butter(2, [lo, hi], btype='band', fs=SR); return signal.lfilter(b, a, rnd.standard_normal(n))
# --- música: bajo por compás, arpegio en corcheas, bombo suave ---
bars = [(55.0, [220, 261.6, 329.6]), (43.65, [174.6, 220, 261.6]), (65.4, [196, 261.6, 329.6]), (49.0, [196, 246.9, 293.7])]  # Am F C G
t, b = 0.0, 0
while t < DUR and not os.environ.get('SFX_ONLY'):   # SFX_ONLY=1 → solo efectos (para música/voz externas)
    root, chord = bars[b % 4]
    if t >= 2 * beat * 2: add(tone(root, beat * 4, d=1.6) + 0.4 * tone(root * 2, beat * 4, d=0.8), t, 0.30)   # el bajo entra al 2º compás
    for k in range(8):
        add(tone(chord[[0, 1, 2, 1, 2, 1, 0, 2][k]] * 2, 0.4, d=0.12, wave='tri'), t + k * beat / 2, 0.10)
    for k in range(4):
        n = int(0.18 * SR); tt = np.arange(n) / SR
        add(np.sin(2 * np.pi * (110 * np.exp(-tt * 28) + 45) * tt) * env(n, d=0.07), t + k * beat, 0.32 if t >= 2 * beat * 2 else 0.0)
        add(noise(0.05, 6000, 12000) * env(int(0.05 * SR), d=0.012), t + k * beat + beat / 2, 0.05)
    t += beat * 4; b += 1
# --- efectos, sincronizados con la línea de tiempo de scene.js ---
def whoosh(dur=0.55):
    x = noise(dur, 300, 5000); n = len(x); return x * np.sin(np.pi * np.arange(n) / n) ** 2
def pop(f=420): n = int(0.16 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (f + 500 * np.exp(-tt * 40)) * tt) * env(n, d=0.04)
def drip(): n = int(0.09 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (900 + 1400 * tt / 0.09) * tt) * env(n, d=0.02)
def thud(): n = int(0.3 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (60 + 90 * np.exp(-tt * 30)) * tt) * env(n, d=0.08)
def flow(dur):
    x = noise(dur, 700, 6000); n = len(x); f = np.minimum(np.arange(n) / (0.4 * SR), 1) * np.minimum((n - np.arange(n)) / (0.3 * SR), 1); return x * f
add(flow(2.0), 0.0, 0.05); add(whoosh(), 2.0, 0.12); add(thud(), 2.6, 0.5)
for td in np.arange(3.4, 5.5, 0.8): add(drip(), td, 0.22)
add(whoosh(0.8), 5.6, 0.14); add(thud(), 6.4, 0.5); add(pop(), 6.42, 0.2)
add(noise(1.6, 1500, 3000) * np.linspace(0.2, 1, int(1.6 * SR)), 7.2, 0.02)          # la tubería se dibuja
add(pop(600), 8.8, 0.22); add(flow(4.4), 9.5, 0.06); add(pop(760), 10.0, 0.2); add(whoosh(0.7), 11.9, 0.1)
fade = np.minimum(1, (N - np.arange(N)) / (0.6 * SR)); out *= fade
out = np.tanh(out * 1.6) * 0.8
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
