"""Original 20-second soundtrack in a Hasidic / klezmer wedding style, synthesized from scratch.

No samples and no existing recordings are used: the melody is composed here in the freygish mode
(D Eb F# G A Bb C), so there is no third-party copyright in the audio.
Usage: python3 animation/music.py  ->  animation/lsk-music.wav  (44.1 kHz, 16-bit stereo)
Timing is aligned to lsk-humor.html: 150 BPM, 2/4, bar = 0.8 s.
"""
import wave
from pathlib import Path
import numpy as np

SR = 44100
DUR = 20.0
BEAT = 60 / 150          # 0.4 s
BAR = 2 * BEAT           # 0.8 s
E8 = BEAT / 2            # eighth note
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.01, r=0.05, sustain=1.0):
    e = np.full(n, sustain)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, sustain, na)
    if nr < n: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def add(buf_l, buf_r, t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    buf_l[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    buf_r[i:i + len(sig)] += sig * gain * (1 + min(0, pan))


def smooth(x, k):
    return np.convolve(x, np.ones(k) / k, mode='same')


# ---------- instruments ----------
def clarinet(freq_arr):
    """Odd-harmonic reed tone with delayed vibrato; freq_arr allows glides."""
    n = len(freq_arr); tt = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.6 * tt) * np.clip((tt - 0.08) / 0.1, 0, 1)
    ph = 2 * np.pi * np.cumsum(freq_arr * vib) / SR
    s = np.sin(ph) + 0.45 * np.sin(3 * ph) + 0.22 * np.sin(5 * ph) + 0.1 * np.sin(7 * ph)
    return s / 1.8


def lead_note(t0, midi, dur, gain=0.30):
    n = int(dur * SR)
    s = clarinet(np.full(n, hz(midi))) * env(n, 0.012, min(0.06, dur * 0.4))
    add(L, R, t0, s, gain, 0.0)


def lead_glide(t0, m0, m1, dur, gain=0.30):
    n = int(dur * SR)
    f = hz(m0) * (hz(m1) / hz(m0)) ** (np.linspace(0, 1, n) ** 1.6)
    add(L, R, t0, clarinet(f) * env(n, 0.01, 0.08), gain, 0.0)


def accordion(t0, midis, dur=0.17, gain=0.11):
    n = int(dur * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for m in midis:
        for det in (-0.004, 0.004):
            f = hz(m) * (1 + det)
            s += 2 * ((tt * f) % 1) - 1          # sawtooth
    s = smooth(s, 9) / (2 * len(midis))
    e = env(n, 0.008, 0.06)
    add(L, R, t0, s * e, gain, -0.35)
    add(L, R, t0 + 0.012, s * e, gain * 0.8, 0.35)


def bass(t0, midi, dur=0.3, gain=0.42):
    n = int(dur * SR); tt = np.arange(n) / SR; f = hz(midi)
    s = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)
    add(L, R, t0, s * np.exp(-tt * 9) * env(n, 0.005, 0.03), gain)


def kick(t0, gain=0.55):
    n = int(0.16 * SR); tt = np.arange(n) / SR
    f = 50 + 90 * np.exp(-tt * 30)
    add(L, R, t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 22), gain)


def snare(t0, gain=0.20):
    n = int(0.12 * SR); tt = np.arange(n) / SR
    nz = rng.standard_normal(n); nz = nz - smooth(nz, 6)
    add(L, R, t0, (nz * 0.8 + 0.4 * np.sin(2 * np.pi * 190 * tt)) * np.exp(-tt * 30), gain)


def hat(t0, gain=0.07):
    n = int(0.04 * SR); tt = np.arange(n) / SR
    nz = rng.standard_normal(n); nz = nz - smooth(nz, 3)
    add(L, R, t0, nz * np.exp(-tt * 90), gain, 0.3)


def crash(t0, gain=0.22, length=1.6):
    n = int(length * SR); tt = np.arange(n) / SR
    nz = rng.standard_normal(n); nz = nz - smooth(nz, 4)
    add(L, R, t0, nz * np.exp(-tt * 2.6), gain, -0.2)
    add(L, R, t0, rng.standard_normal(n) * np.exp(-tt * 2.6) * 0.3, gain * 0.5, 0.2)


# ---------- harmony (D freygish) ----------
CH = {'D': (50, [62, 66, 69]), 'Gm': (55, [62, 67, 70]), 'Eb': (51, [63, 67, 70]), 'Cm': (48, [63, 67, 72])}

# ---------- melody: lists of (midi, eighths) per bar ----------
A = [[(69,1),(70,1),(69,1),(67,1)], [(66,1),(67,1),(69,2)], [(70,1),(72,1),(70,1),(69,1)], [(67,1),(66,1),(67,2)],
     [(66,1),(63,1),(66,1),(67,1)], [(69,1),(67,1),(66,1),(63,1)], [(62,1),(63,1),(66,1),(63,1)], [(62,4)]]
B = [[(74,1),(74,1),(72,1),(70,1)], [(72,1),(70,1),(69,2)], [(70,1),(69,1),(67,1),(66,1)], [(67,2),(69,2)],
     [(74,1),(75,1),(74,1),(72,1)], [(70,1),(72,1),(74,2)], [(72,1),(70,1),(69,1),(66,1)], [(69,1),(66,1),(62,2)]]
CHORDS_A = ['D', 'D', 'Gm', 'Gm', 'D', 'D', 'Eb', 'D']
CHORDS_B = ['Gm', 'Gm', 'D', 'D', 'Gm', 'Eb', 'D', 'D']

# bar plan (25 bars x 0.8 s = 20 s), aligned to the video scenes
plan = {}                                   # bar -> (chord, melody bar or None, intensity)
for b in range(2): plan[b] = ('D', None, 0.6)                          # 0.0-1.6 intro groove
for i in range(8): plan[2 + i] = (CHORDS_A[i], A[i], 0.75)             # 1.6-8.0 tune A (question, meter)
plan[10] = ('D', 'glide', 1.0); plan[11] = ('Eb', 'trill', 1.0); plan[12] = ('D', 'trill', 1.0)  # 8.0-10.4 overshoot + grandma
for i in range(8): plan[13 + i] = (CHORDS_B[i], B[i], 1.0)             # 10.4-16.8 tune B (side effects)
for i, k in enumerate([4, 5, 6]): plan[21 + i] = (['D', 'Eb', 'D'][i], A[k], 1.0)  # 16.8-19.2 finale
plan[24] = ('D', 'end', 1.0)                                            # 19.2-20 final hit

for b, (ch, mel, inten) in plan.items():
    t = b * BAR
    root, tri = CH[ch]
    if mel == 'end':
        kick(t); crash(t, 0.28, 0.8); bass(t, root, 0.75, 0.5)
        for m in [62, 66, 69, 74]: lead_note(t, m, 0.75, 0.10)
        accordion(t, tri, 0.75, 0.16)
        continue
    for k in range(2):                       # oom-pah in 2/4
        bt = t + k * BEAT
        bass(bt, root if k == 0 else root + 7, gain=0.42 * inten)
        accordion(bt + E8, tri, gain=0.11 * inten)
        kick(bt, 0.55 * inten)
        if b >= 2: snare(bt + E8, 0.2 * inten)
        if b >= 13: hat(bt + E8 / 2); hat(bt + 3 * E8 / 2)
    if mel is None:
        continue
    if mel == 'glide':
        lead_glide(t, 62, 74, BAR * 0.9, 0.32)
        crash(8.4)                           # needle goes off the scale at 8.4 s
    elif mel == 'trill':
        for k in range(8): lead_note(t + k * E8 / 2, 74 if k % 2 == 0 else 75, E8 / 2, 0.24)
    else:
        pos = t
        for m, d in mel:
            lead_note(pos, m, d * E8 * 0.95, 0.30 * (0.8 + 0.2 * inten))
            pos += d * E8

crash(16.8, 0.2)                             # finale entrance

# ---------- master ----------
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix /= np.max(np.abs(mix)) / 0.89
fade = int(0.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
fi = int(0.02 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
out = Path(__file__).with_name('lsk-music.wav')
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, f'{DUR}s')
