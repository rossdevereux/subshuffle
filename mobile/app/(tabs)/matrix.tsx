import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';

export default function MatrixScreen() {
  const { activeTeam, activeFixture, players } = useMobileMatchday();
  const periodDuration =
    activeFixture.periodDurationMinutes || activeTeam.settings.periodDurationMinutes || 25;
  const lineups = activeFixture.matchSquad?.lineupsByPeriod || [];

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Period-by-Period Fair Play Matrix</Text>
      {players.map((player) => {
        const periodsOnPitch = lineups.filter((lp) =>
          lp.onPitch.some((op) => op.playerId === player.id)
        ).length;
        const estMinutes = periodsOnPitch * periodDuration;

        return (
          <View key={player.id} style={styles.rowCard}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerName}>
                #{player.squadNumber || '—'} {player.name}
              </Text>
              <Text style={styles.minutesBadge}>{estMinutes}m planned</Text>
            </View>
            <View style={styles.periodRow}>
              {lineups.map((lp) => {
                const slot = lp.onPitch.find((op) => op.playerId === player.id);
                return (
                  <View
                    key={lp.period}
                    style={[styles.cell, slot ? styles.cellPitch : styles.cellBench]}
                  >
                    <Text style={styles.cellLabel}>P{lp.period}</Text>
                    <Text style={styles.cellValue}>{slot ? slot.position : 'SUB'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  heading: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  rowCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playerName: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  minutesBadge: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  periodRow: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  cellPitch: { backgroundColor: '#064e3b', borderWidth: 1, borderColor: '#10b981' },
  cellBench: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  cellLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  cellValue: { color: '#ffffff', fontSize: 12, fontWeight: '800', marginTop: 2 },
});

