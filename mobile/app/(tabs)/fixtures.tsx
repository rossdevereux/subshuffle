import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { Fixture, GoalScorer, getFixturePotmIds } from '@subshuffle/shared';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';
import { MobileHeaderBar } from '../../src/components/MobileHeaderBar';

export default function FixturesScreen() {
  const {
    activeTeam,
    fixtures,
    activeFixture,
    setActiveFixtureId,
    players,
    createFixture,
    updateFixture,
    deleteFixture,
    updateFixtureScore,
    setPlayerOfTheMatch,
    savePostMatchRecording,
    shareFixtureToWhatsApp,
    exportFixturePdf,
    sunlightMode,
  } = useMobileMatchday();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Upcoming' | 'Completed'>('All');

  // Create / Edit Fixture Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [kickOffTime, setKickOffTime] = useState('10:00');
  const [meetTime, setMeetTime] = useState('09:30');
  const [groundAddress, setGroundAddress] = useState('');

  // Score, Scorers & Joint POTM Modal state
  const [scoreFixture, setScoreFixture] = useState<Fixture | null>(null);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [scorers, setScorers] = useState<GoalScorer[]>([]);
  const [selectedPotmIds, setSelectedPotmIds] = useState<string[]>([]);

  // Post-Match Completion Modal state
  const [postMatchFixture, setPostMatchFixture] = useState<Fixture | null>(null);
  const [trackingMode, setTrackingMode] = useState<'full_credit' | 'custom_minutes'>(
    'full_credit'
  );
  const [customMins, setCustomMins] = useState<Record<string, string>>({});

  const playerMap = new Map(players.map((p) => [p.id, p]));

  const filteredFixtures = fixtures.filter((f) => {
    if (statusFilter === 'Upcoming')
      return f.status === 'Upcoming' || f.status === 'In Progress' || f.status === 'Draft';
    if (statusFilter === 'Completed')
      return f.status === 'Completed' || f.status === 'Played';
    return true;
  });

  const openNewFixture = () => {
    setEditingFixture(null);
    setOpponent('');
    setDate(new Date().toISOString().slice(0, 10));
    setVenue('Home');
    setKickOffTime('10:00');
    setMeetTime('09:30');
    setGroundAddress('');
    setFormOpen(true);
  };

  const openEditFixture = (f: Fixture) => {
    setEditingFixture(f);
    setOpponent(f.opponent);
    setDate(f.date);
    setVenue(f.venue || 'Home');
    setKickOffTime(f.kickOffTime || '10:00');
    setMeetTime(f.meetTime || '09:30');
    setGroundAddress(f.groundAddress || '');
    setFormOpen(true);
  };

  const handleSaveFixture = async () => {
    if (!opponent.trim() || !date.trim()) return;
    if (editingFixture) {
      await updateFixture({
        ...editingFixture,
        opponent: opponent.trim(),
        date: date.trim(),
        venue,
        kickOffTime: kickOffTime.trim() || '10:00',
        meetTime: meetTime.trim() || undefined,
        groundAddress: groundAddress.trim() || undefined,
      });
    } else {
      await createFixture({
        opponent: opponent.trim(),
        date: date.trim(),
        venue,
        kickOffTime: kickOffTime.trim() || '10:00',
        meetTime: meetTime.trim() || undefined,
        groundAddress: groundAddress.trim() || undefined,
      });
    }
    setFormOpen(false);
  };

  const openScoreModal = (f: Fixture) => {
    setScoreFixture(f);
    setHomeScore(f.homeScore ?? 0);
    setAwayScore(f.awayScore ?? 0);
    setScorers(f.scorers || []);
    setSelectedPotmIds(getFixturePotmIds(f));
  };

  const togglePotmId = (playerId: string) => {
    setSelectedPotmIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const addGoalScorerForTeam = (player: { id: string; name: string }) => {
    if (!scoreFixture) return;
    const ourSide: 'home' | 'away' = scoreFixture.venue === 'Home' ? 'home' : 'away';
    const nextScorer: GoalScorer = {
      id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      playerId: player.id,
      playerName: player.name,
      team: ourSide,
    };
    const nextScorers = [...scorers, nextScorer];
    setScorers(nextScorers);
    const ourGoals = nextScorers.filter((s) => s.team === ourSide).length;
    if (ourSide === 'home' && ourGoals > homeScore) setHomeScore(ourGoals);
    if (ourSide === 'away' && ourGoals > awayScore) setAwayScore(ourGoals);
  };

  const handleSaveScoreAndPotm = async () => {
    if (!scoreFixture) return;
    await updateFixtureScore(
      homeScore,
      awayScore,
      scorers,
      'Completed',
      false,
      scoreFixture.id
    );
    await setPlayerOfTheMatch(selectedPotmIds, scoreFixture.id);
    setScoreFixture(null);
  };

  const openPostMatchModal = (f: Fixture) => {
    setPostMatchFixture(f);
    setTrackingMode('full_credit');
    const periodDur =
      f.periodDurationMinutes || activeTeam.settings.periodDurationMinutes || 25;
    const initMins: Record<string, string> = {};
    for (const p of players) {
      let periods = 0;
      for (const lp of f.matchSquad?.lineupsByPeriod || []) {
        if (lp.onPitch.some((op) => op.playerId === p.id)) periods++;
      }
      initMins[p.id] = String(periods * periodDur);
    }
    setCustomMins(initMins);
  };

  const handleCompletePostMatch = async () => {
    if (!postMatchFixture) return;
    const actualMinutesByPlayer: Record<string, number> = {};
    for (const [pid, val] of Object.entries(customMins)) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        actualMinutesByPlayer[pid] = parsed;
      }
    }
    await savePostMatchRecording(
      {
        trackingMode,
        actualMinutesByPlayer,
        recordedAt: new Date().toISOString(),
      },
      postMatchFixture.id
    );
    setPostMatchFixture(null);
  };

  return (
    <ScrollView
      style={[styles.container, sunlightMode && styles.containerSunlight]}
      contentContainerStyle={styles.content}
    >
      <MobileHeaderBar />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Fixtures & Results</Text>
          <Text style={styles.subtitle}>
            Season {activeTeam.settings.currentSeason || '2026/2027'} ({fixtures.length} fixtures)
          </Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openNewFixture}>
          <Text style={styles.addBtnText}>+ New Fixture</Text>
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['All', 'Upcoming', 'Completed'] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.filterTab, statusFilter === tab && styles.filterTabActive]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text
              style={[
                styles.filterTabText,
                statusFilter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {filteredFixtures.map((fix) => {
        const isCurrent = fix.id === activeFixture.id;
        const potmNames = getFixturePotmIds(fix)
          .map((id) => playerMap.get(id)?.name)
          .filter(Boolean);

        return (
          <View
            key={fix.id}
            style={[styles.card, isCurrent && styles.cardActive]}
          >
            <View style={styles.topRow}>
              <Text style={styles.dateText}>
                📅 {fix.date} {fix.kickOffTime ? `• KO ${fix.kickOffTime}` : ''} • {fix.venue}
              </Text>
              <View style={styles.badgeGroup}>
                {isCurrent && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{fix.status}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.matchup}>
              {activeTeam.name} vs {fix.opponent}
            </Text>

            {typeof fix.homeScore === 'number' && typeof fix.awayScore === 'number' && (
              <Text style={styles.scoreLine}>
                Final Score: {fix.homeScore} - {fix.awayScore}
              </Text>
            )}

            {(fix.scorers || []).length > 0 && (
              <Text style={styles.scorersLine}>
                ⚽ Scorers:{' '}
                {(fix.scorers || [])
                  .map((s) => s.playerName || playerMap.get(s.playerId || '')?.name || 'Goal')
                  .join(', ')}
              </Text>
            )}

            {potmNames.length > 0 && (
              <View style={styles.potmBox}>
                <Text style={styles.potmLabel}>
                  🏆 {potmNames.length > 1 ? 'Players of the Match:' : 'Player of the Match:'}
                </Text>
                <Text style={styles.potmNames}>{potmNames.join(', ')}</Text>
              </View>
            )}

            <View style={styles.actionGrid}>
              {!isCurrent && (
                <Pressable
                  style={styles.selectFixBtn}
                  onPress={() => setActiveFixtureId(fix.id)}
                >
                  <Text style={styles.selectFixBtnText}>🎯 Set Active</Text>
                </Pressable>
              )}
              <Pressable style={styles.actionBtn} onPress={() => openScoreModal(fix)}>
                <Text style={styles.actionBtnText}>⚽ Score & POTM</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => openPostMatchModal(fix)}>
                <Text style={styles.actionBtnText}>⏱️ Log Mins</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => openEditFixture(fix)}>
                <Text style={styles.actionBtnText}>✏️ Edit</Text>
              </Pressable>
              <Pressable style={styles.delBtn} onPress={() => deleteFixture(fix.id)}>
                <Text style={styles.delBtnText}>🗑️</Text>
              </Pressable>
            </View>

            {isCurrent && (
              <View style={[styles.actionGrid, { marginTop: 8 }]}>
                <Pressable style={styles.whatsappBtn} onPress={shareFixtureToWhatsApp}>
                  <Text style={styles.exportText}>💬 WhatsApp</Text>
                </Pressable>
                <Pressable style={styles.pdfBtn} onPress={exportFixturePdf}>
                  <Text style={styles.exportText}>📄 Match PDF</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      {/* MODAL 1: Create / Edit Fixture */}
      <Modal visible={formOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingFixture ? 'Edit Fixture' : 'Create New Fixture'}
            </Text>

            <Text style={styles.label}>Opponent Team Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Westgate Wanderers U10"
              placeholderTextColor="#64748b"
              value={opponent}
              onChangeText={setOpponent}
            />

            <Text style={styles.label}>Match Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-11-14"
              placeholderTextColor="#64748b"
              value={date}
              onChangeText={setDate}
            />

            <Text style={styles.label}>Venue</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['Home', 'Away'] as const).map((v) => (
                <Pressable
                  key={v}
                  style={[styles.venueChip, venue === v && styles.venueChipActive]}
                  onPress={() => setVenue(v)}
                >
                  <Text
                    style={[
                      styles.venueChipText,
                      venue === v && styles.venueChipTextActive,
                    ]}
                  >
                    {v === 'Home' ? '🏠 Home' : '🚌 Away'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Kick-Off Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10:00"
                  placeholderTextColor="#64748b"
                  value={kickOffTime}
                  onChangeText={setKickOffTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Meet Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09:30"
                  placeholderTextColor="#64748b"
                  value={meetTime}
                  onChangeText={setMeetTime}
                />
              </View>
            </View>

            <Text style={styles.label}>Pitch / Ground Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Victoria Park Pitch 3"
              placeholderTextColor="#64748b"
              value={groundAddress}
              onChangeText={setGroundAddress}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Pressable style={styles.saveBtn} onPress={handleSaveFixture}>
                <Text style={styles.saveBtnText}>
                  {editingFixture ? 'Save Fixture' : 'Create Fixture'}
                </Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setFormOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Record Score, Goal Scorers & Joint Players of the Match */}
      <Modal visible={Boolean(scoreFixture)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              ⚽ Score, Scorers & POTM — vs {scoreFixture?.opponent}
            </Text>
            <ScrollView style={{ maxHeight: 440 }}>
              <View style={styles.scoreStepperRow}>
                <View style={styles.scoreSideBox}>
                  <Text style={styles.scoreSideLabel}>
                    {scoreFixture?.venue === 'Home' ? activeTeam.name : scoreFixture?.opponent}{' '}
                    (Home)
                  </Text>
                  <View style={styles.stepperBtns}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setHomeScore(Math.max(0, homeScore - 1))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </Pressable>
                    <Text style={styles.scoreBigNum}>{homeScore}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setHomeScore(homeScore + 1)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.scoreSideBox}>
                  <Text style={styles.scoreSideLabel}>
                    {scoreFixture?.venue === 'Away' ? activeTeam.name : scoreFixture?.opponent}{' '}
                    (Away)
                  </Text>
                  <View style={styles.stepperBtns}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setAwayScore(Math.max(0, awayScore - 1))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </Pressable>
                    <Text style={styles.scoreBigNum}>{awayScore}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setAwayScore(awayScore + 1)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <Text style={styles.label}>⚽ Tap Player to Add Goal Scorer:</Text>
              <View style={styles.pillGrid}>
                {players.map((p) => (
                  <Pressable
                    key={p.id}
                    style={styles.scorerChip}
                    onPress={() => addGoalScorerForTeam(p)}
                  >
                    <Text style={styles.scorerChipText}>+ ⚽ {p.name}</Text>
                  </Pressable>
                ))}
              </View>

              {scorers.length > 0 && (
                <View style={{ marginVertical: 8 }}>
                  {scorers.map((sc) => (
                    <View key={sc.id} style={styles.loggedScorerRow}>
                      <Text style={styles.loggedScorerText}>
                        ⚽ {sc.playerName || 'Goal'} ({sc.team.toUpperCase()})
                      </Text>
                      <Pressable
                        onPress={() => setScorers((prev) => prev.filter((x) => x.id !== sc.id))}
                      >
                        <Text style={styles.delBtnText}>Remove ✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { marginTop: 10 }]}>
                🏆 Player(s) of the Match (Select 1 or Multiple Joint Winners):
              </Text>
              <View style={styles.pillGrid}>
                {players.map((p) => {
                  const isWinner = selectedPotmIds.includes(p.id);
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.potmChip, isWinner && styles.potmChipSelected]}
                      onPress={() => togglePotmId(p.id)}
                    >
                      <Text
                        style={[styles.potmChipText, isWinner && styles.potmChipTextSelected]}
                      >
                        {isWinner ? '🏆 ' : ''}
                        {p.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable style={styles.saveBtn} onPress={handleSaveScoreAndPotm}>
                <Text style={styles.saveBtnText}>Save Result & POTM</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setScoreFixture(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Post-Match Game Time Verification */}
      <Modal visible={Boolean(postMatchFixture)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              ⏱️ Complete Match & Log Minutes — vs {postMatchFixture?.opponent}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <Pressable
                style={[
                  styles.venueChip,
                  trackingMode === 'full_credit' && styles.venueChipActive,
                ]}
                onPress={() => setTrackingMode('full_credit')}
              >
                <Text
                  style={[
                    styles.venueChipText,
                    trackingMode === 'full_credit' && styles.venueChipTextActive,
                  ]}
                >
                  ✅ Planned Rotation Mins
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.venueChip,
                  trackingMode === 'custom_minutes' && styles.venueChipActive,
                ]}
                onPress={() => setTrackingMode('custom_minutes')}
              >
                <Text
                  style={[
                    styles.venueChipText,
                    trackingMode === 'custom_minutes' && styles.venueChipTextActive,
                  ]}
                >
                  ✏️ Custom Minutes
                </Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {players.map((p) => (
                <View key={p.id} style={styles.minsRow}>
                  <Text style={styles.minsPlayerName}>
                    #{p.squadNumber ?? '-'} {p.name}
                  </Text>
                  <TextInput
                    style={styles.minsInput}
                    keyboardType="numeric"
                    value={customMins[p.id] || '0'}
                    onChangeText={(val) =>
                      setCustomMins((prev) => ({ ...prev, [p.id]: val }))
                    }
                  />
                  <Text style={styles.minsUnit}>mins</Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable style={styles.saveBtn} onPress={handleCompletePostMatch}>
                <Text style={styles.saveBtnText}>✅ Complete & Credit Minutes</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setPostMatchFixture(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
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
  containerSunlight: {
    backgroundColor: '#000000',
  },
  content: {
    padding: 12,
    paddingTop: 46,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 12,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterTabActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  filterTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  cardActive: {
    borderColor: '#10b981',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  activeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#022c22',
    fontSize: 10,
    fontWeight: '900',
  },
  statusBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
  },
  matchup: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  scoreLine: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  scorersLine: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 6,
  },
  potmBox: {
    backgroundColor: '#451a03',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    marginBottom: 8,
  },
  potmLabel: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
  },
  potmNames: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  selectFixBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  selectFixBtnText: {
    color: '#022c22',
    fontSize: 11,
    fontWeight: '900',
  },
  actionBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  delBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  delBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  pdfBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  exportText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
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
    marginBottom: 10,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 10,
  },
  venueChip: {
    flex: 1,
    backgroundColor: '#020617',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  venueChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  venueChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  venueChipTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  scoreStepperRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  scoreSideBox: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  scoreSideLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepperBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  scoreBigNum: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scorerChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  scorerChipText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  loggedScorerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  loggedScorerText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  potmChip: {
    backgroundColor: '#020617',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  potmChipSelected: {
    backgroundColor: '#78350f',
    borderColor: '#fbbf24',
  },
  potmChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  potmChipTextSelected: {
    color: '#fef3c7',
    fontWeight: '900',
  },
  minsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  minsPlayerName: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  minsInput: {
    width: 54,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingVertical: 4,
    textAlign: 'center',
    color: '#10b981',
    fontWeight: '900',
  },
  minsUnit: {
    color: '#64748b',
    fontSize: 11,
    marginLeft: 6,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 13,
  },
  cancelBtn: {
    flex: 0.7,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 13,
  },
});
