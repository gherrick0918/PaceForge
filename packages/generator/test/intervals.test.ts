import { describe, expect, it } from 'vitest';
import { type DeviceProfile, makeIntervals } from '../src/index.js';

const baseProfile: DeviceProfile = {
  name: 'Test Device',
  units: 'mph',
  speeds: [1, 1.5, 2, 2.5, 3],
  minSegmentSec: 30,
  rampLimitPerChange: 1,
};

describe('makeIntervals', () => {
  it('creates the expected number of segments and durations', () => {
    const workout = makeIntervals(baseProfile, {
      name: 'Custom Intervals',
      warmupMins: 1,
      cooldownMins: 1,
      repeats: 3,
      hardSecs: 60,
      easySecs: 30,
      hardIntensity: 0.85,
      easyIntensity: 0.55,
    });

    expect(workout.name).toBe('Custom Intervals');
    expect(workout.units).toBe('mph');
    expect(workout.segments).toHaveLength(8);
    expect(workout.segments[0].secs).toBe(60);
    expect(workout.segments[1].secs).toBe(60);
    expect(workout.segments[2].secs).toBe(30);
    expect(workout.totalSecs).toBe(60 + 3 * (60 + 30) + 60);
  });

  it('annotates segments when ramp limits clamp speeds', () => {
    const profile: DeviceProfile = {
      ...baseProfile,
      speeds: [1, 2, 3],
      rampLimitPerChange: 0.2,
    };

    const workout = makeIntervals(profile, {
      warmupMins: 1,
      cooldownMins: 0,
      repeats: 1,
      hardSecs: 60,
      easySecs: 30,
      hardIntensity: 1,
      easyIntensity: 1,
    });

    expect(workout.segments.some((segment) => segment.cue?.includes('(clamped)'))).toBe(true);
    expect(workout.segments[0].speed).toBe(workout.segments[1].speed);
  });

  it('merges adjacent identical speeds when below the minimum segment duration', () => {
    const profile: DeviceProfile = {
      ...baseProfile,
      rampLimitPerChange: 0,
      minSegmentSec: 120,
    };

    const workout = makeIntervals(profile, {
      warmupMins: 1,
      cooldownMins: 0,
      repeats: 1,
      hardSecs: 60,
      easySecs: 30,
      hardIntensity: 1,
      easyIntensity: 1,
    });

    expect(workout.segments).toHaveLength(1);
    expect(workout.segments[0].secs).toBe(60 + 60 + 30);
  });
});
