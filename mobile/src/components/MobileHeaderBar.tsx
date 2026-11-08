import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMobileMatchday } from '../context/MobileMatchdayContext';

export function MobileHeaderBar() {
  const {
    currentUser,
    isDemoMode,
    loading,
    syncMessage,
    errorMessage,
    clearMessages,
    teams,
    activeTeam,
    setActiveTeamId,
    fixtures,
    activeFixture,
    setActiveFixtureId,
    refreshAllData,
    signOut,
    sunlightMode,
    setSunlightMode,
  } = useMobileMatchday();

  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [fixturePickerOpen, setFixturePickerOpen] = useState(false);

  return (
    <View style={[styles.wrapper, sunlightMode && styles.wrapperSunlight]}>
      <View style={styles.topRow}>
        {/* Team Switcher Pill */}
        <Pressable style={styles.selectorPill} onPress={() => setTeamPickerOpen(true)}>
          <Text style={styles.selectorLabel}>TEAM</Text>
          <Text style={styles.selectorValue} numberOfLines={1}>
            ⚽ {activeTeam.name} ({activeTeam.ageGroup}) ▾
          </Text>
        </Pressable>

        {/* Fixture Switcher Pill */}
        <Pressable style={styles.selectorPill} onPress={() => setFixturePickerOpen(true)}>
          <Text style={styles.selectorLabel}>ACTIVE FIXTURE</Text>
          <Text style={styles.selectorValue} numberOfLines={1}>
            📅 vs {activeFixture.opponent} ({activeFixture.date}) ▾
          </Text>
        </Pressable>
      </View>

      <View style={styles.accountRow}>
        {currentUser ? (
          <View style={styles.userBadgeRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.userEmailText} numberOfLines={1}>
              {currentUser.displayName || currentUser.email}
            </Text>
          </View>
        ) : (
          <Pressable style={styles.demoSignInPill} onPress={signOut}>
            <Text style={styles.demoSignInText}>⚠️ DEMO MODE • Tap to Sign In</Text>
          </Pressable>
        )}

        <View style={styles.rightActions}>
          {currentUser && (
            <Pressable style={styles.iconBtn} onPress={refreshAllData} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Text style={styles.iconBtnText}>↻ Sync</Text>
              )}
            </Pressable>
          )}
          <Pressable
            style={[styles.iconBtn, sunlightMode && styles.iconBtnActive]}
            onPress={() => setSunlightMode(!sunlightMode)}
          >
            <Text style={styles.iconBtnText}>{sunlightMode ? '☀️ Sun' : '🌙 Dark'}</Text>
          </Pressable>
          {currentUser && (
            <Pressable style={styles.signOutBtn} onPress={signOut}>
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </Pressable>
          )}
        </View>
      </View>

      {syncMessage && (
        <Pressable style={styles.syncToast} onPress={clearMessages}>
          <Text style={styles.syncToastText}>✅ {syncMessage}</Text>
        </Pressable>
      )}

      {errorMessage && (
        <Pressable style={styles.errorToast} onPress={clearMessages}>
          <Text style={styles.errorToastText}>⚠️ {errorMessage} (Tap to dismiss)</Text>
        </Pressable>
      )}

      {/* Team Picker Modal */}
      <Modal visible={teamPickerOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Active Team</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {teams.map((t) => {
                const isSelected = t.id === activeTeam.id;
                return (
                  <Pressable
                    key={t.id}
                    style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                    onPress={async () => {
                      setTeamPickerOpen(false);
                      await setActiveTeamId(t.id);
                    }}
                  >
                    <View>
                      <Text style={styles.pickerRowTitle}>
                        {t.name} ({t.ageGroup})
                      </Text>
                      <Text style={styles.pickerRowSub}>
                        {t.settings.pitchPlayerCount}v{t.settings.pitchPlayerCount} • Season{' '}
                        {t.settings.currentSeason || '2026/2027'}
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalCloseBtn} onPress={() => setTeamPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Fixture Picker Modal */}
      <Modal visible={fixturePickerOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Active Matchday Fixture</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {fixtures.map((f) => {
                const isSelected = f.id === activeFixture.id;
                return (
                  <Pressable
                    key={f.id}
                    style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                    onPress={async () => {
                      setFixturePickerOpen(false);
                      await setActiveFixtureId(f.id);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerRowTitle}>
                        vs {f.opponent} ({f.venue})
                      </Text>
                      <Text style={styles.pickerRowSub}>
                        {f.date} • {f.status}
                        {typeof f.homeScore === 'number' && typeof f.awayScore === 'number'
                          ? ` • Score: ${f.homeScore}-${f.awayScore}`
                          : ''}
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalCloseBtn} onPress={() => setFixturePickerOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  wrapperSunlight: {
    backgroundColor: '#000000',
    borderColor: '#f8fafc',
  },
  topRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  selectorPill: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectorLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  selectorValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  userEmailText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  demoSignInPill: {
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  demoSignInText: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '800',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  iconBtnActive: {
    backgroundColor: '#065f46',
  },
  iconBtnText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  signOutBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  signOutBtnText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
  },
  syncToast: {
    marginTop: 8,
    backgroundColor: '#064e3b',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  syncToastText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '700',
  },
  errorToast: {
    marginTop: 8,
    backgroundColor: '#450a0a',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  errorToastText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#020617',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pickerRowSelected: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  pickerRowTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  pickerRowSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  checkMark: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '900',
  },
  modalCloseBtn: {
    marginTop: 10,
    backgroundColor: '#1e293b',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 13,
  },
});

