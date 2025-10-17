import profileData from '../profiles/greg-walkpad.json' assert { type: 'json' };
import {
  type DeviceProfile,
  type Units,
  describe,
  makeIntervals,
  makeProgression,
  makeSteady,
} from './index.js';

const profile: DeviceProfile = {
  ...profileData,
  units: profileData.units as Units,
  speeds: [...profileData.speeds],
};

const mode = process.argv[2] ?? 'intervals';

function print(workoutName: string) {
  console.log(`\n=== ${workoutName} ===`);
}

switch (mode) {
  case 'steady': {
    const workout = makeSteady(profile, { name: 'Steady Demo', totalMins: 30, intensity: 0.7, addStrides: true });
    print(workout.name);
    console.log(describe(workout));
    break;
  }
  case 'progression': {
    const workout = makeProgression(profile, { name: 'Progression Demo', totalMins: 30, steps: 5, topIntensity: 0.85 });
    print(workout.name);
    console.log(describe(workout));
    break;
  }
  default: {
    const workout = makeIntervals(profile, {
      name: 'Intervals Demo',
      warmupMins: 5,
      cooldownMins: 5,
      repeats: 6,
      hardSecs: 90,
      easySecs: 90,
      hardIntensity: 0.85,
      easyIntensity: 0.55,
    });
    print(workout.name);
    console.log(describe(workout));
  }
}
