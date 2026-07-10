import {
  SFX_ACHIEVEMENT_ATTACK_MS,
  SFX_ACHIEVEMENT_DECAY_MS,
  SFX_ACHIEVEMENT_DURATION_MS,
  SFX_ACHIEVEMENT_FREQUENCY_END_HZ,
  SFX_ACHIEVEMENT_FREQUENCY_START_HZ,
  SFX_ACHIEVEMENT_PEAK_GAIN,
  SFX_ACHIEVEMENT_RELEASE_MS,
  SFX_ACHIEVEMENT_SUSTAIN_LEVEL,
  SFX_CRASH_ATTACK_MS,
  SFX_CRASH_DECAY_MS,
  SFX_CRASH_DURATION_MS,
  SFX_CRASH_FILTER_END_HZ,
  SFX_CRASH_FILTER_START_HZ,
  SFX_CRASH_PEAK_GAIN,
  SFX_CRASH_RELEASE_MS,
  SFX_CRASH_SUSTAIN_LEVEL,
  SFX_LANDING_ATTACK_MS,
  SFX_LANDING_DECAY_MS,
  SFX_LANDING_DURATION_MS,
  SFX_LANDING_FREQUENCY_END_HZ,
  SFX_LANDING_FREQUENCY_START_HZ,
  SFX_LANDING_PEAK_GAIN,
  SFX_LANDING_RELEASE_MS,
  SFX_LANDING_SUSTAIN_LEVEL,
  SFX_THRUST_ATTACK_MS,
  SFX_THRUST_DECAY_MS,
  SFX_THRUST_DURATION_MS,
  SFX_THRUST_FREQUENCY_END_HZ,
  SFX_THRUST_FREQUENCY_START_HZ,
  SFX_THRUST_PEAK_GAIN,
  SFX_THRUST_RELEASE_MS,
  SFX_THRUST_SUSTAIN_LEVEL,
  SFX_WEAPON_FIRE_ATTACK_MS,
  SFX_WEAPON_FIRE_DECAY_MS,
  SFX_WEAPON_FIRE_DURATION_MS,
  SFX_WEAPON_FIRE_FREQUENCY_END_HZ,
  SFX_WEAPON_FIRE_FREQUENCY_START_HZ,
  SFX_WEAPON_FIRE_PEAK_GAIN,
  SFX_WEAPON_FIRE_RELEASE_MS,
  SFX_WEAPON_FIRE_SUSTAIN_LEVEL,
} from '../constants';

/**
 * This project has no external audio assets (see PLAN.md §4/Milestone 13 —
 * every visual is procedurally baked at runtime, and audio follows the same
 * philosophy): every sound cue is synthesized at runtime from plain data
 * describing an oscillator (or a filtered noise burst), not loaded from a
 * `.mp3`/`.wav`/`.ogg` file. `'noise'` has no fundamental pitch — it plays a
 * short procedurally-generated white-noise buffer instead of an
 * OscillatorNode (see `rendering/audio-player.ts`, the Phaser/Web-Audio-
 * touching module that actually schedules these).
 */
export type SfxWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

/**
 * One point on a piecewise-linear curve over the cue's own playback
 * timeline (`atMs` since the cue started). Every cue below uses exactly
 * two points — a start and an end — gliding from one to the other across
 * the whole pass; expressive enough for this milestone's five short tone
 * sweeps/chimes without needing a variable-length breakpoint array.
 *
 * For every waveform except `'noise'`, this is the oscillator's frequency
 * in Hz. For `'noise'`, there is no fundamental frequency to sweep —
 * `rendering/audio-player.ts` instead reads these same breakpoints as a
 * lowpass-filter cutoff curve applied to the noise buffer, the idiomatic
 * Web Audio way to make a burst of noise read as "descending" (the crash
 * cue's own brief, harsh cutoff sweep).
 */
interface SfxFrequencyPoint {
  readonly atMs: number;
  readonly frequencyHz: number;
}

/**
 * Attack-decay-sustain-release amplitude shape, every field in gain units
 * (0-1) except the three `*Ms` fields. `peakGain` is the gain reached at
 * the end of `attackMs`; `sustainLevel` is a *fraction of* `peakGain` (not
 * an absolute gain) that decay settles to and holds until release begins.
 */
interface SfxGainEnvelope {
  readonly attackMs: number;
  readonly decayMs: number;
  readonly sustainLevel: number;
  readonly releaseMs: number;
  readonly peakGain: number;
}

/**
 * One full pass takes `durationMs` from the cue's start until release
 * begins — i.e. attack + decay + however long the sustain plateau holds in
 * between (see each cue constant's own inline comment for the resulting
 * hold length) — then `gain.releaseMs` more to reach silence.
 * `frequency[1].atMs` always equals `durationMs`: the frequency/filter
 * glide finishes exactly as release begins, so release always fades out at
 * a fixed pitch/cutoff rather than while still sweeping.
 *
 * `loop` (true only for `THRUST_CUE`) doesn't change any of the above — it
 * only tells `rendering/audio-player.ts`'s `playSfxCue` to retrigger the
 * exact same pass back-to-back, every `durationMs`, for as long as thrust
 * is held. Stopping is then just "don't schedule the next one"; the
 * already-scheduled pass's own release tail plays out untouched, so there
 * is no separate release-on-stop path to get wrong. The audible result — a
 * repeating attack/decay/release right at each cycle boundary — reads as
 * an engine "chugging," which is the intended texture, not an artifact.
 */
export interface SfxCue {
  readonly waveform: SfxWaveform;
  readonly frequency: readonly [SfxFrequencyPoint, SfxFrequencyPoint];
  readonly gain: SfxGainEnvelope;
  readonly durationMs: number;
  readonly loop: boolean;
}

/** Played while thrust is held (`GameScene.update()`), stopped the instant
 * it's released. Sustain hold = 220 - (20 + 40) = 160ms of each 220ms
 * cycle. */
export const THRUST_CUE: SfxCue = {
  waveform: 'sawtooth',
  frequency: [
    { atMs: 0, frequencyHz: SFX_THRUST_FREQUENCY_START_HZ },
    { atMs: SFX_THRUST_DURATION_MS, frequencyHz: SFX_THRUST_FREQUENCY_END_HZ },
  ],
  gain: {
    attackMs: SFX_THRUST_ATTACK_MS,
    decayMs: SFX_THRUST_DECAY_MS,
    sustainLevel: SFX_THRUST_SUSTAIN_LEVEL,
    releaseMs: SFX_THRUST_RELEASE_MS,
    peakGain: SFX_THRUST_PEAK_GAIN,
  },
  durationMs: SFX_THRUST_DURATION_MS,
  loop: true,
};

/** Played once at outcome resolution (`GameScene.update()`) on a safe
 * touchdown. Sustain hold = 500 - (20 + 60) = 420ms. */
export const LANDING_CUE: SfxCue = {
  waveform: 'sine',
  frequency: [
    { atMs: 0, frequencyHz: SFX_LANDING_FREQUENCY_START_HZ },
    { atMs: SFX_LANDING_DURATION_MS, frequencyHz: SFX_LANDING_FREQUENCY_END_HZ },
  ],
  gain: {
    attackMs: SFX_LANDING_ATTACK_MS,
    decayMs: SFX_LANDING_DECAY_MS,
    sustainLevel: SFX_LANDING_SUSTAIN_LEVEL,
    releaseMs: SFX_LANDING_RELEASE_MS,
    peakGain: SFX_LANDING_PEAK_GAIN,
  },
  durationMs: SFX_LANDING_DURATION_MS,
  loop: false,
};

/** Played once at outcome resolution (`GameScene.update()`) on a crash.
 * Sustain hold = 600 - (5 + 120) = 475ms. */
export const CRASH_CUE: SfxCue = {
  waveform: 'noise',
  frequency: [
    { atMs: 0, frequencyHz: SFX_CRASH_FILTER_START_HZ },
    { atMs: SFX_CRASH_DURATION_MS, frequencyHz: SFX_CRASH_FILTER_END_HZ },
  ],
  gain: {
    attackMs: SFX_CRASH_ATTACK_MS,
    decayMs: SFX_CRASH_DECAY_MS,
    sustainLevel: SFX_CRASH_SUSTAIN_LEVEL,
    releaseMs: SFX_CRASH_RELEASE_MS,
    peakGain: SFX_CRASH_PEAK_GAIN,
  },
  durationMs: SFX_CRASH_DURATION_MS,
  loop: false,
};

/** Played once per real shot (`GameScene.triggerActiveWeapon()`). Sustain
 * hold = 140 - (5 + 40) = 95ms. */
export const WEAPON_FIRE_CUE: SfxCue = {
  waveform: 'square',
  frequency: [
    { atMs: 0, frequencyHz: SFX_WEAPON_FIRE_FREQUENCY_START_HZ },
    { atMs: SFX_WEAPON_FIRE_DURATION_MS, frequencyHz: SFX_WEAPON_FIRE_FREQUENCY_END_HZ },
  ],
  gain: {
    attackMs: SFX_WEAPON_FIRE_ATTACK_MS,
    decayMs: SFX_WEAPON_FIRE_DECAY_MS,
    sustainLevel: SFX_WEAPON_FIRE_SUSTAIN_LEVEL,
    releaseMs: SFX_WEAPON_FIRE_RELEASE_MS,
    peakGain: SFX_WEAPON_FIRE_PEAK_GAIN,
  },
  durationMs: SFX_WEAPON_FIRE_DURATION_MS,
  loop: false,
};

/** Played once per toast shown (`WorldMapScene.showNextAchievementToastIfIdle()`).
 * Sustain hold = 450 - (10 + 40) = 400ms. */
export const ACHIEVEMENT_UNLOCK_CUE: SfxCue = {
  waveform: 'triangle',
  frequency: [
    { atMs: 0, frequencyHz: SFX_ACHIEVEMENT_FREQUENCY_START_HZ },
    { atMs: SFX_ACHIEVEMENT_DURATION_MS, frequencyHz: SFX_ACHIEVEMENT_FREQUENCY_END_HZ },
  ],
  gain: {
    attackMs: SFX_ACHIEVEMENT_ATTACK_MS,
    decayMs: SFX_ACHIEVEMENT_DECAY_MS,
    sustainLevel: SFX_ACHIEVEMENT_SUSTAIN_LEVEL,
    releaseMs: SFX_ACHIEVEMENT_RELEASE_MS,
    peakGain: SFX_ACHIEVEMENT_PEAK_GAIN,
  },
  durationMs: SFX_ACHIEVEMENT_DURATION_MS,
  loop: false,
};

/** Every cue this milestone defines, for iteration (data-validation tests,
 * a future cue-listing debug tool) without hand-maintaining a second list
 * that could drift from the individual exports above. */
export const ALL_SFX_CUES: readonly SfxCue[] = [
  THRUST_CUE,
  LANDING_CUE,
  CRASH_CUE,
  WEAPON_FIRE_CUE,
  ACHIEVEMENT_UNLOCK_CUE,
];
