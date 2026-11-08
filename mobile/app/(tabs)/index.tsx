import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';

export default function PitchBenchScreen() {
  const router = useRouter();
  const {
    activeTeam,
    activeFixture,
    players,
    activePeriod,
    setActivePeriod,
    activeFormation,
    selectedSwapSource,
    handleTapPlayerNode,
    autoRotateLineup,
    shareFixtureToWhatsApp,
    exportFixturePdf,
  } = useMobileMatchday();

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const periodLineup = useMemo(
    () =>
      activeFixture.matchSquad?.lineupsByPeriod.find((lp) => lp.period === activePeriod) ||
      activeFixture.matchSquad?.lineupsByPeriod[0],
    [activeFixture, activePeriod]
  );

  const periodCount = activeFixture.matchPeriodCount || activeTeam.settings.matchPeriodCount || 2;

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {/* Match Context Header */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroInfo}>
            <Text style={styles.teamBadge}>{activeTeam.name}</Text>
            <Text style={styles.opponentTitle}>vs {activeFixture.opponent}</Text>
            <Text style={styles.metaText}>
              {activeFixture.date} • Kick-off {activeFixture.kickOffTime || '10:00'} ({activeFixture.venue})
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/live-match')}
            style={({ pressed }) => [styles.liveBtn, pressed && styles.pressed]}
          >
            <Text style={styles.liveBtnText}>⏱️ Live Match</Text>
          </Pressable>
        </View>

        {/* Action Toolbar */}
        <View style={styles.toolbarRow}>
          <Pressable
            onPress={autoRotateLineup}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <Text style={styles.actionBtnText}>⚖️ Auto-Balance</Text>
          </Pressable>
          <Pressable
            onPress={shareFixtureToWhatsApp}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
          </Pressable>
          <Pressable
            onPress={exportFixturePdf}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <Text style={styles.actionBtnText}>📄 PDF Sheet</Text>
          </Pressable>
        </View>
      </View>

      {/* Period Selector Pills */}
      <View style={styles.periodTabs}>
        {Array.from({ length: periodCount }, (_, idx) => idx + 1).map((pNum) => {
          const isActive = pNum === activePeriod;
          return (
            <Pressable
              key={pNum}
              onPress={() => setActivePeriod(pNum)}
              style={[styles.periodPill, isActive && styles.periodPillActive]}
            >
              <Text style={[styles.periodPillText, isActive && styles.periodPillTextActive]}>
                {periodCount === 2 ? `Half ${pNum}` : `Period ${pNum}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 2D SVG Tactical Pitch with Interactive Tap-to-Swap Tokens */}
      <View style={styles.pitchContainer}>
        <Svg width="100%" height="100%" viewBox="0 0 100 130" preserveAspectRatio="none">
          <Rect x="2" y="2" width="96" height="126" rx="4" fill="#065f46" stroke="#34d399" strokeWidth="0.8" />
          <Line x1="2" y1="65" x2="98" y2="65" stroke="#34d399" strokeWidth="0.6" strokeOpacity="0.6" />
          <Circle cx="50" cy="65" r="12" fill="none" stroke="#34d399" strokeWidth="0.6" strokeOpacity="0.6" />
          <Rect x="24" y="2" width="52" height="18" fill="none" stroke="#34d399" strokeWidth="0.6" strokeOpacity="0.6" />
          <Rect x="24" y="110" width="52" height="18" fill="none" stroke="#34d399" strokeWidth="0.6" strokeOpacity="0.6" />
        </Svg>

        {activeFormation.positions.map((slot) => {
          const assignment = periodLineup?.onPitch.find((op) => op.position === slot.code);
          const player = assignment ? playerMap.get(assignment.playerId) : undefined;
          if (!player) return null;
          const isSelected = selectedSwapSource?.playerId === player.id;

          return (
            <Pressable
              key={slot.code}
              onPress={() =>
                handleTapPlayerNode({
                  type: 'pitch',
                  playerId: player.id,
                  position: slot.code,
                })
              }
              style={[
                styles.pitchToken,
                {
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                },
                isSelected && styles.pitchTokenSelected,
              ]}
            >
              <View style={[styles.tokenBadge, slot.code === 'GK' && styles.gkBadge]}>
                <Text style={styles.tokenNumber}>#{player.squadNumber || '—'}</Text>
              </View>
              <Text style={styles.tokenName} numberOfLines={1}>
                {player.name.split(' ')[0]}
              </Text>
              <Text style={styles.tokenPos}>{slot.code}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bench Substitutes */}
      <View style={styles.benchSection}>
        <Text style={styles.sectionTitle}>
          Touchline Substitutes ({periodLineup?.bench.length || 0}) — Tap any two players to swap
        </Text>
        <View style={styles.benchGrid}>
          {(periodLineup?.bench || []).map((playerId) => {
            const player = playerMap.get(playerId);
            if (!player) return null;
            const isSelected = selectedSwapSource?.playerId === player.id;
            return (
              <Pressable
                key={player.id}
                onPress={() => handleTapPlayerNode({ type: 'bench', playerId: player.id })}
                style={[styles.benchCard, isSelected && styles.benchCardSelected]}
              >
                <Text style={styles.benchNumber}>#{player.squadNumber || '—'}</Text>
                <View style={styles.benchInfo}>
                  <Text style={styles.benchName}>{player.name}</Text>
                  <Text style={styles.benchPositions}>{player.preferredPositions.join(' • ')}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroInfo: { flex: 1, gap: 2 },
  teamBadge: { color: '#38bdf8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  opponentTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  metaText: { color: '#94a3b8', fontSize: 12 },
  liveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  liveBtnText: { color: '#022c22', fontWeight: '900', fontSize: 13 },
  toolbarRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnText: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  periodTabs: { flexDirection: 'row', gap: 8 },
  periodPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  periodPillActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  periodPillText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  periodPillTextActive: { color: '#ffffff' },
  pitchContainer: {
    height: 390,
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#064e3b',
  },
  pitchToken: {
    position: 'absolute',
    width: 68,
    marginLeft: -34,
    marginTop: -28,
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  pitchTokenSelected: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(120, 53, 15, 0.92)',
  },
  tokenBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#0284c7',
  },
  gkBadge: { backgroundColor: '#d97706' },
  tokenNumber: { color: '#ffffff', fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tokenName: { color: '#ffffff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  tokenPos: { color: '#94a3b8', fontSize: 9, fontWeight: '700' },
  benchSection: { gap: 10 },
  sectionTitle: { color: '#cbd5e1', fontSize: 13, fontWeight: '800' },
  benchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  benchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: '47%',
  },
  benchCardSelected: { borderColor: '#fbbf24', backgroundColor: '#451a03' },
  benchNumber: {
    color: '#38bdf8',
    fontWeight: '900',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  benchInfo: { flex: 1 },
  benchName: { color: '#f8fafc', fontWeight: '700', fontSize: 13 },
  benchPositions: { color: '#94a3b8', fontSize: 11 },
});

