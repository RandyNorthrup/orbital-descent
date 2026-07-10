import { describe, expect, it } from 'vitest';
import { isAudioContextReady } from './audio-availability';

describe('isAudioContextReady', () => {
  it('is ready only when the context state is exactly "running"', () => {
    expect(isAudioContextReady('running')).toBe(true);
  });

  it('defers (not throws) while the browser autoplay policy blocks the context', () => {
    expect(isAudioContextReady('suspended')).toBe(false);
  });

  it('defers for a closed context', () => {
    expect(isAudioContextReady('closed')).toBe(false);
  });

  it('defers when there is no WebAudioSoundManager at all (undefined state)', () => {
    expect(isAudioContextReady(undefined)).toBe(false);
  });
});
