# PaceForge

PaceForge turns discrete treadmill or walking-pad speed profiles into ready-to-run interval, steady, and progression workouts. Use the CLI to generate text cues or JSON payloads that respect your device's allowed speeds and safety constraints.

## Prerequisites

- Node.js 18+
- npm (or pnpm/yarn if you prefer)

## Installation

```bash
npm install
```

## Building & Testing

```bash
npm run build   # Type-check and emit dist/
npm test        # Run Vitest unit tests
```

During development you can run the CLI directly with tsx:

```bash
npm run dev
```

## CLI Usage

The CLI is installed as `paceforge`. Use `--help` for a full option list.

```bash
npm exec paceforge generate intervals --units mph --speeds 1,1.5,2,2.5,3 \
  --repeats 6 --hardSecs 90 --easySecs 90 --hard 0.85 --easy 0.55 \
  --warmup 5 --cooldown 5 --out text
```

### Profile files

You can provide a JSON profile file that matches `src/schema/deviceProfile.schema.json`:

```bash
npm exec paceforge generate steady --profile-file profiles/greg-walkpad.json --totalMins 30 --intensity 0.7
```

CLI flags override profile values (e.g. to change units, speeds, or safety thresholds).

### JSON Output

Add `--out json` to emit structured workout data:

```bash
npm exec paceforge generate progression --profile-file profiles/greg-walkpad.json --steps 5 --top 0.85 --out json
```

## Project Structure

```
.
├─ bin/paceforge.ts              # CLI entry point (builds to dist/bin/paceforge.js)
├─ profiles/greg-walkpad.json    # Example device profile
├─ src/
│  ├─ generator.ts               # Workout generation logic
│  ├─ index.ts                   # Public API exports
│  ├─ demo.ts                    # Quick interactive demo via `npm start`
│  └─ schema/deviceProfile.schema.json
└─ test/                         # Vitest suites for core behaviours
```

## Safety Constraints

- `minSegmentSec` merges adjacent segments at identical speeds to avoid sub-threshold slices.
- `rampLimitPerChange` clamps speed jumps that exceed the device's tolerance and annotates cues with `(clamped)`.

These options can live in profile files or be supplied from the CLI via `--minSegmentSec` and `--rampLimit`.
