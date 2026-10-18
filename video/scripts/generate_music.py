import math
import random
import struct
import wave

SAMPLE_RATE = 44100
DURATION = 92
random.seed(7)

def tone(freq, t, length, gain=0.12):
    if t < 0 or t > length:
        return 0.0
    fade = min(1.0, t * 18.0, (length - t) * 8.0)
    return math.sin(2 * math.pi * freq * t) * gain * fade

notes = [55.0, 65.41, 73.42, 82.41]
with wave.open("public/music.wav", "wb") as out:
    out.setnchannels(2)
    out.setsampwidth(2)
    out.setframerate(SAMPLE_RATE)
    frames = bytearray()
    for index in range(SAMPLE_RATE * DURATION):
        now = index / SAMPLE_RATE
        beat = int(now * 2) % 8
        bar = int(now / 4) % len(notes)
        value = tone(notes[bar], (now % 4), 3.85, 0.08)
        value += tone(notes[bar] * 2, (now % 2), 1.85, 0.035)
        if beat in (0, 4):
            value += tone(110, now % 0.5, 0.22, 0.045)
        if beat in (2, 6):
            value += tone(165, now % 0.5, 0.12, 0.028)
        shimmer = math.sin(2 * math.pi * (440 + 18 * math.sin(now / 7)) * now) * 0.006
        value += shimmer + (random.random() - 0.5) * 0.002
        value = max(-0.5, min(0.5, value))
        sample = int(value * 32767)
        frames += struct.pack("<hh", sample, sample)
    out.writeframes(frames)
