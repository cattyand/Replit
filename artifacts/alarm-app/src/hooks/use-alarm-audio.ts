import { useEffect, useRef, useCallback } from "react";

export const RINGTONE_PATTERNS: Record<string, { freqs: number[]; gap: number; type: OscillatorType }> = {
  "Sveglia classica":  { freqs: [880, 880, 880],           gap: 0.9, type: "sine" },
  "Campanelli":        { freqs: [523, 659, 784, 659],      gap: 1.2, type: "sine" },
  "Melodia mattutina": { freqs: [440, 554, 659, 784, 659], gap: 1.5, type: "sine" },
  "Digitale":          { freqs: [1200, 900, 1200, 900],    gap: 0.6, type: "square" },
  "Natura":            { freqs: [330, 440, 550, 440],      gap: 1.4, type: "sine" },
  "Gallo":             { freqs: [550, 700, 900, 700, 550], gap: 1.8, type: "sawtooth" },
  "Sirena dolce":      { freqs: [600, 800, 600, 800],      gap: 1.0, type: "sine" },
  "Carillon":          { freqs: [523, 587, 659, 698, 784], gap: 1.6, type: "triangle" },
};

export const FALLBACK_PATTERN = RINGTONE_PATTERNS["Sveglia classica"];
const BEEP_DURATION = 0.22;
const NOTE_SPACING  = 0.30;

interface UseAlarmAudioOptions {
  enabled: boolean;
  volume: number;
  gradualVolumeSecs: number;
  ringtone: string;
}

/** Safely close an AudioContext — guards against the "already closed" rejection. */
function safeClose(ctx: AudioContext) {
  if (ctx.state !== "closed") {
    ctx.close().catch(() => { /* already closed or suspended — safe to ignore */ });
  }
}

/**
 * Plays a ringtone preview for `durationMs` milliseconds (default 5000).
 * Returns a stop function so the caller can cancel early (e.g. on unmount).
 */
export function playRingtonePreview(ringtone: string, volume: number, durationMs = 5000): () => void {
  let ctx: AudioContext;
  try { ctx = new AudioContext(); } catch { return () => { /* noop */ }; }

  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(Math.max(0.01, volume / 100), ctx.currentTime);

  const pattern = RINGTONE_PATTERNS[ringtone] ?? FALLBACK_PATTERN;
  let stopped = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    stopped = true;
    if (timerId !== null) { clearTimeout(timerId); timerId = null; }
    try { master.gain.setValueAtTime(0, ctx.currentTime); } catch { /* ignore */ }
    if (ctx.state !== "closed") ctx.close().catch(() => { /* ignore */ });
  };

  const BEEP_DUR = 0.22;
  const NOTE_SP  = 0.30;

  function schedulePattern(startAt: number) {
    if (stopped) return;
    pattern.freqs.forEach((freq, i) => {
      const t   = startAt + i * NOTE_SP;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(master);
      osc.type = pattern.type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.9, t + 0.01);
      g.gain.setValueAtTime(0.9, t + BEEP_DUR - 0.02);
      g.gain.linearRampToValueAtTime(0, t + BEEP_DUR);
      osc.start(t); osc.stop(t + BEEP_DUR + 0.02);
    });
    const nextStart   = startAt + pattern.freqs.length * NOTE_SP + pattern.gap;
    const msUntilNext = (nextStart - ctx.currentTime) * 1000 - 80;
    timerId = setTimeout(() => schedulePattern(nextStart), Math.max(0, msUntilNext));
  }

  schedulePattern(ctx.currentTime + 0.05);
  timerId = setTimeout(stop, durationMs);
  return stop;
}

export function useAlarmAudio({ enabled, volume, gradualVolumeSecs, ringtone }: UseAlarmAudioOptions) {
  const ctxRef    = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const stoppedRef = useRef(true);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMutedRef = useRef(false);
  const volumeRef  = useRef(volume);

  volumeRef.current = volume;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  /** Stop audio immediately and release the AudioContext. Safe to call multiple times. */
  const stopAudio = useCallback(() => {
    stoppedRef.current = true;
    clearTimer();
    // Silence immediately then release — order matters
    const ctx    = ctxRef.current;
    const master = masterRef.current;
    // Null refs first so the useEffect cleanup sees them as already gone
    ctxRef.current    = null;
    masterRef.current = null;
    if (master && ctx) {
      try { master.gain.setValueAtTime(0, ctx.currentTime); } catch { /* ignore */ }
    }
    if (ctx) safeClose(ctx);
  }, []);

  const muteAudio = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    if (!masterRef.current || !ctxRef.current) return;
    try {
      masterRef.current.gain.setValueAtTime(
        muted ? 0 : volumeRef.current / 100,
        ctxRef.current.currentTime
      );
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    ctxRef.current   = ctx;
    stoppedRef.current = false;

    const master = ctx.createGain();
    master.connect(ctx.destination);
    masterRef.current = master;

    const targetGain = volume / 100;
    if (gradualVolumeSecs > 0) {
      master.gain.setValueAtTime(0.001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(
        Math.max(targetGain, 0.001),
        ctx.currentTime + gradualVolumeSecs
      );
    } else {
      master.gain.setValueAtTime(targetGain, ctx.currentTime);
    }

    const pattern = RINGTONE_PATTERNS[ringtone] ?? FALLBACK_PATTERN;

    function schedulePattern(startAt: number) {
      // Guard: if stopped or context changed, don't schedule more nodes
      if (stoppedRef.current || ctxRef.current !== ctx) return;

      pattern.freqs.forEach((freq, i) => {
        const t    = startAt + i * NOTE_SPACING;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = pattern.type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.9, t + 0.01);
        gain.gain.setValueAtTime(0.9, t + BEEP_DURATION - 0.02);
        gain.gain.linearRampToValueAtTime(0, t + BEEP_DURATION);
        osc.start(t);
        osc.stop(t + BEEP_DURATION + 0.02);
      });

      const nextStart    = startAt + pattern.freqs.length * NOTE_SPACING + pattern.gap;
      const msUntilNext  = (nextStart - ctx.currentTime) * 1000 - 80;
      timerRef.current = setTimeout(() => schedulePattern(nextStart), Math.max(0, msUntilNext));
    }

    schedulePattern(ctx.currentTime + 0.05);

    return () => {
      // Only act if this effect's ctx is still the active one (stopAudio may have already cleaned up)
      stoppedRef.current = true;
      clearTimer();
      if (ctxRef.current === ctx) {
        ctxRef.current    = null;
        masterRef.current = null;
      }
      try { master.gain.setValueAtTime(0, ctx.currentTime); } catch { /* ignore */ }
      safeClose(ctx);
    };
  }, [enabled, ringtone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!masterRef.current || !ctxRef.current || isMutedRef.current) return;
    try {
      masterRef.current.gain.setValueAtTime(volume / 100, ctxRef.current.currentTime);
    } catch { /* ignore */ }
  }, [volume]);

  return { stopAudio, muteAudio };
}
