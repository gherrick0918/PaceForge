import { describe, expect, it } from 'vitest';
import { type DeviceProfile, makeSteady } from '../src/index.js';

const profile: DeviceProfile = {
  name: 'Test Device',
  units: 'mph',
  speeds: [1, 1.5, 2, 2.5, 3],
  minSegmentSec: 30,
  rampLimitPerChange: 1,
};

describe('makeSteady', () => {
  it('adds four strides by default when duration allows', () => {
    const workout = makeSteady(profile, { totalMins: 30, intensity: 0.7 });
    const strideSegments = workout.segments.filter((segment) => segment.cue?.startsWith('Stride'));
    expect(strideSegments).toHaveLength(4);

    const cruiseSegments = workout.segments.filter((segment) => segment.cue?.includes('Cruise'));
    expect(cruiseSegments.length).toBeGreaterThan(0);

    const strideSpeed = strideSegments[0]?.speed ?? 0;
    const cruiseSpeed = cruiseSegments[0]?.speed ?? 0;
    expect(strideSpeed).toBeGreaterThan(cruiseSpeed);
    expect(workout.totalSecs).toBe(30 * 60);
  });

  it('can disable strides explicitly', () => {
    const workout = makeSteady(profile, { totalMins: 30, intensity: 0.7, addStrides: false });
    expect(workout.segments).toHaveLength(3);
  });
});
