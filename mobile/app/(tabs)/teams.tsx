import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';
import { MobileHeaderBar } from '../../src/components/MobileHeaderBar';

export default function TeamsAndSettingsScreen() {
  const {
    currentUser,
    teams,
    activeTeam,
    setActiveTeamId,
    createTeam,
    updateTeam,
    updateTeamSettings,
    deleteTeam,
    shareTeam,
    unshareTeam,
    addSeason,
    submitSupportTicket,
    signOut,
    deleteAccount,
    sunlightMode,
  } = useMobileMatchday();

  // Create Team Modal
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newAgeGroup, setNewAgeGroup] = useState('U10');
  const [newPitchSize, setNewPitchSize] = useState<number>(7);

  // Share Team state
  const [coachEmail, setCoachEmail] = useState('');

  // Season state
  const [newSeasonName, setNewSeasonName] = useState('');

  // Support Ticket Modal
  const [supportOpen, setSupportOpen] = useState(false);
  const [ticketCat, setTicketCat] = useState<'bug' | 'feature' | 'question'>('bug');
  const [ticketSummary, setTicketSummary] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & All Data?',
      'This will permanently delete your coach profile, all teams, players, fixtures, and lineups. This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const settings = activeTeam.settings;

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    await createTeam({
      name: newTeamName.trim(),
      ageGroup: newAgeGroup.trim() || 'U10',
      pitchPlayerCount: newPitchSize,
    });
    setNewTeamName('');
    setNewTeamOpen(false);
  };

  return (
    <ScrollView
      style={[styles.container, sunlightMode && styles.containerSunlight]}
      contentContainerStyle={styles.content}
    >
      <MobileHeaderBar />

      {/* Section 1: My Teams */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚽ My Teams ({teams.length})</Text>
          <Pressable style={styles.addBtn} onPress={() => setNewTeamOpen(true)}>
            <Text style={styles.addBtnText}>+ Create Team</Text>
          </Pressable>
        </View>

        {teams.map((t) => {
          const isCurrent = t.id === activeTeam.id;
          return (
            <View key={t.id} style={[styles.teamRow, isCurrent && styles.teamRowActive]}>
              <Pressable style={{ flex: 1 }} onPress={() => setActiveTeamId(t.id)}>
                <Text style={styles.teamName}>
                  {t.name} ({t.ageGroup})
                </Text>
                <Text style={styles.teamSub}>
                  {t.settings.pitchPlayerCount}v{t.settings.pitchPlayerCount} •{' '}
                  {t.settings.matchPeriodCount}x{t.settings.periodDurationMinutes}m • Season{' '}
                  {t.settings.currentSeason || '2026/2027'}
                </Text>
              </Pressable>
              {isCurrent ? (
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>ACTIVE</Text>
                </View>
              ) : (
                <Pressable style={styles.switchBtn} onPress={() => setActiveTeamId(t.id)}>
                  <Text style={styles.switchBtnText}>Switch</Text>
                </Pressable>
              )}
              {teams.length > 1 && (
                <Pressable style={styles.delBtn} onPress={() => deleteTeam(t.id)}>
                  <Text style={styles.delBtnText}>🗑️</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {/* Section 2: Active Team Match Rules & Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⚙️ {activeTeam.name} — Match Rules & Settings</Text>

        <Text style={styles.label}>Format (Players on Pitch)</Text>
        <View style={styles.chipRow}>
          {[5, 7, 9, 11].map((cnt) => (
            <Pressable
              key={cnt}
              style={[
                styles.optionChip,
                settings.pitchPlayerCount === cnt && styles.optionChipActive,
              ]}
              onPress={() =>
                updateTeamSettings({
                  ...settings,
                  pitchPlayerCount: cnt,
                  matchdaySquadCap: cnt + 4,
                })
              }
            >
              <Text
                style={[
                  styles.optionChipText,
                  settings.pitchPlayerCount === cnt && styles.optionChipTextActive,
                ]}
              >
                {cnt}v{cnt}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Match Periods</Text>
        <View style={styles.chipRow}>
          {[
            { count: 2, label: '2 Halves' },
            { count: 4, label: '4 Quarters' },
          ].map((p) => (
            <Pressable
              key={p.count}
              style={[
                styles.optionChip,
                settings.matchPeriodCount === p.count && styles.optionChipActive,
              ]}
              onPress={() =>
                updateTeamSettings({
                  ...settings,
                  matchPeriodCount: p.count,
                })
              }
            >
              <Text
                style={[
                  styles.optionChipText,
                  settings.matchPeriodCount === p.count && styles.optionChipTextActive,
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Period Duration (Minutes)</Text>
        <View style={styles.chipRow}>
          {[10, 15, 20, 25, 30, 35, 40, 45].map((mins) => (
            <Pressable
              key={mins}
              style={[
                styles.optionChip,
                settings.periodDurationMinutes === mins && styles.optionChipActive,
              ]}
              onPress={() =>
                updateTeamSettings({
                  ...settings,
                  periodDurationMinutes: mins,
                })
              }
            >
              <Text
                style={[
                  styles.optionChipText,
                  settings.periodDurationMinutes === mins && styles.optionChipTextActive,
                ]}
              >
                {mins}m
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Fair Play Target Game Time (%)</Text>
        <View style={styles.chipRow}>
          {[40, 50, 60, 75].map((pct) => (
            <Pressable
              key={pct}
              style={[
                styles.optionChip,
                settings.targetGameTimePercent === pct && styles.optionChipActive,
              ]}
              onPress={() =>
                updateTeamSettings({
                  ...settings,
                  targetGameTimePercent: pct,
                })
              }
            >
              <Text
                style={[
                  styles.optionChipText,
                  settings.targetGameTimePercent === pct && styles.optionChipTextActive,
                ]}
              >
                {pct}%
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Season Management</Text>
        <View style={styles.chipRow}>
          {(settings.seasons || ['2026/2027']).map((s) => (
            <Pressable
              key={s}
              style={[
                styles.optionChip,
                settings.currentSeason === s && styles.optionChipActive,
              ]}
              onPress={() =>
                updateTeamSettings({
                  ...settings,
                  currentSeason: s,
                })
              }
            >
              <Text
                style={[
                  styles.optionChipText,
                  settings.currentSeason === s && styles.optionChipTextActive,
                ]}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="New season (e.g. 2027/2028)"
            placeholderTextColor="#64748b"
            value={newSeasonName}
            onChangeText={setNewSeasonName}
          />
          <Pressable
            style={styles.addBtn}
            onPress={async () => {
              if (!newSeasonName.trim()) return;
              await addSeason(newSeasonName.trim());
              setNewSeasonName('');
            }}
          >
            <Text style={styles.addBtnText}>+ Add Season</Text>
          </Pressable>
        </View>
      </View>

      {/* Section 3: Assistant Coach Sharing */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🤝 Share Team with Assistant Coaches</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="assistant.coach@club.com"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            value={coachEmail}
            onChangeText={setCoachEmail}
          />
          <Pressable
            style={styles.addBtn}
            onPress={async () => {
              if (!coachEmail.trim()) return;
              await shareTeam(coachEmail.trim());
              setCoachEmail('');
            }}
          >
            <Text style={styles.addBtnText}>Invite</Text>
          </Pressable>
        </View>

        {(activeTeam.sharedWith || []).map((member, idx) => {
          const emailStr = typeof member === 'string' ? member : member.email;
          return (
            <View key={idx} style={styles.sharedRow}>
              <Text style={styles.sharedEmail}>👤 {emailStr}</Text>
              <Pressable onPress={() => unshareTeam(emailStr)}>
                <Text style={styles.delBtnText}>Remove ✕</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Section 4: Help, Support & Account */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💬 Support & Account</Text>
        <Pressable style={styles.supportBtn} onPress={() => setSupportOpen(true)}>
          <Text style={styles.supportBtnText}>💬 Submit Help / Feedback Ticket</Text>
        </Pressable>
        <Pressable style={styles.signOutFullBtn} onPress={signOut}>
          <Text style={styles.signOutFullText}>
            {currentUser
              ? `Sign Out (${currentUser.email})`
              : 'Exit Demo Mode & Sign In to Your Account'}
          </Text>
        </Pressable>
        {currentUser ? (
          <Pressable style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
            <Text style={styles.deleteAccountText}>🗑️ Permanently Delete Account &amp; All Data</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Create Team Modal */}
      <Modal visible={newTeamOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Team</Text>
            <Text style={styles.label}>Team Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rovers U11 Blues"
              placeholderTextColor="#64748b"
              value={newTeamName}
              onChangeText={setNewTeamName}
            />
            <Text style={styles.label}>Age Group</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. U11"
              placeholderTextColor="#64748b"
              value={newAgeGroup}
              onChangeText={setNewAgeGroup}
            />
            <Text style={styles.label}>Match Format</Text>
            <View style={styles.chipRow}>
              {[5, 7, 9, 11].map((cnt) => (
                <Pressable
                  key={cnt}
                  style={[
                    styles.optionChip,
                    newPitchSize === cnt && styles.optionChipActive,
                  ]}
                  onPress={() => setNewPitchSize(cnt)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      newPitchSize === cnt && styles.optionChipTextActive,
                    ]}
                  >
                    {cnt}v{cnt}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable style={styles.saveBtn} onPress={handleCreateTeam}>
                <Text style={styles.saveBtnText}>Create Team</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setNewTeamOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help & Support Ticket Modal */}
      <Modal visible={supportOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>💬 Help & Feedback</Text>
            <View style={styles.chipRow}>
              {(
                [
                  { id: 'bug', label: '🐛 Bug' },
                  { id: 'feature', label: '💡 Feature' },
                  { id: 'question', label: '❓ Question' },
                ] as const
              ).map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.optionChip,
                    ticketCat === c.id && styles.optionChipActive,
                  ]}
                  onPress={() => setTicketCat(c.id)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      ticketCat === c.id && styles.optionChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Summary</Text>
            <TextInput
              style={styles.input}
              placeholder="Short summary..."
              placeholderTextColor="#64748b"
              value={ticketSummary}
              onChangeText={setTicketSummary}
            />
            <Text style={styles.label}>Details</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              multiline
              placeholder="How can we help?"
              placeholderTextColor="#64748b"
              value={ticketDesc}
              onChangeText={setTicketDesc}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable
                style={styles.saveBtn}
                onPress={async () => {
                  if (!ticketSummary.trim()) return;
                  await submitSupportTicket(ticketCat, ticketSummary, ticketDesc);
                  setTicketSummary('');
                  setTicketDesc('');
                  setSupportOpen(false);
                }}
              >
                <Text style={styles.saveBtnText}>🚀 Submit Ticket</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setSupportOpen(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
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
  sectionCard: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
    gap: 8,
  },
  teamRowActive: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  teamName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  teamSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  activeTag: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeTagText: {
    color: '#022c22',
    fontSize: 10,
    fontWeight: '900',
  },
  switchBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchBtnText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  delBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  delBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  optionChip: {
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  optionChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  optionChipTextActive: {
    color: '#10b981',
    fontWeight: '900',
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
  sharedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  sharedEmail: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  supportBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  supportBtnText: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 13,
  },
  signOutFullBtn: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutFullText: {
    color: '#fca5a5',
    fontWeight: '800',
    fontSize: 13,
  },
  deleteAccountBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteAccountText: {
    color: '#f87171',
    fontWeight: '700',
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
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
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

