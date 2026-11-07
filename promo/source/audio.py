# Soothing ambient bed: slow warm pad, soft felt-piano notes, gentle reverb. No clicks or whooshes.
import numpy as np, wave
sr = 44100; T = 20.0; n = int(sr * T); t = np.arange(n) / sr
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
L = np.zeros(n); R = np.zeros(n)

def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / sr)
    return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))

# pad: D maj9 -> B m7 -> G maj9 -> A sus -> D maj9, long crossfades
chords = [(0.0, [50, 57, 62, 64, 66]), (4.6, [47, 54, 59, 62, 66]), (8.8, [43, 50, 57, 59, 62]),
          (12.3, [45, 52, 57, 59, 64]), (16.3, [50, 57, 62, 64, 66, 69])]
for i, (st, notes) in enumerate(chords):
    en = chords[i + 1][0] if i + 1 < len(chords) else T + 2
    e = np.clip((t - st + 1.0) / 2.0, 0, 1) * np.clip((en + 1.0 - t) / 2.0, 0, 1)
    e = np.sin(e * np.pi / 2) ** 2
    for k, m in enumerate(notes):
        f = hz(m); amp = 0.06 if m < 55 else 0.04
        for side, det in ((L, 1.0012), (R, 0.9988)):
            s = np.sin(2 * np.pi * f * det * t + k) + 0.18 * np.sin(2 * np.pi * 2 * f * t + 1.3 * k)
            side += s * e * amp * (0.85 + 0.15 * np.sin(2 * np.pi * (0.07 + 0.02 * k) * t + k))

# felt-piano notes: soft attack, quick-ish decay, mellow
def note(at, m, amp, pan=0.0):
    tt = t - at; mask = tt >= 0; tt = np.where(mask, tt, 0)
    f = hz(m)
    env = (1 - np.exp(-tt / 0.012)) * np.exp(-tt / 1.6) * mask
    s = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / 0.5)
         + 0.08 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt / 0.25)) * env * amp
    global L, R
    L += s * (1 - pan) ; R += s * (1 + pan)

mel = [(2.9, 74), (3.5, 78), (4.2, 81),            # brand reveal
       (5.6, 78), (6.6, 74), (7.6, 76),            # duo
       (9.0, 74), (9.65, 76), (10.3, 78), (10.95, 81), (11.6, 83),  # five styles
       (12.6, 81), (13.4, 76), (14.8, 76), (15.6, 73), (16.5, 74),
       (17.8, 78), (18.0, 81), (18.25, 86)]        # end card
for i, (at, m) in enumerate(mel):
    note(at, m, 0.05, pan=0.25 * np.sin(i * 1.7))

dry = np.stack([L, R])
dry = np.stack([lowpass(c, 2400) for c in dry])

# simple reverb: convolve with decaying noise tail
rng = np.random.default_rng(1)
ir_len = int(sr * 3.2); ti = np.arange(ir_len) / sr
wet = []
for ch in range(2):
    ir = rng.standard_normal(ir_len) * np.exp(-ti / 0.9)
    ir = lowpass(ir, 3000); ir /= np.sqrt((ir ** 2).sum())
    N = n + ir_len
    w = np.fft.irfft(np.fft.rfft(dry[ch], N) * np.fft.rfft(ir, N), N)[:n]
    wet.append(w)
out = 0.7 * dry + 0.55 * np.stack(wet)

# fades
fade = np.clip(t / 1.2, 0, 1) * np.clip((T - t) / 1.5, 0, 1)
out *= fade
out /= np.abs(out).max(); out *= 0.7
d = (out.T * 32767).astype(np.int16)
with wave.open('music.wav', 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(sr); f.writeframes(d.tobytes())
print('ok')
