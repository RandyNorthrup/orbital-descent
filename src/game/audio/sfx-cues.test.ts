import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_UNLOCK_CUE,
  ALL_SFX_CUES,
  CRASH_CUE,
  LANDING_CUE,
  THRUST_CUE,
  WEAPON_FIRE_CUE,
  type SfxCue,
  type SfxWaveform,
} from './sfx-cues';

const VALID_WAVEFORMS: readonly SfxWaveform[] = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];

function expectWellFormed(cue: SfxCue): void {
  expect(VALID_WAVEFORMS).toContain(cue.waveform);
  expect(cue.durationMs).toBeGreaterThan(0);
  expect(typeof cue.loop).toBe('boolean');

  const [start, end] = cue.frequency;
  expect(start.atMs).toBe(0);
  expect(end.atMs).toBe(cue.durationMs);
  expect(start.frequencyHz).toBeGreaterThan(0);
  expect(end.frequencyHz).toBeGreaterThan(0);

  expect(cue.gain.attackMs).toBeGreaterThan(0);
  expect(cue.gain.decayMs).toBeGreaterThan(0);
  expect(cue.gain.releaseMs).toBeGreaterThan(0);
  // Leaves a non-negative sustain-hold plateau between decay ending and
  // release beginning at `durationMs` (see each cue's own inline comment
  // in sfx-cues.ts for the resulting hold length).
  expect(cue.gain.attackMs + cue.gain.decayMs).toBeLessThanOrEqual(cue.durationMs);
  expect(cue.gain.sustainLevel).toBeGreaterThanOrEqual(0);
  expect(cue.gain.sustainLevel).toBeLessThanOrEqual(1);
  expect(cue.gain.peakGain).toBeGreaterThan(0);
  expect(cue.gain.peakGain).toBeLessThanOrEqual(1);
}

describe('SFX cue definitions', () => {
  it('has exactly 5 cues: thrust, landing, crash, weapon fire, achievement unlock', () => {
    expect(ALL_SFX_CUES).toHaveLength(5);
    expect(ALL_SFX_CUES).toEqual([
      THRUST_CUE,
      LANDING_CUE,
      CRASH_CUE,
      WEAPON_FIRE_CUE,
      ACHIEVEMENT_UNLOCK_CUE,
    ]);
  });

  it('gives every cue a well-formed shape', () => {
    for (const cue of ALL_SFX_CUES) {
      expectWellFormed(cue);
    }
  });

  it('only the thrust cue loops', () => {
    expect(THRUST_CUE.loop).toBe(true);
    for (const cue of [LANDING_CUE, CRASH_CUE, WEAPON_FIRE_CUE, ACHIEVEMENT_UNLOCK_CUE]) {
      expect(cue.loop).toBe(false);
    }
  });

  it('gives the crash cue a noise waveform, and every other cue a tonal oscillator waveform', () => {
    expect(CRASH_CUE.waveform).toBe('noise');
    for (const cue of [THRUST_CUE, LANDING_CUE, WEAPON_FIRE_CUE, ACHIEVEMENT_UNLOCK_CUE]) {
      expect(cue.waveform).not.toBe('noise');
    }
  });

  it('gives every cue a distinct full configuration', () => {
    const signatures = new Set(ALL_SFX_CUES.map((cue) => JSON.stringify(cue)));
    expect(signatures.size).toBe(ALL_SFX_CUES.length);
  });

  it('gives landing and achievement-unlock distinct registers despite both being resolving two-note rises', () => {
    expect(LANDING_CUE.frequency[0].frequencyHz).not.toBe(
      ACHIEVEMENT_UNLOCK_CUE.frequency[0].frequencyHz,
    );
    expect(LANDING_CUE.frequency[1].frequencyHz).not.toBe(
      ACHIEVEMENT_UNLOCK_CUE.frequency[1].frequencyHz,
    );
  });
});
