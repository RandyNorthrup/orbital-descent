/**
 * Whether a synthesized cue may actually be scheduled against a real Web
 * Audio `AudioContext` right now — the fallback decision behind this
 * milestone's own binding acceptance criterion ("audio initializes on
 * first user interaction if blocked at boot").
 *
 * `undefined` covers `rendering/audio-player.ts`'s `resolveWebAudioDestination`
 * returning `null` (no `WebAudioSoundManager` at all — unsupported browser,
 * or Phaser picked one of its other two sound-manager implementations).
 * Any defined `state` other than `'running'` — most commonly `'suspended'`,
 * an `AudioContext` still blocked by the browser's autoplay policy at boot
 * — also defers rather than plays. There is deliberately no queued/backlog
 * playback for a cue missed while not ready: Phaser's own
 * `WebAudioSoundManager` already resumes a suspended context on the first
 * real user gesture (verified directly against
 * `node_modules/phaser/src/sound/webaudio/WebAudioSoundManager.js` — see
 * `scenes/boot-scene.ts`'s own doc comment for the full citation), so every
 * trigger point simply starts working again once that happens, on its own.
 *
 * Extracted as its own plain, Phaser-free predicate — unlike the rest of
 * `rendering/audio-player.ts`, which imports Phaser directly and so can't
 * be exercised by a plain Node `vitest` run at all (confirmed directly:
 * importing the installed `phaser` package outside a real browser throws
 * `window is not defined`, before a single test in that file could even
 * run) — purely so this exact fallback branch has a real unit test rather
 * than only ever being exercised end-to-end via Playwright.
 */
export function isAudioContextReady(state: AudioContextState | undefined): boolean {
  return state === 'running';
}
