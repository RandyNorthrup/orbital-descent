import { describe, expect, it } from 'vitest';
import { darken, lighten, mixColors } from './color-mix';

describe('lighten', () => {
  it('returns the color unchanged at amount 0', () => {
    expect(lighten(0x8a4a42, 0)).toBe(0x8a4a42);
  });

  it('returns pure white at amount 1 regardless of input', () => {
    expect(lighten(0x000000, 1)).toBe(0xffffff);
    expect(lighten(0x8a4a42, 1)).toBe(0xffffff);
  });

  it('moves each channel proportionally toward 255 (hand-computed midpoint)', () => {
    // 0x004080 at 0.5: r 0->128 (0x80), g 64->160 (0xa0), b 128->192 (0xc0)
    expect(lighten(0x004080, 0.5)).toBe(0x80a0c0);
  });

  it('never overflows a channel past 0xff into a neighboring byte', () => {
    expect(lighten(0xff00ff, 0.5)).toBe(0xff80ff);
  });
});

describe('darken', () => {
  it('returns the color unchanged at amount 0', () => {
    expect(darken(0x8a4a42, 0)).toBe(0x8a4a42);
  });

  it('returns pure black at amount 1 regardless of input', () => {
    expect(darken(0xffffff, 1)).toBe(0x000000);
    expect(darken(0x8a4a42, 1)).toBe(0x000000);
  });

  it('scales each channel proportionally toward 0 (hand-computed midpoint)', () => {
    // 0x80a0c0 at 0.5: 128->64 (0x40), 160->80 (0x50), 192->96 (0x60)
    expect(darken(0x80a0c0, 0.5)).toBe(0x405060);
  });
});

describe('mixColors', () => {
  it('returns exactly the from color at t 0 and exactly the to color at t 1', () => {
    expect(mixColors(0x123456, 0xabcdef, 0)).toBe(0x123456);
    expect(mixColors(0x123456, 0xabcdef, 1)).toBe(0xabcdef);
  });

  it('returns the per-channel midpoint at t 0.5 (hand-computed)', () => {
    // r: (0x00+0xff)/2 = 0x80 (rounded), g: (0x40+0x80)/2 = 0x60,
    // b: (0x80+0x00)/2 = 0x40
    expect(mixColors(0x004080, 0xff8000, 0.5)).toBe(0x806040);
  });

  it('mixing a color with itself is the identity at any t', () => {
    expect(mixColors(0x8a4a42, 0x8a4a42, 0.3)).toBe(0x8a4a42);
  });
});
