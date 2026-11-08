import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useMobileMatchday } from '../src/context/MobileMatchdayContext';

export default function LiveMatchModalScreen() {
  const {
    activeFixture,
    players,
    activePeriod,
    isTimerRunning,
    elapsedSeconds,
    periodDurationSeconds,
    scheduledAlarmsCount,
    togglePeriodTimer,
    resetPeriodTimer,
    executePlannedSub,
    sunlightMode,
    setSunlightMode,
  } = useMobileMatchday();

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const formattedClock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const unexecutedSubs = useMemo(
    () =>
      (activeFixture.matchSquad?.plannedInGameSubs || []).filter(
        (s) => s.period === activePeriod && !s.executed
      ),
    [activeFixture.matchSquad?.plannedInGameSubs, activePeriod]
  );

  return (
    <ScrollView
      style={[styles.container, sunlightMode && styles.sunlightContainer]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {/* Top Bar: Sunlight Mode Toggle & Background Alarm Badge */}
      <View style={styles.topRow}>
        <View style={styles.alarmBadge}>
          <Text style={styles.alarmBadgeText}>
            🔔 {scheduledAlarmsCount > 0 ? `${scheduledAlarmsCount} Pocket Alarms Armed` : 'Pocket Whistle Ready'}
          </Text>
        </View>
        <Pressable
          onPress={() => setSunlightMode(!sunlightMode)}
          style={styles.sunlightBtn}
        >
          <Text style={styles.sunlightBtnText}>
            {sunlightMode ? '🌙 Dark Mode' : '☀️ Sunlight Mode'}
          </Text>
        </Pressable>
      </View>

      {/* Giant Pitchside Stopwatch */}
      <View style={[styles.clockCard, sunlightMode && styles.sunlightCard]}>
        <Text style={[styles.periodLabel, sunlightMode && styles.sunlightText]}>
          PERIOD {activePeriod} • VS {activeFixture.opponent.toUpperCase()}
        </Text>
        <Text style={[styles.clockDigits, sunlightMode && styles.sunlightText]}>
          {formattedClock}
        </Text>
        <Text style={styles.targetText}>
          Target Period Length: {Math.floor(periodDurationSeconds / 60)}:00 (Auto-stops at full time)
        </Text>

        <View style={styles.clockControls}>
          <Pressable
            onPress={togglePeriodTimer}
            style={[styles.primaryClockBtn, isTimerRunning && styles.pauseBtn]}
          >
            <Text style={styles.primaryClockBtnText}>
              {isTimerRunning ? '⏸ Pause Stopwatch' : '▶ Start Period (Arm Pocket Alarms)'}
            </Text>
          </Pressable>
          <Pressable onPress={resetPeriodTimer} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>↺ Reset</Text>
          </Pressable>
        </View>
      </View>

      {/* Scheduled Mid-Game Rolling Substitutions */}
      <View style={styles.subsSection}>
        <Text style={[styles.sectionHeading, sunlightMode && styles.sunlightText]}>
          Scheduled Rolling Substitutions ({unexecutedSubs.length})
        </Text>
        {unexecutedSubs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>All scheduled substitutions for Period {activePeriod} have been completed.</Text>
          </View>
        ) : (
          unexecutedSubs.map((sub) => {
            const offPlayer = playerMap.get(sub.offPlayerId);
            const onPlayer = playerMap.get(sub.onPlayerId);
            return (
              <View key={sub.id} style={[styles.subCard, sunlightMode && styles.sunlightCard]}>
                <View style={styles.subInfo}>
                  <Text style={styles.subMinute}>{sub.matchMinute}' ({sub.position})</Text>
                  <Text style={[styles.subSwapText, sunlightMode && styles.sunlightText]}>
                    🔻 OFF: {offPlayer?.name || sub.offPlayerId} ➔ 🟢 ON: {onPlayer?.name || sub.onPlayerId}
                  </Text>
                </View>
                <Pressable
                  onPress={() => executePlannedSub(sub)}
                  style={styles.execBtn}
                >
                  <Text style={styles.execBtnText}>Execute Sub</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  sunlightContainer: { backgroundColor: '#ffffff' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alarmBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  alarmBadgeText: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  sunlightBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sunlightBtnText: { color: '#f8fafc', fontSize: 11, fontWeight: '700' },
  clockCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  sunlightCard: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  sunlightText: { color: '#020617' },
  periodLabel: { color: '#34d399', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  clockDigits: {
    color: '#ffffff',
    fontSize: 64,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  targetText: { color: '#94a3b8', fontSize: 12 },
  clockControls: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  primaryClockBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  pauseBtn: { backgroundColor: '#f59e0b' },
  primaryClockBtnText: { color: '#022c22', fontWeight: '900', fontSize: 14 },
  resetBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  resetBtnText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  subsSection: { gap: 10 },
  sectionHeading: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  subInfo: { flex: 1, gap: 3 },
  subMinute: {
    color: '#fbbf24',
    fontWeight: '900',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  subSwapText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  execBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  execBtnText: { color: '#022c22', fontWeight: '900', fontSize: 12 },
});

