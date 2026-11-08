import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';
import { MobileHeaderBar } from '../../src/components/MobileHeaderBar';
import { normalizeDashboardSummary } from '../../src/services/mobileDataNormalizer';

export default function DashboardScreen() {
  const {
    activeTeam,
    activeFixture,
    players,
    fixtures,
    dashboardSummary,
    matchStats,
    sunlightMode,
  } = useMobileMatchday();

  const [viewMode, setViewMode] = useState<'dashboard' | 'matchday' | 'season'>('dashboard');

  // Normalize server or local summary safely
  const computedSummary = useMemo(
    () => normalizeDashboardSummary(dashboardSummary, fixtures, players),
    [dashboardSummary, fixtures, players]
  );

  const sortedByMinutes = [...players].sort(
    (a, b) => (b.totalMinutesPlayed || 0) - (a.totalMinutesPlayed || 0)
  );
  const maxMinutes = Math.max(1, sortedByMinutes[0]?.totalMinutesPlayed || 1);

  return (
    <ScrollView
      style={[styles.container, sunlightMode && styles.containerSunlight]}
      contentContainerStyle={styles.content}
    >
      <MobileHeaderBar />

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, viewMode === 'dashboard' && styles.tabBtnActive]}
          onPress={() => setViewMode('dashboard')}
        >
          <Text style={[styles.tabBtnText, viewMode === 'dashboard' && styles.tabBtnTextActive]}>
            🏆 Dashboard
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, viewMode === 'matchday' && styles.tabBtnActive]}
          onPress={() => setViewMode('matchday')}
        >
          <Text style={[styles.tabBtnText, viewMode === 'matchday' && styles.tabBtnTextActive]}>
            ⚖️ Match Fair Play
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, viewMode === 'season' && styles.tabBtnActive]}
          onPress={() => setViewMode('season')}
        >
          <Text style={[styles.tabBtnText, viewMode === 'season' && styles.tabBtnTextActive]}>
            📊 Season Mins
          </Text>
        </Pressable>
      </View>

      {viewMode === 'dashboard' && (
        <View>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>
                {computedSummary.wins}W-{computedSummary.draws}D-{computedSummary.losses}L
              </Text>
              <Text style={styles.kpiLabel}>
                Record ({computedSummary.matchesPlayed} Played)
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>
                {computedSummary.goalsFor} : {computedSummary.goalsAgainst}
              </Text>
              <Text style={styles.kpiLabel}>
                Goals (GD {computedSummary.goalDifference >= 0 ? `+${computedSummary.goalDifference}` : computedSummary.goalDifference})
              </Text>
            </View>
          </View>

          {/* POTM Leaderboard */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🏆 Player of the Match Leaderboard</Text>
            {computedSummary.potmLeaders.length === 0 ? (
              <Text style={styles.emptyText}>
                No POTM awards recorded yet. Open Fixtures → "⚽ Score & POTM" to award winners!
              </Text>
            ) : (
              computedSummary.potmLeaders.map((item, idx) => (
                <View key={item.playerId} style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>#{idx + 1}</Text>
                  <Text style={styles.leaderName}>{item.playerName}</Text>
                  <Text style={styles.leaderStat}>🏆 {item.awards}</Text>
                </View>
              ))
            )}
          </View>

          {/* Top Scorers Leaderboard */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>⚽ Top Goalscorers</Text>
            {computedSummary.topScorers.length === 0 ? (
              <Text style={styles.emptyText}>No goal scorers recorded yet this season.</Text>
            ) : (
              computedSummary.topScorers.map((item, idx) => (
                <View key={item.playerId} style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>#{idx + 1}</Text>
                  <Text style={styles.leaderName}>{item.playerName}</Text>
                  <Text style={styles.leaderStat}>⚽ {item.goals}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {viewMode === 'matchday' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            ⚖️ Matchday Fair Play — vs {activeFixture.opponent}
          </Text>
          <Text style={styles.subtitle}>
            Target Game Time: {activeTeam.settings.targetGameTimePercent || 50}%
          </Text>
          {matchStats.map((st) => (
            <View key={st.playerId} style={styles.barRow}>
              <View style={styles.barHeader}>
                <Text style={styles.playerName}>
                  #{st.squadNumber ?? '-'} {st.playerName} ({st.positionsPlayed.join(', ') || 'SUB'})
                </Text>
                <Text
                  style={[
                    styles.minutesValue,
                    !st.meetsTarget && { color: '#f59e0b' },
                  ]}
                >
                  {st.totalMinutes}m ({st.percentOfMatch}%)
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, st.percentOfMatch)}%`,
                      backgroundColor: st.meetsTarget ? '#10b981' : '#f59e0b',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {viewMode === 'season' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📊 Cumulative Season Game Time</Text>
          {sortedByMinutes.map((player) => {
            const pct = Math.round(((player.totalMinutesPlayed || 0) / maxMinutes) * 100);
            const avg =
              player.matchesPlayed > 0
                ? Math.round((player.totalMinutesPlayed || 0) / player.matchesPlayed)
                : 0;
            return (
              <View key={player.id} style={styles.barRow}>
                <View style={styles.barHeader}>
                  <Text style={styles.playerName}>
                    #{player.squadNumber ?? '-'} {player.name}
                  </Text>
                  <Text style={styles.minutesValue}>
                    {player.totalMinutesPlayed || 0}m ({player.matchesPlayed || 0} games • avg {avg}
                    m)
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
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
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtnActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  kpiValue: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900',
  },
  kpiLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 10,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  leaderRank: {
    color: '#38bdf8',
    fontWeight: '900',
    width: 30,
  },
  leaderName: {
    flex: 1,
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 14,
  },
  leaderStat: {
    color: '#fbbf24',
    fontWeight: '900',
    fontSize: 14,
  },
  barRow: {
    marginBottom: 12,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  playerName: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 13,
  },
  minutesValue: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 12,
  },
  barTrack: {
    height: 10,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 6,
  },
});
