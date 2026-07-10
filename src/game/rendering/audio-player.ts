import Phaser from 'phaser';
import { SFX_NOISE_BUFFER_DURATION_SECONDS } from '../constants';
import type { SfxCue } from '../audio/sfx-cues';
import { isAudioContextReady } from '../audio/audio-availability';

const MILLISECONDS_PER_SECOND = 1000;

/** Gain-node target value for silence — named, like `radial-glow.ts`'s own
 * `TRANSPARENT`, since it carries domain meaning ("nothing audible") beyond
 * being the number 0. */
const SILENT_GAIN = 0;

export interface SfxCueHandle {
  /** Stops a looping cue (only `THRUST_CUE` loops) from scheduling its next
   * repeat — the pass already in flight finishes its own release tail
   * untouched (see `SfxCue.loop`'s own doc comment in `audio/sfx-cues.ts`).
   * A no-op for a one-shot cue's handle, which already stops itself. */
  readonly stop: () => void;
}

/** A handle whose `stop()` does nothing — returned whenever this module
 * can't actually schedule real audio (unsupported browser, or the
 * AudioContext still suspended by the browser's autoplay policy), so every
 * call site can treat "audio unavailable" and "audio played" identically
 * without a null check of its own. */
const SILENT_HANDLE: SfxCueHandle = {
  stop: (): void => {
    // Nothing was ever scheduled — see this constant's own doc comment.
  },
};

/** Cached per-`AudioContext` (there is only ever one for this page's whole
 * lifetime — one `Phaser.Game`, one `WebAudioSoundManager` — but comparing
 * the reference rather than assuming that avoids a stale buffer surviving
 * a context replacement). Regenerating a fresh noise buffer on every single
 * crash would be cheap but pointless churn for data that never needs to
 * change. */
let cachedNoiseBuffer: { readonly context: AudioContext; readonly buffer: AudioBuffer } | null =
  null;

function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer !== null && cachedNoiseBuffer.context === context) {
    return cachedNoiseBuffer.buffer;
  }
  const sampleCount = Math.floor(context.sampleRate * SFX_NOISE_BUFFER_DURATION_SECONDS);
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoiseBuffer = { context, buffer };
  return buffer;
}

/**
 * `scene.sound` is one of three Phaser sound-manager implementations,
 * chosen automatically depending on browser support — only
 * `WebAudioSoundManager` exposes a real Web Audio `AudioContext`/
 * `destination` this module can schedule nodes against. Returns `null` for
 * the other two (no audio support at all, or the older HTML5 `<audio>`-
 * element manager) rather than throwing, matching this module's "audio is
 * enhancement, never a hard dependency" contract.
 */
function resolveWebAudioDestination(
  scene: Phaser.Scene,
): { readonly context: AudioContext; readonly destination: AudioNode } | null {
  if (!(scene.sound instanceof Phaser.Sound.WebAudioSoundManager)) {
    return null;
  }
  return { context: scene.sound.context, destination: scene.sound.destination };
}

/**
 * Schedules exactly one attack/decay/sustain/release pass of `cue` against
 * a real AudioContext: an OscillatorNode for every tonal waveform, or a
 * filtered noise-buffer source for `'noise'` (see `SfxCue.frequency`'s own
 * doc comment on why the same breakpoints mean different things for the
 * two cases). Self-cleans up its own nodes via the source's `'ended'`
 * event — nothing else ever references them again for a one-shot cue;
 * `playSfxCue`'s loop branch calls this again on a timer for a looping one.
 */
function scheduleOnePass(
  context: AudioContext,
  destination: AudioNode,
  cue: SfxCue,
  noiseBuffer: AudioBuffer | null,
): void {
  const startTime = context.currentTime;
  const [freqStart, freqEnd] = cue.frequency;
  const freqStartTime = startTime + freqStart.atMs / MILLISECONDS_PER_SECOND;
  const freqEndTime = startTime + freqEnd.atMs / MILLISECONDS_PER_SECOND;
  const attackEndTime = startTime + cue.gain.attackMs / MILLISECONDS_PER_SECOND;
  const decayEndTime = attackEndTime + cue.gain.decayMs / MILLISECONDS_PER_SECOND;
  const releaseStartTime = startTime + cue.durationMs / MILLISECONDS_PER_SECOND;
  const releaseEndTime = releaseStartTime + cue.gain.releaseMs / MILLISECONDS_PER_SECOND;
  const sustainGain = cue.gain.peakGain * cue.gain.sustainLevel;

  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(SILENT_GAIN, startTime);
  gainNode.gain.linearRampToValueAtTime(cue.gain.peakGain, attackEndTime);
  gainNode.gain.linearRampToValueAtTime(sustainGain, decayEndTime);
  gainNode.gain.setValueAtTime(sustainGain, releaseStartTime);
  gainNode.gain.linearRampToValueAtTime(SILENT_GAIN, releaseEndTime);
  gainNode.connect(destination);

  let source: OscillatorNode | AudioBufferSourceNode;
  if (cue.waveform === 'noise') {
    const noiseSource = context.createBufferSource();
    // playSfxCue only ever passes a non-null noiseBuffer when
    // cue.waveform === 'noise' (it builds one via getNoiseBuffer() first).
    noiseSource.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freqStart.frequencyHz, freqStartTime);
    filter.frequency.linearRampToValueAtTime(freqEnd.frequencyHz, freqEndTime);
    noiseSource.connect(filter);
    filter.connect(gainNode);
    source = noiseSource;
  } else {
    const oscillator = context.createOscillator();
    oscillator.type = cue.waveform;
    oscillator.frequency.setValueAtTime(freqStart.frequencyHz, freqStartTime);
    oscillator.frequency.linearRampToValueAtTime(freqEnd.frequencyHz, freqEndTime);
    oscillator.connect(gainNode);
    source = oscillator;
  }

  source.start(startTime);
  source.stop(releaseEndTime);
  source.addEventListener('ended', () => {
    source.disconnect();
    gainNode.disconnect();
  });
}

/**
 * Schedules `cue` for real playback against `scene`'s own Web Audio
 * context and returns a handle to stop it (meaningful only for the
 * looping thrust cue — see `SfxCueHandle.stop`'s own doc comment).
 *
 * Degrades silently rather than throwing or rejecting in every case this
 * project's other browser-API-dependent code already degrades for
 * (`persistence/safe-local-storage.ts`'s `getSafeLocalStorage()`): no Web
 * Audio support, an AudioContext still suspended by the browser's autoplay
 * policy (Phaser's own `WebAudioSoundManager` resumes it on the first real
 * user gesture — verified directly against
 * `node_modules/phaser/src/sound/webaudio/WebAudioSoundManager.js`'s own
 * `unlock()` — so every subsequent real trigger point just starts working
 * from that point on; there is deliberately no queued/backlog playback of
 * whatever was missed while suspended), or any other unexpected failure
 * scheduling the underlying nodes. Audio is enhancement, never a hard
 * dependency — nothing here may ever crash gameplay. The "not ready yet"
 * half of that check is `isAudioContextReady` (`audio/audio-availability.ts`)
 * — a plain predicate, not inlined here, so this exact fallback branch has
 * a real unit test (see that module's own doc comment for why it couldn't
 * live in this Phaser-importing file instead).
 */
export function playSfxCue(scene: Phaser.Scene, cue: SfxCue): SfxCueHandle {
  try {
    const audio = resolveWebAudioDestination(scene);
    if (audio === null || !isAudioContextReady(audio.context.state)) {
      return SILENT_HANDLE;
    }

    const noiseBuffer = cue.waveform === 'noise' ? getNoiseBuffer(audio.context) : null;

    if (!cue.loop) {
      scheduleOnePass(audio.context, audio.destination, cue, noiseBuffer);
      return SILENT_HANDLE;
    }

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleNext = (): void => {
      if (stopped) {
        return;
      }
      scheduleOnePass(audio.context, audio.destination, cue, noiseBuffer);
      timeoutId = setTimeout(scheduleNext, cue.durationMs);
    };
    scheduleNext();

    return {
      stop: (): void => {
        stopped = true;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      },
    };
  } catch {
    // Real browsers essentially never throw synchronously here, but this
    // is exactly the case this project's "always degrade gracefully" rule
    // exists for — see this function's own doc comment.
    return SILENT_HANDLE;
  }
}
