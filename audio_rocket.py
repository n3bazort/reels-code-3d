# efectos del video del cohete (sin música: la música y la voz vienen de Magnific)
import sys, numpy as np
from scipy.io import wavfile
from scipy import signal
SR, DUR = 44100, 70.0
N = int(SR * DUR); out = np.zeros(N); rnd = np.random.default_rng(7)
def add(x, t, g=1.0):
    i = int(t * SR); x = x[:max(0, N - i)]; out[i:i + len(x)] += x * g
def env(n, a=0.005, d=0.3): t = np.arange(n) / SR; return np.minimum(t / a, 1) * np.exp(-t / d)
def noise(dur, lo, hi):
    b, a = signal.butter(2, [lo, hi], btype='band', fs=SR); return signal.lfilter(b, a, rnd.standard_normal(int(dur * SR)))
def shaped(x, a=0.3, r=0.4): n = len(x); i = np.arange(n); return x * np.minimum(i / (a * SR), 1) * np.minimum((n - i) / (r * SR), 1)
def whoosh(dur=0.6): x = noise(dur, 300, 5000); n = len(x); return x * np.sin(np.pi * np.arange(n) / n) ** 2
def pop(f=420): n = int(0.16 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (f + 500 * np.exp(-tt * 40)) * tt) * env(n, d=0.04)
def thud(): n = int(0.35 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (55 + 90 * np.exp(-tt * 30)) * tt) * env(n, d=0.09)
def roar(dur): return shaped(noise(dur, 60, 900), 0.15, 0.3) + 0.5 * shaped(noise(dur, 900, 4000), 0.15, 0.3)
add(thud(), 5.35, 0.6); add(shaped(noise(1.2, 800, 7000), 0.02, 0.9), 5.7, 0.25)          # cae y chapotea
add(whoosh(1.2), 10.4, 0.14); add(pop(520), 13.0, 0.22)                                    # sube la cámara, se separa la carga
add(shaped(noise(33.5, 200, 1800), 1.5, 1.5), 13.5, 0.035)                                 # viento de caída
for t in (20.5, 21.1, 21.7, 22.3): add(shaped(noise(0.35, 3000, 9000), 0.02, 0.25), t, 0.12)  # chorros de gas
add(shaped(noise(5.6, 40, 300), 1.5, 1.0), 25.8, 0.22)                                     # calor de reentrada
add(roar(4.4), 31.2, 0.22)                                                                 # encendido de reentrada
for k in range(4): add(pop(640 + 40 * k), 40.85 + 0.12 * k, 0.16)                          # aletas
add(whoosh(1.4), 45.3, 0.14); add(roar(5.3), 47.2, 0.12); add(roar(2.3), 56.6, 0.28)       # baja, flota mal, frenazo final
add(thud(), 58.88, 0.6)
for k in range(4): add(pop(380 + 30 * k), 64.5 + 0.1 * k, 0.16)                            # patas
add(thud(), 65.25, 0.35)
out = np.tanh(out * 1.5) * 0.8
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
