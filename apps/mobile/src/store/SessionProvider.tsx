import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type DeviceProfile,
  type Workout,
  makeIntervals,
  makeProgression,
  makeSteady
} from '@paceforge/generator';

type Units = DeviceProfile['units'];

type Profile = {
  units: Units;
  speeds: number[];
};

type PlanMode = 'intervals' | 'steady' | 'progression';

type IntervalSettings = {
  warmupMins: number;
  cooldownMins: number;
  repeats: number;
  hardSecs: number;
  easySecs: number;
  hardIntensity: number;
  easyIntensity: number;
};

type SteadySettings = {
  totalMins: number;
  intensity: number;
  addStrides: boolean;
};

type ProgressionSettings = {
  totalMins: number;
  steps: number;
  topIntensity: number;
};

type PlanState = {
  mode: PlanMode;
  intervals: IntervalSettings;
  steady: SteadySettings;
  progression: ProgressionSettings;
};

type SessionContextValue = {
  profile: Profile;
  updateProfile: (partial: Partial<Profile>) => void;
  plan: PlanState;
  setPlanMode: (mode: PlanMode) => void;
  updateIntervals: (partial: Partial<IntervalSettings>) => void;
  updateSteady: (partial: Partial<SteadySettings>) => void;
  updateProgression: (partial: Partial<ProgressionSettings>) => void;
  workout: Workout | undefined;
  setWorkout: (workout: Workout | undefined) => void;
  buildWorkout: (mode?: PlanMode) => Workout;
  hydrated: boolean;
};

const PROFILE_KEY = '@paceforge/profile';

const defaultProfile: Profile = {
  units: 'mph',
  speeds: [1.5, 2, 2.5, 3, 3.5, 4]
};

const defaultPlan: PlanState = {
  mode: 'intervals',
  intervals: {
    warmupMins: 5,
    cooldownMins: 5,
    repeats: 6,
    hardSecs: 90,
    easySecs: 90,
    hardIntensity: 0.85,
    easyIntensity: 0.55
  },
  steady: {
    totalMins: 30,
    intensity: 0.65,
    addStrides: true
  },
  progression: {
    totalMins: 30,
    steps: 4,
    topIntensity: 0.8
  }
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [plan, setPlan] = useState<PlanState>(defaultPlan);
  const [workout, setWorkout] = useState<Workout | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const isFirstProfileUpdate = useRef(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem(PROFILE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<Profile>;
          if (parsed && Array.isArray(parsed.speeds) && parsed.units) {
            setProfile({
              units: parsed.units as Units,
              speeds: parsed.speeds.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
            });
          }
        }
      } catch (error) {
        console.warn('Failed to load profile', error);
      } finally {
        setHydrated(true);
        isFirstProfileUpdate.current = false;
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (isFirstProfileUpdate.current) {
      return;
    }

    const persist = async () => {
      try {
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      } catch (error) {
        console.warn('Failed to persist profile', error);
      }
    };

    void persist();
  }, [profile]);

  const updateProfile = useCallback((partial: Partial<Profile>) => {
    setProfile((current) => ({ ...current, ...partial }));
  }, []);

  const setPlanMode = useCallback((mode: PlanMode) => {
    setPlan((current) => ({ ...current, mode }));
  }, []);

  const updateIntervals = useCallback((partial: Partial<IntervalSettings>) => {
    setPlan((current) => ({
      ...current,
      intervals: { ...current.intervals, ...partial }
    }));
  }, []);

  const updateSteady = useCallback((partial: Partial<SteadySettings>) => {
    setPlan((current) => ({
      ...current,
      steady: { ...current.steady, ...partial }
    }));
  }, []);

  const updateProgression = useCallback((partial: Partial<ProgressionSettings>) => {
    setPlan((current) => ({
      ...current,
      progression: { ...current.progression, ...partial }
    }));
  }, []);

  const buildWorkout = useCallback(
    (mode?: PlanMode) => {
      const resolvedMode = mode ?? plan.mode;
      if (!profile.speeds.length) {
        throw new Error('Add at least one speed before generating a workout.');
      }

      const deviceProfile: DeviceProfile = {
        name: 'Mobile Profile',
        units: profile.units,
        speeds: [...profile.speeds].sort((a, b) => a - b)
      };

      switch (resolvedMode) {
        case 'steady':
          return makeSteady(deviceProfile, plan.steady);
        case 'progression':
          return makeProgression(deviceProfile, plan.progression);
        default:
          return makeIntervals(deviceProfile, plan.intervals);
      }
    },
    [plan, profile]
  );

  const value = useMemo(
    () => ({
      profile,
      updateProfile,
      plan,
      setPlanMode,
      updateIntervals,
      updateSteady,
      updateProgression,
      workout,
      setWorkout,
      buildWorkout,
      hydrated
    }),
    [buildWorkout, hydrated, plan, profile, updateProfile, updateIntervals, updateProgression, updateSteady, workout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export type { PlanMode, IntervalSettings, SteadySettings, ProgressionSettings, Units, Profile };
