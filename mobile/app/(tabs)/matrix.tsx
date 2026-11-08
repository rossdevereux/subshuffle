import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';
import { MobileHeaderBar } from '../../src/components/MobileHeaderBar';

export default function RotationMatrixScreen() {
  const {
    activeTeam,
    activeFixture,
    players,
    matchStats,
    toggleFixedPlayerPosition,
    setMatchCaptain,
    autoRotateLineup,
    sunlightMode,
  } = useMobileMatchday();

  const lineups = activeFixture.matchSquad?.lineupsByPeriod || [];
  const selectedIds = activeFixture.matchSquad?.selectedPlayerIds || players.map((p) => p.id);
  const squadPlayers = players.filter((p) => selectedIds.includes(p.id));
  const statsMap = new Map(matchStats.map((s) => [s.playerId, s]));
  const fixedMap = {
    ...(activeFixture.fixedPlayerPositions || {}),
    ...(activeFixture.matchSquad?.fixedPlayerPositions || {}),
  };

  return (
    <ScrollView
      style={[styles.container, sunlightMode && styles.containerSunlight]}
      contentContainerStyle={styles.content}
    >
      <MobileHeaderBar />

      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Rotation Matrix</Text>
          <Text style={styles.subtitle}>
            Tap 🔒 to lock player position across all periods or © for captain
          </Text>
        </View>
        <Pressable style={styles.rebalanceBtn} onPress={() => autoRotateLineup()}>
          <Text style={styles.rebalanceBtnText}>⚡ Re-Balance</Text>
        </Pressable>
      </View>

      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.playerCell, styles.headerText]}>Player</Text>
          {lineups.map((lp) => (
            <Text key={lp.period} style={[styles.periodCell, styles.headerText]}>
              P{lp.period}
            </Text>
          ))}
          <Text style={[styles.totalCell, styles.headerText]}>Mins</Text>
        </View>

        {squadPlayers.map((player) => {
          const stat = statsMap.get(player.id);
          const lockedPos = fixedMap[player.id];
          const isCaptain = activeFixture.captainId === player.id;

          return (
            <View key={player.id} style={styles.row}>
              <View style={styles.playerCell}>
                <Text style={styles.playerName} numberOfLines={1}>
                  #{player.squadNumber ?? '-'} {player.name}
                </Text>
                <View style={styles.badgeActionRow}>
                  <Pressable
                    style={[styles.miniTag, lockedPos ? styles.miniTagLocked : undefined]}
                    onPress={() => toggleFixedPlayerPosition(player.id, lockedPos || 'GK')}
                  >
                    <Text style={styles.miniTagText}>
                      {lockedPos ? `🔒 ${lockedPos}` : '🔓 Lock'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.miniTag, isCaptain ? styles.miniTagCaptain : undefined]}
                    onPress={() => setMatchCaptain(player.id)}
                  >
                    <Text style={styles.miniTagText}>{isCaptain ? '© Capt' : '©'}</Text>
                  </Pressable>
                </View>
              </View>

              {lineups.map((lp) => {
                const pitchSlot = lp.onPitch.find((op) => op.playerId === player.id);
                const subIn = (activeFixture.matchSquad?.plannedInGameSubs || []).find(
                  (s) => s.period === lp.period && s.onPlayerId === player.id
                );
                const subOut = (activeFixture.matchSquad?.plannedInGameSubs || []).find(
                  (s) => s.period === lp.period && s.offPlayerId === player.id
                );

                return (
                  <View
                    key={lp.period}
                    style={[
                      styles.periodCell,
                      pitchSlot ? styles.onPitchCell : styles.benchCell,
                    ]}
                  >
                    <Text style={pitchSlot ? styles.onPitchText : styles.benchText}>
                      {pitchSlot ? pitchSlot.position : 'SUB'}
                    </Text>
                    {(subIn || subOut) && (
                      <Text style={styles.splitSubText}>
                        {subOut ? `↘${subOut.targetMinute}'` : `↗${subIn?.targetMinute}'`}
                      </Text>
                    )}
                  </View>
                );
              })}

              <View style={styles.totalCell}>
                <Text
                  style={[
                    styles.totalMinutes,
                    stat && !stat.meetsTarget && { color: '#f59e0b' },
                  ]}
                >
                  {stat ? `${stat.totalMinutes}m` : '0m'}
                </Text>
                <Text style={styles.pctText}>{stat ? `${stat.percentOfMatch}%` : ''}</Text>
              </View>
            </View>
          );
        })}
      </View>
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
  titleRow: {
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
  rebalanceBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rebalanceBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 12,
  },
  table: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  headerRow: {
    backgroundColor: '#1e293b',
  },
  headerText: {
    color: '#cbd5e1',
    fontWeight: '800',
    fontSize: 11,
  },
  playerCell: {
    flex: 2.2,
    paddingRight: 4,
  },
  playerName: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 13,
  },
  badgeActionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  miniTag: {
    backgroundColor: '#020617',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniTagLocked: {
    backgroundColor: '#78350f',
    borderColor: '#f59e0b',
  },
  miniTagCaptain: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  miniTagText: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '800',
  },
  periodCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  onPitchCell: {
    backgroundColor: '#065f46',
  },
  benchCell: {
    backgroundColor: '#334155',
  },
  onPitchText: {
    color: '#ecfdf5',
    fontWeight: '900',
    fontSize: 11,
  },
  benchText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 10,
  },
  splitSubText: {
    color: '#fde68a',
    fontSize: 8,
    fontWeight: '800',
  },
  totalCell: {
    flex: 1,
    alignItems: 'flex-end',
  },
  totalMinutes: {
    color: '#10b981',
    fontWeight: '900',
    fontSize: 13,
  },
  pctText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
});
