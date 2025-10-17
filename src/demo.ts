
import { DeviceProfile, makeIntervals, makeSteady, makeProgression, describe } from "./generator.js";

// Example device profile (adjust speeds to match your walking pad options)
const profile: DeviceProfile = {
  name: "Greg's Walking Pad",
  units: "mph",
  speeds: [1.0, 1.5, 2.0, 2.5, 3.0],
  minSegmentSec: 30
};

const mode = process.argv[2] ?? "intervals";

let workout;
if (mode === "steady") {
  workout = makeSteady(profile, { name: "Steady", totalMins: 30, intensity: 0.7, addStrides: true });
} else if (mode === "progression") {
  workout = makeProgression(profile, { name: "Progression", totalMins: 30, steps: 5, topIntensity: 0.85 });
} else {
  workout = makeIntervals(profile, { name: "Intervals", warmupMins: 5, cooldownMins: 5, repeats: 6, hardSecs: 90, easySecs: 90, hardIntensity: 0.85, easyIntensity: 0.55 });
}

console.log(`Workout: ${workout.name}`);
console.log(`Total: ${Math.round(workout.totalSecs/60)} min`);
console.log("");
console.log(describe(workout));

// Also emit JSON for integrations if you want to import elsewhere
console.log("\n--- JSON ---");
console.log(JSON.stringify(workout, null, 2));
