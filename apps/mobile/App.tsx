import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from './src/store/SessionProvider';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { RunnerScreen } from './src/screens/RunnerScreen';

type ScreenKey = 'profile' | 'plan' | 'runner';

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const TabButton: React.FC<TabButtonProps> = ({ label, active, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
};

const ScreenContainer: React.FC = () => {
  const [screen, setScreen] = useState<ScreenKey>('profile');
  const { hydrated } = useSession();

  const tabs = useMemo(
    () => [
      { key: 'profile' as ScreenKey, label: 'Profile' },
      { key: 'plan' as ScreenKey, label: 'Plan' },
      { key: 'runner' as ScreenKey, label: 'Runner' }
    ],
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TabButton key={tab.key} label={tab.label} active={screen === tab.key} onPress={() => setScreen(tab.key)} />
        ))}
      </View>
      <View style={styles.content}>
        {!hydrated ? (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Loading profile…</Text>
          </View>
        ) : screen === 'profile' ? (
          <ProfileScreen />
        ) : screen === 'plan' ? (
          <PlanScreen onNavigateToRunner={() => setScreen('runner')} />
        ) : (
          <RunnerScreen onReturnToPlan={() => setScreen('plan')} />
        )}
      </View>
    </SafeAreaView>
  );
};

const App: React.FC = () => {
  return (
    <SessionProvider>
      <ScreenContainer />
    </SessionProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117'
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#161b22',
    justifyContent: 'space-between',
    gap: 12
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1f6feb',
    opacity: 0.4
  },
  tabButtonActive: {
    opacity: 1
  },
  tabLabel: {
    color: '#c9d1d9',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  tabLabelActive: {
    color: '#ffffff'
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#8b949e',
    fontSize: 16
  }
});

export default App;
