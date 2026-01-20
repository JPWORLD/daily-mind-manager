#!/usr/bin/env python3
"""
Generate simple ambient WAV files (rain and sea) into public/ambient.
This creates short filtered noise WAVs suitable as placeholders (CC0-like generated content).
"""
import wave
import struct
import random
import math
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'ambient')
os.makedirs(OUT_DIR, exist_ok=True)

def write_wav(path, samples, sr=44100):
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        data = b''.join(struct.pack('<h', int(max(-32767, min(32767, int(s*32767))))) for s in samples)
        wf.writeframes(data)

def make_white_noise(duration=10, sr=44100, amp=0.3):
    tot = int(duration * sr)
    return [(random.random()*2-1) * amp for _ in range(tot)]

def lowpass(samples, sr=44100, cutoff=800.0):
    # simple one-pole lowpass
    rc = 1.0 / (2 * math.pi * cutoff)
    dt = 1.0 / sr
    alpha = dt / (rc + dt)
    out = []
    prev = 0.0
    for s in samples:
        prev = prev + (alpha * (s - prev))
        out.append(prev)
    return out

def highpass(samples, sr=44100, cutoff=800.0):
    # highpass via subtracting lowpass
    lp = lowpass(samples, sr, cutoff)
    return [s - l for s, l in zip(samples, lp)]

def normalize(samples, target=0.6):
    m = max(abs(s) for s in samples) or 1.0
    factor = target / m
    return [s * factor for s in samples]

if __name__ == '__main__':
    print('Generating ambient samples...')
    # rain: highpass-ish noisy texture
    rain = make_white_noise(duration=12, amp=0.25)
    rain = highpass(rain, cutoff=700)
    rain = normalize(rain, 0.35)
    write_wav(os.path.join(OUT_DIR, 'rain.wav'), rain)

    # sea: low rumbling
    sea = make_white_noise(duration=14, amp=0.25)
    sea = lowpass(sea, cutoff=600)
    sea = normalize(sea, 0.28)
    write_wav(os.path.join(OUT_DIR, 'sea.wav'), sea)

    print('WAV files written to', OUT_DIR)
