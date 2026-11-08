import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';

export default function DashboardScreen() {
  const { activeTeam, players, fixtures } = useMobileMatchday();
  const totalMinutes = players.reduce((sum, p) => sum + p.totalMinutesPlayed, 0);

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>{activeTeam.name} Season Analytics</Text>
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Squad Size</Text>
          <Text style={styles.kpiValue}>{players.length}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Fixtures</Text>
          <Text style={styles.kpiValue}>{fixtures.length}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Tracked Minutes</Text>
          <Text style={styles.kpiValue}>{totalMinutes}m</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 12 },
  heading: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  kpiLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  kpiValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});

