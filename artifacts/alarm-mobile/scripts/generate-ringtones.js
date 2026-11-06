const fs = require('node:fs');
const path = require('node:path');

const sampleRate = 22050;
const duration = 4.5;
const definitions = {
  classic: { notes: [880, 0, 880, 0, 880], gap: 0.28, shape: 'sine' },
  bells: { notes: [523, 659, 784, 659, 0], gap: 0.16, shape: 'sine' },
  morning: { notes: [440, 554, 659, 784, 659, 554], gap: 0.12, shape: 'sine' },
  digital: { notes: [1200, 0, 900, 0, 1200, 0, 900], gap: 0.1, shape: 'square' },
  nature: { notes: [330, 440, 550, 440, 0], gap: 0.25, shape: 'sine' },
  rooster: { notes: [550, 700, 900, 700, 550, 0], gap: 0.18, shape: 'triangle' },
  siren: { notes: [600, 800, 600, 800, 0], gap: 0.2, shape: 'sine' },
  'music-box': { notes: [523, 587, 659, 698, 784, 698], gap: 0.14, shape: 'triangle' },
};

function wave(freq, time, shape) {
  const phase = 2 * Math.PI * freq * time;
  if (shape === 'square') return Math.sin(phase) >= 0 ? 0.55 : -0.55;
  if (shape === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(phase)) * 0.75;
  return Math.sin(phase) * 0.72;
}

function createTone({ notes, gap, shape }) {
  const frames = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(frames * 2);
  const noteDuration = 0.23;
  const stride = noteDuration + gap;
  for (let frame = 0; frame < frames; frame++) {
    const time = frame / sampleRate;
    const notePosition = (time % (notes.length * stride));
    const noteIndex = Math.floor(notePosition / stride);
    const noteTime = notePosition - noteIndex * stride;
    const frequency = notes[noteIndex];
    let sample = 0;
    if (frequency && noteTime < noteDuration) {
      const fadeIn = Math.min(1, noteTime / 0.012);
      const fadeOut = Math.min(1, (noteDuration - noteTime) / 0.035);
      sample = wave(frequency, noteTime, shape) * Math.max(0, Math.min(fadeIn, fadeOut));
    }
    const envelope = Math.min(1, time / 0.03, (duration - time) / 0.06);
    data.writeInt16LE(Math.round(sample * envelope * 26000), frame * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const outputDirectory = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outputDirectory, { recursive: true });
for (const [name, definition] of Object.entries(definitions)) {
  const fileName = name.replaceAll('-', '_');
  fs.writeFileSync(path.join(outputDirectory, `${fileName}.wav`), createTone(definition));
}
console.log(`Created ${Object.keys(definitions).length} short local alarm tones.`);
