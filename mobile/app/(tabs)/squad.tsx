import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';

export default function SquadScreen() {
  const { activeTeam, players } = useMobileMatchday();

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>
        {activeTeam.name} Roster ({players.length} Players)
      </Text>
      {players.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.numBox}>
            <Text style={styles.numText}>#{p.squadNumber || '—'}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.sub}>{p.preferredPositions.join(' • ')}</Text>
          </View>
          <View style={styles.statsCol}>
            <Text style={styles.statVal}>{p.totalMinutesPlayed}m</Text>
            <Text style={styles.statSub}>{p.matchesPlayed} apps</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  heading: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  numBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: '#38bdf8', fontWeight: '900', fontSize: 13, fontVariant: ['tabular-nums'] },
  info: { flex: 1, gap: 2 },
  name: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  sub: { color: '#94a3b8', fontSize: 12 },
  statsCol: { alignItems: 'flex-end' },
  statVal: { color: '#34d399', fontWeight: '800', fontSize: 13, fontVariant: ['tabular-nums'] },
  statSub: { color: '#64748b', fontSize: 11, fontVariant: ['tabular-nums'] },
});

