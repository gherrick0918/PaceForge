
# PaceForge (Generator-only)

This is a tiny TypeScript starter that *generates* treadmill / walking‑pad workouts that respect your **discrete allowed speeds**.

## Quick start

1) Ensure you have Node.js 18+
2) From this folder run:

```bash
npm i
npm run start           # default: intervals
npm run gen:steady
npm run gen:progression
```

Edit `src/demo.ts` to match your device speeds (e.g., `[1.0, 1.5, 2.0, 2.5, 3.0]`).

## What it does

- You provide a `DeviceProfile` with allowed speeds.
- The generator builds workouts (intervals, steady w/ strides, progression) and **quantizes** targets to your allowed speeds.
- Output prints a readable schedule and JSON (for future app import).

## Next steps toward a mobile app

- Wrap this generator in a React Native (Expo) UI with big readable tiles and TTS cues: “Increase to 2.5 mph for 90 seconds.”
- Keep the screen awake during sessions; add haptic/audio cues.
- Optional: native Android module to log sessions to Health Connect.

