import { describe, expect, it } from 'vitest';
import { type DeviceProfile, makeProgression } from '../src/index.js';

const profile: DeviceProfile = {
  name: 'Test Device',
  units: 'mph',
  speeds: [1, 1.5, 2, 2.5, 3],
  minSegmentSec: 30,
  rampLimitPerChange: 1,
};

describe('makeProgression', () => {
  it('builds a non-decreasing progression ladder with correct timing', () => {
    const workout = makeProgression(profile, { totalMins: 30, steps: 5, topIntensity: 0.85 });

    const stepSegments = workout.segments.filter((segment) => segment.cue?.startsWith('Step'));
    expect(stepSegments).toHaveLength(5);

    const speeds = stepSegments.map((segment) => segment.speed);
    const sorted = [...speeds].sort((a, b) => a - b);
    expect(speeds).toEqual(sorted);

    const totalStepSecs = stepSegments.reduce((sum, segment) => sum + segment.secs, 0);
    const totalWarmCool = workout.segments[0].secs + workout.segments[workout.segments.length - 1].secs;
    expect(totalStepSecs + totalWarmCool).toBe(workout.totalSecs);
    expect(workout.totalSecs).toBe(30 * 60);
    expect(workout.segments[workout.segments.length - 1].speed).toBe(workout.segments[0].speed);
  });
});
