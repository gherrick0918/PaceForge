#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command, InvalidOptionArgumentError, Option } from 'commander';
import { z } from 'zod';
import {
  type DeviceProfile,
  type Workout,
  describe,
  makeIntervals,
  makeProgression,
  makeSteady,
} from '../src/index.js';

const deviceProfileSchema = z
  .object({
    name: z.string(),
    units: z.union([z.literal('mph'), z.literal('kph')]),
    speeds: z.array(z.number()).min(1),
    inclines: z.array(z.number()).optional(),
    minSegmentSec: z.number().min(1).optional(),
    rampLimitPerChange: z.number().min(0).optional(),
  })
  .strict();

type DeviceProfileInput = z.infer<typeof deviceProfileSchema>;

type ParsedOptions = Record<string, unknown> & {
  strides?: boolean;
};

const parseNumber = (label: string) => {
  return (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new InvalidOptionArgumentError(`Invalid ${label}: ${value}`);
    }
    return parsed;
  };
};

const parseInteger = (label: string) => {
  const parse = parseNumber(label);
  return (value: string) => {
    const parsed = parse(value);
    if (!Number.isInteger(parsed)) {
      throw new InvalidOptionArgumentError(`Expected an integer for ${label}, received ${value}`);
    }
    return parsed;
  };
};

const parseSpeeds = (value: string) => {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (!parts.length) {
    throw new InvalidOptionArgumentError('Speeds list cannot be empty.');
  }
  const speeds = parts.map((part) => {
    const parsed = Number(part);
    if (Number.isNaN(parsed)) {
      throw new InvalidOptionArgumentError(`Invalid speed: ${part}`);
    }
    return parsed;
  });
  return speeds;
};

const program = new Command();
program
  .name('paceforge')
  .description('Generate treadmill-style workouts for discrete-speed devices')
  .version('0.1.0');

program
  .command('generate')
  .summary('Generate a workout plan in intervals, steady, or progression mode')
  .argument('[mode]', 'intervals | steady | progression', 'intervals')
  .addOption(new Option('--units <units>', 'Device units').choices(['mph', 'kph']).default('mph'))
  .option('--speeds <list>', 'Comma-separated allowed speeds (e.g. 1,1.5,2)', parseSpeeds)
  .option('--profile-file <path>', 'Path to a device profile JSON file')
  .option('--repeats <count>', 'Interval repeats', parseInteger('repeats'))
  .option('--hardSecs <seconds>', 'Hard interval duration in seconds', parseInteger('hardSecs'))
  .option('--easySecs <seconds>', 'Easy interval duration in seconds', parseInteger('easySecs'))
  .option('--hard <intensity>', 'Hard intensity as a fraction of max speed', parseNumber('hard'))
  .option('--easy <intensity>', 'Easy intensity as a fraction of max speed', parseNumber('easy'))
  .option('--warmup <minutes>', 'Warm-up duration in minutes', parseNumber('warmup'))
  .option('--cooldown <minutes>', 'Cool-down duration in minutes', parseNumber('cooldown'))
  .option('--totalMins <minutes>', 'Total workout duration in minutes', parseNumber('totalMins'))
  .option('--intensity <fraction>', 'Steady intensity as a fraction of max speed', parseNumber('intensity'))
  .option('--steps <count>', 'Number of progression steps', parseInteger('steps'))
  .option('--top <fraction>', 'Top intensity as a fraction of max speed', parseNumber('top'))
  .option('--no-strides', 'Disable strides in steady workouts')
  .option('--minSegmentSec <seconds>', 'Minimum segment length (seconds)', parseInteger('minSegmentSec'))
  .option('--rampLimit <delta>', 'Maximum allowed change per segment', parseNumber('rampLimit'))
  .addOption(new Option('--out <format>', 'Output format').choices(['text', 'json']).default('text'))
  .option('--name <name>', 'Override workout name')
  .action((mode: string, options: ParsedOptions) => {
    try {
      const profile = resolveProfile(options);
      const outFormat = (options.out as 'text' | 'json' | undefined) ?? 'text';

      switch (mode) {
        case 'intervals': {
          const workout = makeIntervals(profile, {
            name: (options.name as string | undefined) ?? undefined,
            warmupMins: options.warmup as number | undefined,
            cooldownMins: options.cooldown as number | undefined,
            repeats: options.repeats as number | undefined,
            hardSecs: options.hardSecs as number | undefined,
            easySecs: options.easySecs as number | undefined,
            hardIntensity: options.hard as number | undefined,
            easyIntensity: options.easy as number | undefined,
          });
          emitWorkout(workout, outFormat);
          break;
        }
        case 'steady': {
          const workout = makeSteady(profile, {
            name: (options.name as string | undefined) ?? undefined,
            totalMins: options.totalMins as number | undefined,
            intensity: options.intensity as number | undefined,
            addStrides: options.strides as boolean | undefined,
          });
          emitWorkout(workout, outFormat);
          break;
        }
        case 'progression': {
          const workout = makeProgression(profile, {
            name: (options.name as string | undefined) ?? undefined,
            totalMins: options.totalMins as number | undefined,
            steps: options.steps as number | undefined,
            topIntensity: options.top as number | undefined,
          });
          emitWorkout(workout, outFormat);
          break;
        }
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exitCode = 1;
    }
  });

function normalizeSpeeds(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((value, index) => (index === 0 ? true : value !== sorted[index - 1]));
}

function loadProfileFromFile(path: string): DeviceProfileInput {
  try {
    const raw = readFileSync(resolve(path), 'utf8');
    const parsed = JSON.parse(raw);
    return deviceProfileSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((issue) => issue.message).join(', ');
      throw new Error(`Profile validation failed: ${details}`);
    }
    if (error instanceof Error) {
      throw new Error(`Failed to read profile file: ${error.message}`);
    }
    throw new Error('Failed to read profile file.');
  }
}

function resolveProfile(options: ParsedOptions): DeviceProfile {
  const profileFile = options.profileFile as string | undefined;
  const fileProfile = profileFile ? loadProfileFromFile(profileFile) : undefined;
  const speeds = (options.speeds as number[] | undefined) ?? fileProfile?.speeds;
  if (!speeds || speeds.length === 0) {
    throw new Error('Provide --speeds or a profile file with speeds.');
  }

  const units = (options.units as 'mph' | 'kph' | undefined) ?? fileProfile?.units ?? 'mph';
  const minSegmentSec = (options.minSegmentSec as number | undefined) ?? fileProfile?.minSegmentSec;
  const rampLimit = (options.rampLimit as number | undefined) ?? fileProfile?.rampLimitPerChange;

  const profile = {
    name: fileProfile?.name ?? 'CLI Profile',
    units,
    speeds: normalizeSpeeds(speeds),
    inclines: fileProfile?.inclines,
    minSegmentSec,
    rampLimitPerChange: rampLimit,
  } satisfies DeviceProfileInput;

  deviceProfileSchema.parse(profile);
  return profile as DeviceProfile;
}

function emitWorkout(workout: Workout, format: 'text' | 'json') {
  if (format === 'json') {
    console.log(JSON.stringify(workout, null, 2));
  } else {
    console.log(describe(workout));
  }
}

program.parseAsync(process.argv);
