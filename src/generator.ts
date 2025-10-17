
export type Units = 'mph' | 'kph';

export type DeviceProfile = {
  name: string;
  units: Units;
  speeds: number[];           // Allowed discrete speeds (sorted ascending)
  inclines?: number[];        // Optional allowed inclines
  minSegmentSec?: number;     // Smallest segment duration you want to allow
  rampLimitPerChange?: number; // Optional max delta in speed between adjacent segments
};

export type Segment = {
  secs: number;
  speed: number;
  incline?: number;
  cue?: string;
};

export type Workout = {
  name: string;
  totalSecs: number;
  segments: Segment[];
};

function quantizeDown(allowed: number[], target: number): number {
  // pick the largest allowed value <= target, otherwise the smallest allowed
  let candidate = allowed[0];
  for (const v of allowed) {
    if (v <= target) candidate = v;
    else break;
  }
  return candidate;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export type IntervalPlanOpts = {
  name?: string;
  warmupMins?: number;
  cooldownMins?: number;
  repeats?: number;
  hardSecs?: number;
  easySecs?: number;
  hardIntensity?: number; // 0..1 as a % of max allowed speed
  easyIntensity?: number; // 0..1
};

export function makeIntervals(profile: DeviceProfile, opts: IntervalPlanOpts): Workout {
  const {
    name = "Intervals",
    warmupMins = 5,
    cooldownMins = 5,
    repeats = 6,
    hardSecs = 90,
    easySecs = 90,
    hardIntensity = 0.85,
    easyIntensity = 0.55,
  } = opts;

  const speeds = [...profile.speeds].sort((a,b)=>a-b);
  const max = speeds[speeds.length-1];
  const min = speeds[0];

  const warm = quantizeDown(speeds, clamp(min + (max-min)*0.35, min, max));
  const hardTarget = clamp(max * hardIntensity, min, max);
  const easyTarget = clamp(max * easyIntensity, min, max);
  const hard = quantizeDown(speeds, hardTarget);
  const easy = quantizeDown(speeds, easyTarget);

  const segs: Segment[] = [];
  segs.push({ secs: Math.round(warmupMins*60), speed: warm, cue: `Warm-up @ ${warm} ${profile.units}` });

  for (let i=0;i<repeats;i++) {
    segs.push({ secs: hardSecs, speed: hard, cue: `Hard ${i+1}/${repeats} @ ${hard} ${profile.units}` });
    segs.push({ secs: easySecs, speed: easy, cue: `Easy ${i+1}/${repeats} @ ${easy} ${profile.units}` });
  }

  segs.push({ secs: Math.round(cooldownMins*60), speed: warm, cue: `Cool-down @ ${warm} ${profile.units}` });

  // Enforce minSegmentSec if provided (merge tiny tail segments)
  const minSecs = profile.minSegmentSec ?? 30;
  const merged: Segment[] = [];
  for (const s of segs) {
    if (merged.length && s.speed === merged[merged.length-1].speed && (merged[merged.length-1].secs < minSecs || s.secs < minSecs)) {
      merged[merged.length-1].secs += s.secs;
      merged[merged.length-1].cue = merged[merged.length-1].cue || s.cue;
    } else {
      merged.push({ ...s });
    }
  }

  const totalSecs = merged.reduce((a,b)=>a+b.secs,0);
  return { name, totalSecs, segments: merged };
}

export type SteadyOpts = {
  name?: string;
  totalMins?: number;
  intensity?: number; // 0..1 of max
  addStrides?: boolean;
};

export function makeSteady(profile: DeviceProfile, opts: SteadyOpts): Workout {
  const { name="Steady", totalMins=30, intensity=0.65, addStrides=true } = opts;
  const speeds = [...profile.speeds].sort((a,b)=>a-b);
  const max = speeds[speeds.length-1];
  const min = speeds[0];

  const warm = quantizeDown(speeds, clamp(min + (max-min)*0.35, min, max));
  const cruise = quantizeDown(speeds, clamp(max*intensity, min, max));

  const segs: Segment[] = [
    { secs: 5*60, speed: warm, cue: `Warm-up @ ${warm} ${profile.units}` },
    { secs: (totalMins-10)*60, speed: cruise, cue: `Cruise @ ${cruise} ${profile.units}` },
    { secs: 5*60, speed: warm, cue: `Cool-down @ ${warm} ${profile.units}` },
  ];

  if (addStrides && totalMins >= 25 && speeds.length >= 3) {
    // Insert four 20s strides near the end of cruise to break monotony
    const stride = quantizeDown(speeds, clamp(max*0.9, min, max));
    const insertAt = 1; // cruise segment
    const cruiseSeg = segs[insertAt];
    const pre = Math.max(0, cruiseSeg.secs - (4*20 + 4*40)); // leave 40s easy between strides
    const newSegs: Segment[] = [
      segs[0],
      { secs: pre, speed: cruiseSeg.speed, cue: `Cruise @ ${cruise} ${profile.units}` },
    ];
    for (let i=0;i<4;i++) {
      newSegs.push({ secs: 20, speed: stride, cue: `Stride ${i+1}/4 @ ${stride} ${profile.units}` });
      newSegs.push({ secs: 40, speed: cruiseSeg.speed, cue: `Easy between strides @ ${cruiseSeg.speed} ${profile.units}` });
    }
    newSegs.push(segs[2]);
    return { name, totalSecs: newSegs.reduce((a,b)=>a+b.secs,0), segments: newSegs };
  }

  return { name, totalSecs: segs.reduce((a,b)=>a+b.secs,0), segments: segs };
}

export type ProgressionOpts = {
  name?: string;
  totalMins?: number;
  steps?: number; // number of speed steps from warm to top
  topIntensity?: number; // fraction of max speed to finish at
};

export function makeProgression(profile: DeviceProfile, opts: ProgressionOpts): Workout {
  const { name="Progression", totalMins=30, steps=4, topIntensity=0.8 } = opts;
  const speeds = [...profile.speeds].sort((a,b)=>a-b);
  const max = speeds[speeds.length-1];
  const min = speeds[0];
  const warm = quantizeDown(speeds, clamp(min + (max-min)*0.35, min, max));
  const top = quantizeDown(speeds, clamp(max*topIntensity, min, max));

  // Build an ascending ladder from warm to top across 'steps' equal segments, then cool down
  const ladder: number[] = [];
  const uniqueSpeeds = speeds.filter(s => s >= warm && s <= top);
  // pick evenly spaced indices across uniqueSpeeds
  for (let i=0;i<steps;i++) {
    const idx = Math.round((i/(steps-1))*(uniqueSpeeds.length-1));
    ladder.push(uniqueSpeeds[idx]);
  }

  const workSecs = (totalMins-10)*60; // minus warm/cool
  const each = Math.floor(workSecs / steps);

  const segs: Segment[] = [{ secs: 5*60, speed: warm, cue: `Warm-up @ ${warm} ${profile.units}` }];
  ladder.forEach((sp, i) => {
    segs.push({ secs: each, speed: sp, cue: `Step ${i+1}/${steps} @ ${sp} ${profile.units}` });
  });
  segs.push({ secs: 5*60, speed: warm, cue: `Cool-down @ ${warm} ${profile.units}` });

  return { name, totalSecs: segs.reduce((a,b)=>a+b.secs,0), segments: segs };
}

// Pretty print helper
export function describe(workout: Workout) {
  let t = 0;
  const pad = (n:number)=>String(n).padStart(2,'0');
  const lines = workout.segments.map(seg => {
    const start = t;
    t += seg.secs;
    const sMin = Math.floor(start/60), sSec = start%60;
    const eMin = Math.floor(t/60), eSec = t%60;
    return `${pad(sMin)}:${pad(sSec)}–${pad(eMin)}:${pad(eSec)}  @ ${seg.speed} ${workout.name.includes('kph')?'kph':''}  ${seg.cue ?? ''}`.trim();
  });
  return lines.join('\n');
}
