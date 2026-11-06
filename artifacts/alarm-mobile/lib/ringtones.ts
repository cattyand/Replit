export const RINGTONES = [
  { name: 'Sveglia classica', key: 'classic', file: 'classic.wav' },
  { name: 'Campanelli', key: 'bells', file: 'bells.wav' },
  { name: 'Melodia mattutina', key: 'morning', file: 'morning.wav' },
  { name: 'Digitale', key: 'digital', file: 'digital.wav' },
  { name: 'Natura', key: 'nature', file: 'nature.wav' },
  { name: 'Gallo', key: 'rooster', file: 'rooster.wav' },
  { name: 'Sirena dolce', key: 'siren', file: 'siren.wav' },
  { name: 'Carillon', key: 'music-box', file: 'music-box.wav' },
] as const;

export const RINGTONE_ASSETS: Record<string, number> = {
  classic: require('../assets/sounds/classic.wav'),
  bells: require('../assets/sounds/bells.wav'),
  morning: require('../assets/sounds/morning.wav'),
  digital: require('../assets/sounds/digital.wav'),
  nature: require('../assets/sounds/nature.wav'),
  rooster: require('../assets/sounds/rooster.wav'),
  siren: require('../assets/sounds/siren.wav'),
  'music-box': require('../assets/sounds/music-box.wav'),
};

export function ringtoneForName(name: string) {
  return RINGTONES.find(ringtone => ringtone.name === name) ?? RINGTONES[0];
}
