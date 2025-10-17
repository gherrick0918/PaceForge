import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSession } from '../store/SessionProvider';

const formatSpeeds = (speeds: number[]) => speeds.join(', ');

export const ProfileScreen: React.FC = () => {
  const { profile, updateProfile } = useSession();
  const [speedsInput, setSpeedsInput] = useState(formatSpeeds(profile.speeds));

  useEffect(() => {
    setSpeedsInput(formatSpeeds(profile.speeds));
  }, [profile.speeds]);

  const unitButtons = useMemo(
    () => [
      { label: 'mph', value: 'mph' as const },
      { label: 'kph', value: 'kph' as const }
    ],
    []
  );

  const applySpeeds = () => {
    const values = speedsInput
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => Number(part));

    if (!values.length || values.some((value) => Number.isNaN(value))) {
      Alert.alert('Invalid speeds', 'Enter a comma-separated list of numbers.');
      return;
    }

    const sorted = [...values].sort((a, b) => a - b);
    updateProfile({ speeds: sorted });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Device Profile</Text>
      <Text style={styles.label}>Units</Text>
      <View style={styles.row}>
        {unitButtons.map((button) => (
          <TouchableOpacity
            key={button.value}
            onPress={() => updateProfile({ units: button.value })}
            style={[styles.pill, profile.units === button.value && styles.pillActive]}
          >
            <Text style={[styles.pillText, profile.units === button.value && styles.pillTextActive]}>
              {button.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, styles.spaced]}>Allowed Speeds ({profile.units.toUpperCase()})</Text>
      <TextInput
        style={styles.input}
        value={speedsInput}
        onChangeText={setSpeedsInput}
        onBlur={applySpeeds}
        placeholder="e.g. 1.5, 2, 2.5, 3"
        placeholderTextColor="#6e7681"
        keyboardType="numbers-and-punctuation"
        returnKeyType="done"
      />
      <Text style={styles.help}>Speeds are snapped to the closest allowed value when workouts are generated.</Text>
    </View>
  );
};

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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c9d1d9',
    marginBottom: 8
  },
  spaced: {
    marginTop: 24
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
  input: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f0f6fc',
    borderWidth: 1,
    borderColor: '#30363d'
  },
  help: {
    marginTop: 12,
    color: '#8b949e',
    fontSize: 14,
    lineHeight: 20
  }
});
