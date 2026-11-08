import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getFixturePotmIds } from '@subshuffle/shared';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';

export default function FixturesScreen() {
  const { fixtures, players } = useMobileMatchday();
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Season Fixtures & Results</Text>
      {fixtures.map((f) => {
        const potmNames = getFixturePotmIds(f)
          .map((id) => playerMap.get(id)?.name)
          .filter(Boolean);

        return (
          <View key={f.id} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.venueBadge}>{f.venue.toUpperCase()}</Text>
              <Text style={styles.dateText}>
                {f.date} • {f.kickOffTime || '10:00'}
              </Text>
            </View>
            <Text style={styles.opponent}>vs {f.opponent}</Text>
            {typeof f.homeScore === 'number' && typeof f.awayScore === 'number' && (
              <Text style={styles.scoreText}>
                Score: {f.homeScore} - {f.awayScore}
              </Text>
            )}
            {potmNames.length > 0 && (
              <View style={styles.potmBadge}>
                <Text style={styles.potmText}>
                  ⭐ {potmNames.length > 1 ? 'Awards' : 'Award'}: {potmNames.join(', ')}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  heading: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 6,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venueBadge: { color: '#38bdf8', fontSize: 11, fontWeight: '800' },
  dateText: { color: '#94a3b8', fontSize: 12, fontVariant: ['tabular-nums'] },
  opponent: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  scoreText: { color: '#34d399', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  potmBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  potmText: { color: '#6ee7b7', fontSize: 11, fontWeight: '700' },
});

