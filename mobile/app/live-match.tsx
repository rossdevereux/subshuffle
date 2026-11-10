import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GoalScorer, getFixturePotmIds } from '@subshuffle/shared';
import { useMobileMatchday } from '../src/context/MobileMatchdayContext';

function formatStopwatch(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function LiveMatchScreen() {
  const router = useRouter();
  const {
    activeTeam,
    activeFixture,
    players,
    activePeriod,
    setActivePeriod,
    isTimerRunning,
    elapsedSeconds,
    periodDurationSeconds,
    scheduledAlarmsCount,
    togglePeriodTimer,
    resetPeriodTimer,
    executePlannedSub,
    executeImmediateCustomSub,
    updateFixtureScore,
    setPlayerOfTheMatch,
    savePostMatchRecording,
  } = useMobileMatchday();

  const [goalScorerModalOpen, setGoalScorerModalOpen] = useState(false);
  const [customLiveSubModalOpen, setCustomLiveSubModalOpen] = useState(false);
  const [liveSubOffId, setLiveSubOffId] = useState('');
  const [liveSubOnId, setLiveSubOnId] = useState('');
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedPotmIds, setSelectedPotmIds] = useState<string[]>(() =>
    getFixturePotmIds(activeFixture)
  );

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const periodCount =
    activeFixture.matchPeriodCount || activeTeam.settings.matchPeriodCount || 2;
  const plannedSubs = (activeFixture.matchSquad?.plannedInGameSubs || []).filter(
    (s) => s.period === activePeriod
  );

  const homeScore = activeFixture.homeScore ?? 0;
  const awayScore = activeFixture.awayScore ?? 0;
  const ourSide: 'home' | 'away' = activeFixture.venue === 'Home' ? 'home' : 'away';

  const adjustScore = async (side: 'home' | 'away', delta: number) => {
    const nextHome = side === 'home' ? Math.max(0, homeScore + delta) : homeScore;
    const nextAway = side === 'away' ? Math.max(0, awayScore + delta) : awayScore;
    await updateFixtureScore(nextHome, nextAway, activeFixture.scorers, 'In Progress', true);
    if (delta > 0 && side === ourSide) {
      setGoalScorerModalOpen(true);
    }
  };

  const attributeGoalToPlayer = async (player: { id: string; name: string }) => {
    const curMin = Math.max(1, Math.floor(elapsedSeconds / 60));
    const newScorer: GoalScorer = {
      id: `sc_${Date.now()}`,
      playerId: player.id,
      playerName: player.name,
      minute: curMin,
      team: ourSide,
    };
    const nextScorers = [...(activeFixture.scorers || []), newScorer];
    await updateFixtureScore(homeScore, awayScore, nextScorers, 'In Progress', true);
    setGoalScorerModalOpen(false);
  };

  const handleFinishMatch = async () => {
    await updateFixtureScore(homeScore, awayScore, activeFixture.scorers, 'Completed', false);
    await setPlayerOfTheMatch(selectedPotmIds);
    await savePostMatchRecording({
      trackingMode: 'full_credit',
      actualMinutesByPlayer: {},
      recordedAt: new Date().toISOString(),
    });
    setCompleteModalOpen(false);
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.liveTag}>🔴 LIVE TOUCHLINE CONSOLE</Text>
          <Text style={styles.matchupText}>
            {activeTeam.name} vs {activeFixture.opponent}
          </Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕ Exit</Text>
        </Pressable>
      </View>

      {/* Live Scoreboard */}
      <View style={styles.scoreboardCard}>
        <View style={styles.scoreCol}>
          <Text style={styles.scoreTeamName} numberOfLines={1}>
            {activeFixture.venue === 'Home' ? activeTeam.name : activeFixture.opponent}
          </Text>
          <View style={styles.scoreControls}>
            <Pressable style={styles.scoreBtn} onPress={() => adjustScore('home', -1)}>
              <Text style={styles.scoreBtnText}>-</Text>
            </Pressable>
            <Text style={styles.scoreNumber}>{homeScore}</Text>
            <Pressable style={styles.scoreBtnAdd} onPress={() => adjustScore('home', 1)}>
              <Text style={styles.scoreBtnAddText}>+</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.scoreVs}>:</Text>

        <View style={styles.scoreCol}>
          <Text style={styles.scoreTeamName} numberOfLines={1}>
            {activeFixture.venue === 'Away' ? activeTeam.name : activeFixture.opponent}
          </Text>
          <View style={styles.scoreControls}>
            <Pressable style={styles.scoreBtn} onPress={() => adjustScore('away', -1)}>
              <Text style={styles.scoreBtnText}>-</Text>
            </Pressable>
            <Text style={styles.scoreNumber}>{awayScore}</Text>
            <Pressable style={styles.scoreBtnAdd} onPress={() => adjustScore('away', 1)}>
              <Text style={styles.scoreBtnAddText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Period Switcher */}
      <View style={styles.periodRow}>
        {Array.from({ length: periodCount }, (_, i) => i + 1).map((p) => (
          <Pressable
            key={p}
            style={[styles.periodPill, activePeriod === p && styles.periodPillActive]}
            onPress={async () => {
              await resetPeriodTimer();
              setActivePeriod(p);
            }}
          >
            <Text
              style={[
                styles.periodPillText,
                activePeriod === p && styles.periodPillTextActive,
              ]}
            >
              {periodCount === 2 ? (p === 1 ? '1st Half' : '2nd Half') : `Period ${p}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Pocket-Safe Stopwatch */}
      <View style={styles.timerCard}>
        <Text style={styles.periodLabel}>
          PERIOD {activePeriod} • TARGET {Math.floor(periodDurationSeconds / 60)}:00
        </Text>
        <Text style={styles.stopwatchDigits}>{formatStopwatch(elapsedSeconds)}</Text>

        <View style={styles.alarmStatusBanner}>
          <Text style={styles.alarmStatusText}>
            {isTimerRunning
              ? `🔔 ${scheduledAlarmsCount} OS Background Alarm(s) Armed (Pocket-Safe)`
              : '⏸️ Start timer to arm background substitution & whistle alarms'}
          </Text>
        </View>

        <View style={styles.timerControls}>
          <Pressable
            style={[styles.mainTimerBtn, isTimerRunning && styles.pauseTimerBtn]}
            onPress={togglePeriodTimer}
          >
            <Text style={styles.mainTimerBtnText}>
              {isTimerRunning ? '⏸️ Pause Clock' : '▶️ Start Period Clock'}
            </Text>
          </Pressable>
          <Pressable style={styles.resetBtn} onPress={resetPeriodTimer}>
            <Text style={styles.resetBtnText}>↺ Reset</Text>
          </Pressable>
        </View>
      </View>

      {/* Scheduled Rolling Substitutions */}
      <View style={styles.subsSection}>
        <View style={styles.subsSectionHeader}>
          <Text style={styles.sectionTitle}>
            Substitutions (Period {activePeriod})
          </Text>
          <Pressable
            style={styles.addLiveSubBtn}
            onPress={() => {
              setLiveSubOffId('');
              setLiveSubOnId('');
              setCustomLiveSubModalOpen(true);
            }}
          >
            <Text style={styles.addLiveSubBtnText}>⚡ Sub Now (Custom)</Text>
          </Pressable>
        </View>

        {plannedSubs.map((sub) => {
          const offPlayer = playerMap.get(sub.offPlayerId);
          const onPlayer = playerMap.get(sub.onPlayerId);
          const isDue = elapsedSeconds >= sub.targetMinute * 60 && !sub.executed;

          return (
            <View
              key={sub.id}
              style={[
                styles.subCard,
                isDue && styles.subCardDue,
                sub.executed && styles.subCardDone,
              ]}
            >
              <View style={styles.subInfo}>
                <Text style={styles.subMinuteBadge}>{sub.targetMinute}&apos;</Text>
                <View>
                  <Text style={styles.subOnText}>🟢 ON: {onPlayer?.name || sub.onPlayerId}</Text>
                  <Text style={styles.subOffText}>
                    🔴 OFF: {offPlayer?.name || sub.offPlayerId} ({sub.position})
                  </Text>
                </View>
              </View>

              <Pressable
                disabled={sub.executed}
                onPress={() => executePlannedSub(sub)}
                style={[styles.execSubBtn, sub.executed && styles.execSubBtnDone]}
              >
                <Text style={styles.execSubBtnText}>
                  {sub.executed ? '✓ Done' : '⚡ Sub Now'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {plannedSubs.length === 0 && (
          <Text style={styles.emptySubText}>
            No rolling subs scheduled for Period {activePeriod}. Use "⏱️ Sub Scheduler" on the Pitch
            tab to generate a plan.
          </Text>
        )}
      </View>

      {/* Complete Match Button */}
      <Pressable
        style={styles.completeMatchBtn}
        onPress={() => {
          setSelectedPotmIds(getFixturePotmIds(activeFixture));
          setCompleteModalOpen(true);
        }}
      >
        <Text style={styles.completeMatchBtnText}>
          🏁 Complete Match & Award Player(s) of the Match
        </Text>
      </Pressable>

      {/* Live Custom Substitution Modal */}
      <Modal visible={customLiveSubModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚡ Make Live Substitution Now</Text>
            <Text style={styles.subHint}>
              Select who comes OFF the pitch and who comes ON from the bench at minute {Math.max(1, Math.floor(elapsedSeconds / 60))}&apos;:
            </Text>

            <Text style={[styles.sectionTitle, { fontSize: 13, marginTop: 10, marginBottom: 4 }]}>
              Player Coming OFF (Pitch):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {(() => {
                const currentLineup = (activeFixture.matchSquad?.lineupsByPeriod || []).find(
                  (lp) => lp.period === activePeriod
                );
                return (currentLineup?.onPitch || []).map((op) => {
                  const p = playerMap.get(op.playerId);
                  const isSelected = liveSubOffId === op.playerId;
                  return (
                    <Pressable
                      key={op.playerId}
                      style={[
                        styles.playerChip,
                        isSelected && { backgroundColor: '#ef4444', borderColor: '#b91c1c' },
                      ]}
                      onPress={() => setLiveSubOffId(op.playerId)}
                    >
                      <Text style={[styles.playerChipText, isSelected && { color: '#ffffff' }]}>
                        🔴 #{p?.squadNumber ?? '-'} {p?.name || op.playerId} ({op.position})
                      </Text>
                    </Pressable>
                  );
                });
              })()}
            </ScrollView>

            <Text style={[styles.sectionTitle, { fontSize: 13, marginTop: 10, marginBottom: 4 }]}>
              Player Coming ON (Bench):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {(() => {
                const currentLineup = (activeFixture.matchSquad?.lineupsByPeriod || []).find(
                  (lp) => lp.period === activePeriod
                );
                return (currentLineup?.bench || []).map((bid) => {
                  const p = playerMap.get(bid);
                  const isSelected = liveSubOnId === bid;
                  return (
                    <Pressable
                      key={bid}
                      style={[
                        styles.playerChip,
                        isSelected && { backgroundColor: '#10b981', borderColor: '#059669' },
                      ]}
                      onPress={() => setLiveSubOnId(bid)}
                    >
                      <Text style={[styles.playerChipText, isSelected && { color: '#ffffff' }]}>
                        🟢 #{p?.squadNumber ?? '-'} {p?.name || bid}
                      </Text>
                    </Pressable>
                  );
                });
              })()}
            </ScrollView>

            <Pressable
              disabled={!liveSubOffId || !liveSubOnId}
              style={[
                styles.mainTimerBtn,
                { marginTop: 16, backgroundColor: !liveSubOffId || !liveSubOnId ? '#334155' : '#10b981' },
              ]}
              onPress={async () => {
                if (!liveSubOffId || !liveSubOnId) return;
                await executeImmediateCustomSub({
                  offPlayerId: liveSubOffId,
                  onPlayerId: liveSubOnId,
                  period: activePeriod,
                  minute: Math.max(1, Math.floor(elapsedSeconds / 60)),
                });
                setLiveSubOffId('');
                setLiveSubOnId('');
                setCustomLiveSubModalOpen(false);
              }}
            >
              <Text style={styles.mainTimerBtnText}>
                ⚡ Execute Substitution Immediately
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelBtn}
              onPress={() => setCustomLiveSubModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Goal Scorer Attribution Modal */}
      <Modal visible={goalScorerModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚽ Who Scored the Goal?</Text>
            <View style={styles.pillGrid}>
              {players.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.playerChip}
                  onPress={() => attributeGoalToPlayer(p)}
                >
                  <Text style={styles.playerChipText}>
                    #{p.squadNumber ?? '-'} {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setGoalScorerModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Skip Scorer Attribution</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Complete Match & Award Joint POTM Modal */}
      <Modal visible={completeModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              🏁 Full Time ({homeScore} - {awayScore}) — Award POTM
            </Text>
            <Text style={styles.subHint}>
              Select one or multiple joint Players of the Match:
            </Text>
            <View style={styles.pillGrid}>
              {players.map((p) => {
                const selected = selectedPotmIds.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.playerChip, selected && styles.playerChipSelected]}
                    onPress={() =>
                      setSelectedPotmIds((prev) =>
                        prev.includes(p.id)
                          ? prev.filter((id) => id !== p.id)
                          : [...prev, p.id]
                      )
                    }
                  >
                    <Text style={styles.playerChipText}>
                      {selected ? '🏆 ' : ''}
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.finishConfirmBtn} onPress={handleFinishMatch}>
              <Text style={styles.finishConfirmText}>
                ✅ Save Final Result, POTM & Player Minutes
              </Text>
            </Pressable>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setCompleteModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 16,
    paddingTop: 52,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  liveTag: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  matchupText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  closeBtnText: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  scoreboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  scoreTeamName: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  scoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnText: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: '900',
  },
  scoreBtnAdd: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnAddText: {
    color: '#022c22',
    fontSize: 18,
    fontWeight: '900',
  },
  scoreNumber: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
  },
  scoreVs: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodPill: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  periodPillActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  periodPillText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },
  periodPillTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  timerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  periodLabel: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stopwatchDigits: {
    color: '#f8fafc',
    fontSize: 60,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 6,
  },
  alarmStatusBanner: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  alarmStatusText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  timerControls: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  mainTimerBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pauseTimerBtn: {
    backgroundColor: '#f59e0b',
  },
  mainTimerBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 15,
  },
  resetBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 12,
  },
  resetBtnText: {
    color: '#cbd5e1',
    fontWeight: '800',
  },
  subsSection: {
    marginTop: 4,
  },
  subsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addLiveSubBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addLiveSubBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  subCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  subCardDue: {
    borderColor: '#f59e0b',
    backgroundColor: '#451a03',
  },
  subCardDone: {
    opacity: 0.55,
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subMinuteBadge: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: '900',
  },
  subOnText: {
    color: '#4ade80',
    fontWeight: '800',
    fontSize: 14,
  },
  subOffText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2,
  },
  execSubBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  execSubBtnDone: {
    backgroundColor: '#334155',
  },
  execSubBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 12,
  },
  emptySubText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  completeMatchBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  completeMatchBtnText: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  subHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  playerChip: {
    backgroundColor: '#020617',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#334155',
  },
  playerChipSelected: {
    backgroundColor: '#78350f',
    borderColor: '#fbbf24',
  },
  playerChipText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  finishConfirmBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  finishConfirmText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 13,
  },
  cancelBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 12,
  },
});
