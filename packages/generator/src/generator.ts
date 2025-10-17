export type Units = 'mph' | 'kph';

export type DeviceProfile = {
  name: string;
  units: Units;
  speeds: number[];
  inclines?: number[];
  minSegmentSec?: number;
  rampLimitPerChange?: number;
};

export type Segment = {
  secs: number;
  speed: number;
  incline?: number;
  cue?: string;
};

export type Workout = {
  name: string;
  units: Units;
  totalSecs: number;
  segments: Segment[];
};

export type IntervalPlanOpts = {
  name?: string;
  warmupMins?: number;
  cooldownMins?: number;
  repeats?: number;
  hardSecs?: number;
  easySecs?: number;
  hardIntensity?: number;
  easyIntensity?: number;
};

export type SteadyOpts = {
  name?: string;
  totalMins?: number;
  intensity?: number;
  addStrides?: boolean;
};

export type ProgressionOpts = {
  name?: string;
  totalMins?: number;
  steps?: number;
  topIntensity?: number;
};

export function quantizeDown(allowed: number[], target: number): number {
  if (!allowed.length) {
    throw new Error('Device profile speeds cannot be empty.');
  }

  let candidate = allowed[0];
  for (const value of allowed) {
    if (value <= target) {
      candidate = value;
    } else {
      break;
    }
  }
  return candidate;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function sortSpeeds(speeds: number[]): number[] {
  return [...speeds].sort((a, b) => a - b);
}

function mergeCue(previous?: string, next?: string) {
  if (previous && next && previous !== next) {
    return `${previous} | ${next}`;
  }
  return previous ?? next;
}

function applySafety(profile: DeviceProfile, rawSegments: Segment[]): Segment[] {
  const allowed = sortSpeeds(profile.speeds);
  const rampLimit = profile.rampLimitPerChange;
  const minSegmentSec = profile.minSegmentSec;

  const constrained: Segment[] = [];

  for (const segment of rawSegments) {
    const baseSpeed = quantizeDown(allowed, segment.speed);
    let speed = baseSpeed;
    let cue = segment.cue;

    if (constrained.length && rampLimit !== undefined) {
      const prevSpeed = constrained[constrained.length - 1].speed;
      if (Math.abs(speed - prevSpeed) > rampLimit) {
        const candidates = allowed.filter((value) => Math.abs(value - prevSpeed) <= rampLimit);
        if (candidates.length) {
          let best = candidates[0];
          let bestDiff = Math.abs(best - baseSpeed);
          for (const candidate of candidates) {
            const diff = Math.abs(candidate - baseSpeed);
            if (diff < bestDiff) {
              best = candidate;
              bestDiff = diff;
            }
          }
          if (best !== speed) {
            speed = best;
            cue = cue ? `${cue} (clamped)` : '(clamped)';
          }
        } else if (prevSpeed !== speed) {
          speed = prevSpeed;
          cue = cue ? `${cue} (clamped)` : '(clamped)';
        }
      }
    }

    constrained.push({ ...segment, speed, cue });
  }

  if (minSegmentSec === undefined) {
    return constrained.map((segment) => ({ ...segment }));
  }

  const merged: Segment[] = [];
  for (const segment of constrained) {
    if (
      merged.length &&
      merged[merged.length - 1].speed === segment.speed &&
      (merged[merged.length - 1].secs < minSegmentSec || segment.secs < minSegmentSec)
    ) {
      merged[merged.length - 1] = {
        ...merged[merged.length - 1],
        secs: merged[merged.length - 1].secs + segment.secs,
        cue: mergeCue(merged[merged.length - 1].cue, segment.cue),
      };
    } else {
      merged.push({ ...segment });
    }
  }

  return merged.map((segment) => ({ ...segment }));
}

function finalizeWorkout(profile: DeviceProfile, name: string | undefined, segments: Segment[]): Workout {
  const resolvedName = name ?? profile.name;
  const constrained = applySafety(profile, segments);
  const totalSecs = constrained.reduce((sum, segment) => sum + segment.secs, 0);
  return { name: resolvedName, units: profile.units, totalSecs, segments: constrained };
}

export function makeIntervals(profile: DeviceProfile, opts: IntervalPlanOpts = {}): Workout {
  const speeds = sortSpeeds(profile.speeds);
  const max = speeds[speeds.length - 1];
  const min = speeds[0];

  const {
    name = 'Intervals',
    warmupMins = 5,
    cooldownMins = 5,
    repeats = 6,
    hardSecs = 90,
    easySecs = 90,
    hardIntensity = 0.85,
    easyIntensity = 0.55,
  } = opts;

  const warmTarget = clamp(min + (max - min) * 0.35, min, max);
  const warm = quantizeDown(speeds, warmTarget);
  const hardTarget = clamp(max * hardIntensity, min, max);
  const easyTarget = clamp(max * easyIntensity, min, max);
  const hard = quantizeDown(speeds, hardTarget);
  const easy = quantizeDown(speeds, easyTarget);

  const segments: Segment[] = [];

  if (warmupMins > 0) {
    segments.push({
      secs: Math.round(warmupMins * 60),
      speed: warm,
      cue: `Warm-up @ ${warm} ${profile.units}`,
    });
  }

  for (let i = 0; i < repeats; i++) {
    segments.push({
      secs: hardSecs,
      speed: hard,
      cue: `Hard ${i + 1}/${repeats} @ ${hard} ${profile.units}`,
    });
    segments.push({
      secs: easySecs,
      speed: easy,
      cue: `Easy ${i + 1}/${repeats} @ ${easy} ${profile.units}`,
    });
  }

  if (cooldownMins > 0) {
    segments.push({
      secs: Math.round(cooldownMins * 60),
      speed: warm,
      cue: `Cool-down @ ${warm} ${profile.units}`,
    });
  }

  return finalizeWorkout(profile, name, segments);
}

export function makeSteady(profile: DeviceProfile, opts: SteadyOpts = {}): Workout {
  const speeds = sortSpeeds(profile.speeds);
  const max = speeds[speeds.length - 1];
  const min = speeds[0];

  const { name = 'Steady', totalMins = 30, intensity = 0.65, addStrides = true } = opts;

  const warmTarget = clamp(min + (max - min) * 0.35, min, max);
  const warm = quantizeDown(speeds, warmTarget);
  const cruiseTarget = clamp(max * intensity, min, max);
  const cruise = quantizeDown(speeds, cruiseTarget);

  const totalSecs = Math.max(0, Math.round(totalMins * 60));
  const warmSecs = Math.min(totalSecs / 2, 5 * 60);
  const coolSecs = warmSecs;
  const cruiseSecs = Math.max(0, totalSecs - warmSecs - coolSecs);

  const segments: Segment[] = [
    { secs: Math.round(warmSecs), speed: warm, cue: `Warm-up @ ${warm} ${profile.units}` },
    { secs: Math.round(cruiseSecs), speed: cruise, cue: `Cruise @ ${cruise} ${profile.units}` },
    { secs: Math.round(coolSecs), speed: warm, cue: `Cool-down @ ${warm} ${profile.units}` },
  ];

  if (addStrides && cruiseSecs >= 4 * (20 + 40) && speeds.length >= 3) {
    const strideTarget = clamp(max * 0.9, min, max);
    const stride = quantizeDown(speeds, strideTarget);
    const cruiseSeg = segments[1];
    const baseCue = cruiseSeg.cue;
    const preCruise = Math.max(0, cruiseSeg.secs - (4 * 20 + 4 * 40));

    const rebuilt: Segment[] = [segments[0]];
    if (preCruise > 0) {
      rebuilt.push({ secs: preCruise, speed: cruiseSeg.speed, cue: baseCue });
    }
    for (let i = 0; i < 4; i++) {
      rebuilt.push({
        secs: 20,
        speed: stride,
        cue: `Stride ${i + 1}/4 @ ${stride} ${profile.units}`,
      });
      rebuilt.push({
        secs: 40,
        speed: cruiseSeg.speed,
        cue: `Easy between strides @ ${cruiseSeg.speed} ${profile.units}`,
      });
    }
    rebuilt.push(segments[2]);
    return finalizeWorkout(profile, name, rebuilt);
  }

  return finalizeWorkout(profile, name, segments);
}

export function makeProgression(profile: DeviceProfile, opts: ProgressionOpts = {}): Workout {
  const speeds = sortSpeeds(profile.speeds);
  const max = speeds[speeds.length - 1];
  const min = speeds[0];

  const { name = 'Progression', totalMins = 30, steps = 4, topIntensity = 0.8 } = opts;

  const warmTarget = clamp(min + (max - min) * 0.35, min, max);
  const warm = quantizeDown(speeds, warmTarget);
  const topTarget = clamp(max * topIntensity, warm, max);
  const top = quantizeDown(speeds, topTarget);

  const stepCount = Math.max(1, steps);
  const usableSpeeds = speeds.filter((speed) => speed >= warm && speed <= top);
  const ladder: number[] = [];
  for (let i = 0; i < stepCount; i++) {
    if (usableSpeeds.length === 0) {
      ladder.push(warm);
      continue;
    }
    const idx =
      stepCount === 1 ? usableSpeeds.length - 1 : Math.round((i / (stepCount - 1)) * (usableSpeeds.length - 1));
    ladder.push(usableSpeeds[idx]);
  }

  const totalSecs = Math.max(0, Math.round(totalMins * 60));
  const warmSecs = Math.min(totalSecs / 2, 5 * 60);
  const coolSecs = warmSecs;
  const workSecs = Math.max(0, totalSecs - warmSecs - coolSecs);
  const baseStepSecs = stepCount ? Math.floor(workSecs / stepCount) : 0;
  let remainder = workSecs - baseStepSecs * stepCount;

  const segments: Segment[] = [
    { secs: Math.round(warmSecs), speed: warm, cue: `Warm-up @ ${warm} ${profile.units}` },
  ];

  ladder.forEach((speed, index) => {
    let secs = baseStepSecs;
    if (remainder > 0) {
      secs += 1;
      remainder -= 1;
    }
    segments.push({
      secs,
      speed,
      cue: `Step ${index + 1}/${stepCount} @ ${speed} ${profile.units}`,
    });
  });

  segments.push({ secs: Math.round(coolSecs), speed: warm, cue: `Cool-down @ ${warm} ${profile.units}` });

  return finalizeWorkout(profile, name, segments);
}

export function describe(workout: Workout): string {
  let elapsed = 0;
  const pad = (value: number) => String(value).padStart(2, '0');
  return workout.segments
    .map((segment) => {
      const start = elapsed;
      elapsed += segment.secs;
      const startMin = Math.floor(start / 60);
      const startSec = start % 60;
      const endMin = Math.floor(elapsed / 60);
      const endSec = elapsed % 60;
      const cue = segment.cue ? `  ${segment.cue}` : '';
      return `${pad(startMin)}:${pad(startSec)}–${pad(endMin)}:${pad(endSec)}  @ ${segment.speed} ${workout.units}${cue}`;
    })
    .join('\n');
}
