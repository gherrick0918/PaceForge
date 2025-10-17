import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from 'expo-keep-awake';
import Svg, { Circle } from 'react-native-svg';
import { type Workout } from '@paceforge/generator';
import { useSession } from '../store/SessionProvider';
import { PaceForgeLogo } from '../components/PaceForgeLogo';

type RunnerStatus = 'idle' | 'running' | 'paused' | 'finished';

type RunnerScreenProps = {
  onReturnToPlan: () => void;
};

const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(total % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

const segmentLabel = (segment: Workout['segments'][number], units: Workout['units']) => {
  if (segment.cue) {
    return segment.cue;
  }
  return `Speed ${segment.speed} ${units}`;
};

const ProgressRing: React.FC<{ progress: number; size: number; stroke: number }> = ({ progress, size, stroke }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#30363d" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#2ea043"
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
};

export const RunnerScreen: React.FC<RunnerScreenProps> = ({ onReturnToPlan }) => {
  const { workout } = useSession();

  const [status, setStatusState] = useState<RunnerStatus>('idle');
  const [segmentIndex, setSegmentIndexState] = useState(0);
  const [segmentElapsed, setSegmentElapsedState] = useState(0);
  const [totalElapsed, setTotalElapsedState] = useState(0);
  const [preEndAnnounced, setPreEndAnnouncedState] = useState(false);

  const statusRef = useRef<RunnerStatus>('idle');
  const segmentIndexRef = useRef(0);
  const segmentElapsedRef = useRef(0);
  const totalElapsedRef = useRef(0);
  const preEndAnnouncedRef = useRef(false);
  const workoutRef = useRef<Workout | undefined>(workout);
  const completionSpokenRef = useRef(false);

  const setStatus = useCallback((value: RunnerStatus) => {
    statusRef.current = value;
    setStatusState(value);
  }, []);

  const setSegmentIndex = useCallback((value: number) => {
    segmentIndexRef.current = value;
    setSegmentIndexState(value);
  }, []);

  const setSegmentElapsed = useCallback((value: number) => {
    segmentElapsedRef.current = value;
    setSegmentElapsedState(value);
  }, []);

  const setTotalElapsed = useCallback((value: number) => {
    totalElapsedRef.current = value;
    setTotalElapsedState(value);
  }, []);

  const setPreEndAnnounced = useCallback((value: boolean) => {
    preEndAnnouncedRef.current = value;
    setPreEndAnnouncedState(value);
  }, []);

  const resetState = useCallback(() => {
    setStatus('idle');
    setSegmentIndex(0);
    setSegmentElapsed(0);
    setTotalElapsed(0);
    setPreEndAnnounced(false);
    completionSpokenRef.current = false;
    Speech.stop();
    void deactivateKeepAwakeAsync();
  }, [setPreEndAnnounced, setSegmentElapsed, setSegmentIndex, setStatus, setTotalElapsed]);

  const currentSegment = workout?.segments[segmentIndex] ?? null;
  const nextSegment = workout && segmentIndex + 1 < workout.segments.length ? workout.segments[segmentIndex + 1] : null;
  const segmentRemaining = currentSegment ? Math.max(0, currentSegment.secs - segmentElapsed) : 0;
  const progress = workout && workout.totalSecs > 0 ? totalElapsed / workout.totalSecs : 0;

  const speak = useCallback((message: string) => {
    Speech.stop();
    Speech.speak(message, { rate: 1.0 });
  }, []);

  const announceSegment = useCallback(
    async (index: number) => {
      if (!workout) {
        return;
      }
      const segment = workout.segments[index];
      if (!segment) {
        return;
      }
      const message = segmentLabel(segment, workout.units);
      speak(message);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // noop on devices without haptics
      }
    },
    [speak, workout]
  );

  const announcePreEnd = useCallback(
    (index: number) => {
      if (!workout) {
        return;
      }
      const segment = workout.segments[index];
      if (!segment) {
        return;
      }
      const upcoming = workout.segments[index + 1];
      if (upcoming) {
        speak(`Next: ${segmentLabel(upcoming, workout.units)} in five seconds.`);
      } else {
        speak('Workout finishing in five seconds.');
      }
    },
    [speak, workout]
  );

  const handleStart = useCallback(() => {
    if (!workout) {
      return;
    }
    resetState();
    setStatus('running');
    setSegmentIndex(0);
    setSegmentElapsed(0);
    setTotalElapsed(0);
    setPreEndAnnounced(false);
    workoutRef.current = workout;
    void announceSegment(0);
  }, [announceSegment, resetState, setPreEndAnnounced, setSegmentElapsed, setSegmentIndex, setStatus, setTotalElapsed, workout]);

  const handlePause = useCallback(() => {
    setStatus('paused');
    Speech.stop();
  }, [setStatus]);

  const handleResume = useCallback(() => {
    if (!workout) {
      return;
    }
    setStatus('running');
  }, [setStatus, workout]);

  const handleReset = useCallback(() => {
    resetState();
  }, [resetState]);

  useEffect(() => {
    workoutRef.current = workout;
    resetState();
  }, [resetState, workout]);

  useEffect(() => {
    return () => {
      Speech.stop();
      void deactivateKeepAwakeAsync();
    };
  }, []);

  useEffect(() => {
    if (status === 'running') {
      void activateKeepAwakeAsync();
    } else {
      void deactivateKeepAwakeAsync();
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'running' || !workout) {
      return;
    }

    const interval = setInterval(() => {
      const activeWorkout = workoutRef.current;
      if (!activeWorkout) {
        return;
      }
      const activeSegment = activeWorkout.segments[segmentIndexRef.current];
      if (!activeSegment) {
        return;
      }

      const newSegmentElapsed = segmentElapsedRef.current + 1;
      const newTotalElapsed = Math.min(activeWorkout.totalSecs, totalElapsedRef.current + 1);
      setSegmentElapsed(newSegmentElapsed);
      setTotalElapsed(newTotalElapsed);

      const remaining = activeSegment.secs - newSegmentElapsed;
      if (!preEndAnnouncedRef.current && remaining === 5) {
        announcePreEnd(segmentIndexRef.current);
        setPreEndAnnounced(true);
      }

      if (newSegmentElapsed >= activeSegment.secs) {
        const nextIndex = segmentIndexRef.current + 1;
        if (nextIndex >= activeWorkout.segments.length) {
          setStatus('finished');
          setSegmentElapsed(activeSegment.secs);
          setTotalElapsed(activeWorkout.totalSecs);
          setPreEndAnnounced(false);
          if (!completionSpokenRef.current) {
            speak('Workout complete. Great job!');
            completionSpokenRef.current = true;
          }
          return;
        }
        setSegmentIndex(nextIndex);
        setSegmentElapsed(0);
        setPreEndAnnounced(false);
        announceSegment(nextIndex).catch(() => {
          // ignore errors from haptics
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [announcePreEnd, announceSegment, setPreEndAnnounced, setSegmentElapsed, setSegmentIndex, setStatus, setTotalElapsed, speak, status, workout]);

  const summary = useMemo(() => {
    if (!workout || status !== 'finished') {
      return null;
    }
    return `Completed ${workout.segments.length} segments in ${formatTime(workout.totalSecs)}.`;
  }, [status, workout]);

  if (!workout) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyTitle}>No workout loaded</Text>
        <Text style={styles.emptySubtitle}>Set up a plan to generate your next session.</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={onReturnToPlan}>
          <Text style={styles.secondaryText}>Go to Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PaceForgeLogo size={56} />
        <View style={styles.headerText}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.subtle}>Total time {formatTime(workout.totalSecs)}</Text>
        </View>
      </View>

      <View style={styles.timerCard}>
        <View style={styles.ringWrapper}>
          <ProgressRing progress={progress} size={220} stroke={16} />
          <View style={styles.ringContent}>
            <Text style={styles.countdown}>{formatTime(segmentRemaining)}</Text>
            <Text style={styles.countdownLabel}>Remaining</Text>
          </View>
        </View>
        <View style={styles.segmentInfo}>
          <Text style={styles.segmentLabel}>Current</Text>
          <Text style={styles.segmentValue} numberOfLines={2}>
            {currentSegment ? segmentLabel(currentSegment, workout.units) : '—'}
          </Text>
          <Text style={[styles.segmentLabel, styles.segmentLabelSpaced]}>Next</Text>
          <Text style={styles.segmentValue} numberOfLines={2}>
            {nextSegment ? segmentLabel(nextSegment, workout.units) : 'Finish strong!'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        {status === 'idle' && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
            <Text style={styles.primaryText}>Start</Text>
          </TouchableOpacity>
        )}
        {status === 'running' && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={[styles.secondaryButton, styles.controlButton]} onPress={handlePause}>
              <Text style={styles.secondaryText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, styles.controlButton]} onPress={handleReset}>
              <Text style={styles.secondaryText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === 'paused' && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={[styles.primaryButton, styles.controlButton]} onPress={handleResume}>
              <Text style={styles.primaryText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, styles.controlButton]} onPress={handleReset}>
              <Text style={styles.secondaryText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === 'finished' && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={[styles.primaryButton, styles.controlButton]} onPress={handleReset}>
              <Text style={styles.primaryText}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, styles.controlButton]} onPress={onReturnToPlan}>
              <Text style={styles.secondaryText}>Adjust Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {summary && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0f6fc'
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8b949e'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24
  },
  headerText: {
    flex: 1
  },
  workoutName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0f6fc'
  },
  subtle: {
    color: '#8b949e',
    marginTop: 4
  },
  timerCard: {
    backgroundColor: '#161b22',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    marginBottom: 24
  },
  ringWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ringContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center'
  },
  countdown: {
    fontSize: 48,
    fontWeight: '700',
    color: '#f0f6fc'
  },
  countdownLabel: {
    marginTop: 4,
    color: '#8b949e'
  },
  segmentInfo: {
    marginTop: 24,
    width: '100%'
  },
  segmentLabel: {
    color: '#8b949e',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.2
  },
  segmentLabelSpaced: {
    marginTop: 16
  },
  segmentValue: {
    marginTop: 6,
    color: '#f0f6fc',
    fontSize: 18,
    lineHeight: 24
  },
  controls: {
    marginTop: 12
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12
  },
  primaryButton: {
    backgroundColor: '#2ea043',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#21262d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363d'
  },
  secondaryText: {
    color: '#c9d1d9',
    fontSize: 16,
    fontWeight: '600'
  },
  controlButton: {
    flex: 1
  },
  summary: {
    marginTop: 24,
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363d'
  },
  summaryText: {
    color: '#c9d1d9',
    fontSize: 16,
    textAlign: 'center'
  }
});
