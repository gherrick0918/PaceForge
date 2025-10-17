import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  useSession,
  type IntervalSettings,
  type PlanMode,
  type ProgressionSettings,
  type SteadySettings
} from '../store/SessionProvider';

const numberFromInput = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

type PlanScreenProps = {
  onNavigateToRunner: () => void;
};

export const PlanScreen: React.FC<PlanScreenProps> = ({ onNavigateToRunner }) => {
  const { plan, setPlanMode, updateIntervals, updateSteady, updateProgression, buildWorkout, setWorkout } = useSession();
  const [busy, setBusy] = useState(false);

  const modes = useMemo(
    () => [
      { key: 'intervals' as PlanMode, label: 'Intervals' },
      { key: 'steady' as PlanMode, label: 'Steady' },
      { key: 'progression' as PlanMode, label: 'Progression' }
    ],
    []
  );

  const handleStart = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const workout = buildWorkout();
      setWorkout(workout);
      onNavigateToRunner();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create workout.';
      Alert.alert('Cannot start session', message);
    } finally {
      setBusy(false);
    }
  }, [buildWorkout, busy, onNavigateToRunner, setWorkout]);

  const renderIntervals = (settings: IntervalSettings) => (
    <View style={styles.section}>
      <PlanNumberInput
        label="Warm-up (minutes)"
        value={String(settings.warmupMins)}
        onChange={(text) => updateIntervals({ warmupMins: numberFromInput(text, settings.warmupMins) })}
      />
      <PlanNumberInput
        label="Cool-down (minutes)"
        value={String(settings.cooldownMins)}
        onChange={(text) => updateIntervals({ cooldownMins: numberFromInput(text, settings.cooldownMins) })}
      />
      <PlanNumberInput
        label="Repeats"
        value={String(settings.repeats)}
        onChange={(text) => updateIntervals({ repeats: Math.max(1, Math.round(numberFromInput(text, settings.repeats))) })}
      />
      <PlanNumberInput
        label="Hard interval (seconds)"
        value={String(settings.hardSecs)}
        onChange={(text) => updateIntervals({ hardSecs: Math.max(10, Math.round(numberFromInput(text, settings.hardSecs))) })}
      />
      <PlanNumberInput
        label="Easy interval (seconds)"
        value={String(settings.easySecs)}
        onChange={(text) => updateIntervals({ easySecs: Math.max(10, Math.round(numberFromInput(text, settings.easySecs))) })}
      />
      <PlanNumberInput
        label="Hard intensity (0-1)"
        value={String(settings.hardIntensity)}
        onChange={(text) => updateIntervals({ hardIntensity: numberFromInput(text, settings.hardIntensity) })}
      />
      <PlanNumberInput
        label="Easy intensity (0-1)"
        value={String(settings.easyIntensity)}
        onChange={(text) => updateIntervals({ easyIntensity: numberFromInput(text, settings.easyIntensity) })}
      />
    </View>
  );

  const renderSteady = (settings: SteadySettings) => (
    <View style={styles.section}>
      <PlanNumberInput
        label="Total minutes"
        value={String(settings.totalMins)}
        onChange={(text) => updateSteady({ totalMins: Math.max(5, numberFromInput(text, settings.totalMins)) })}
      />
      <PlanNumberInput
        label="Intensity (0-1)"
        value={String(settings.intensity)}
        onChange={(text) => updateSteady({ intensity: numberFromInput(text, settings.intensity) })}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Include strides</Text>
        <Switch
          value={settings.addStrides}
          onValueChange={(value) => updateSteady({ addStrides: value })}
          trackColor={{ true: '#1f6feb', false: '#30363d' }}
          thumbColor="#f0f6fc"
        />
      </View>
    </View>
  );

  const renderProgression = (settings: ProgressionSettings) => (
    <View style={styles.section}>
      <PlanNumberInput
        label="Total minutes"
        value={String(settings.totalMins)}
        onChange={(text) => updateProgression({ totalMins: Math.max(5, numberFromInput(text, settings.totalMins)) })}
      />
      <PlanNumberInput
        label="Steps"
        value={String(settings.steps)}
        onChange={(text) => updateProgression({ steps: Math.max(1, Math.round(numberFromInput(text, settings.steps))) })}
      />
      <PlanNumberInput
        label="Top intensity (0-1)"
        value={String(settings.topIntensity)}
        onChange={(text) => updateProgression({ topIntensity: numberFromInput(text, settings.topIntensity) })}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Workout Plan</Text>
      <View style={styles.row}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            onPress={() => setPlanMode(mode.key)}
            style={[styles.pill, plan.mode === mode.key && styles.pillActive]}
          >
            <Text style={[styles.pillText, plan.mode === mode.key && styles.pillTextActive]}>{mode.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {plan.mode === 'intervals' && renderIntervals(plan.intervals)}
      {plan.mode === 'steady' && renderSteady(plan.steady)}
      {plan.mode === 'progression' && renderProgression(plan.progression)}

      <TouchableOpacity style={styles.primaryButton} onPress={handleStart} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Preparing…' : 'Start Session'}</Text>
      </TouchableOpacity>
    </View>
  );
};

type PlanNumberInputProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
};

const PlanNumberInput: React.FC<PlanNumberInputProps> = ({ label, value, onChange }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      placeholderTextColor="#6e7681"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f0f6fc',
    marginBottom: 24
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f6feb',
    backgroundColor: 'transparent'
  },
  pillActive: {
    backgroundColor: '#1f6feb'
  },
  pillText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#8b949e'
  },
  pillTextActive: {
    color: '#ffffff'
  },
  section: {
    marginTop: 24,
    gap: 16
  },
  inputGroup: {
    gap: 8
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c9d1d9'
  },
  input: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#f0f6fc',
    borderWidth: 1,
    borderColor: '#30363d'
  },
  switchRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161b22',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#30363d'
  },
  switchLabel: {
    color: '#c9d1d9',
    fontSize: 16,
    fontWeight: '600'
  },
  primaryButton: {
    marginTop: 32,
    backgroundColor: '#2ea043',
    borderRadius: 12,
    paddingVertical: 16
  },
  primaryText: {
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  }
});
