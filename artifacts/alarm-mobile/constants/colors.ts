/**
 * Palette synchronized with artifacts/alarm-app/src/index.css.
 * The web product is intentionally dark in both appearance modes.
 */
const sharedPalette = {
  text: '#f8fafc',
  tint: '#47b4eb',
  background: '#131520',
  foreground: '#f8fafc',
  card: '#191c29',
  cardForeground: '#f8fafc',
  primary: '#47b4eb',
  primaryForeground: '#131520',
  secondary: '#252837',
  secondaryForeground: '#f8fafc',
  muted: '#212431',
  mutedForeground: '#94a3b8',
  accent: '#0a415c',
  accentForeground: '#a3daf5',
  destructive: '#d92644',
  destructiveForeground: '#ffffff',
  border: '#252837',
  input: '#252837',
  alarmName: '#fb923c',
  alarmWarning: '#f97316',
  alarmWarningBackground: '#431407',
  alarmWarningBorder: '#fb923c',
};

const colors = {
  light: { ...sharedPalette },
  dark: { ...sharedPalette },
  radius: 16,
};

export default colors;
