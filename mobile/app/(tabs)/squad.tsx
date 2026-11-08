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
import { Player, PositionCategory } from '@subshuffle/shared';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';
import { MobileHeaderBar } from '../../src/components/MobileHeaderBar';

const ALL_POSITIONS: PositionCategory[] = ['Goalkeeper', 'Defence', 'Midfield', 'Attack'];

export default function SquadScreen() {
  const {
    activeTeam,
    activeFixture,
    players,
    createPlayer,
    bulkCreatePlayers,
    updatePlayer,
    deletePlayer,
    togglePlayerAvailability,
    sunlightMode,
  } = useMobileMatchday();

  // Add/Edit Player Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [name, setName] = useState('');
  const [squadNumber, setSquadNumber] = useState('');
  const [positions, setPositions] = useState<PositionCategory[]>(['Midfield']);

  // Holiday / Unavailable Dates Modal state
  const [holidayPlayer, setHolidayPlayer] = useState<Player | null>(null);
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // CSV Bulk Import Modal state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  const openAddPlayer = () => {
    setEditingPlayer(null);
    setName('');
    setSquadNumber(String(players.length + 1));
    setPositions(['Midfield']);
    setFormOpen(true);
  };

  const openEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setName(p.name);
    setSquadNumber(p.squadNumber !== undefined ? String(p.squadNumber) : '');
    setPositions(p.preferredPositions.length > 0 ? p.preferredPositions : ['Midfield']);
    setFormOpen(true);
  };

  const togglePos = (pos: PositionCategory) => {
    setPositions((prev) =>
      prev.includes(pos)
        ? prev.length > 1
          ? prev.filter((x) => x !== pos)
          : prev
        : [...prev, pos]
    );
  };

  const handleSavePlayer = async () => {
    if (!name.trim()) return;
    const parsedNum = squadNumber.trim() ? parseInt(squadNumber.trim(), 10) : undefined;
    if (editingPlayer) {
      await updatePlayer({
        ...editingPlayer,
        name: name.trim(),
        squadNumber: isNaN(parsedNum as number) ? undefined : parsedNum,
        preferredPositions: positions,
      });
    } else {
      await createPlayer({
        name: name.trim(),
        squadNumber: isNaN(parsedNum as number) ? undefined : parsedNum,
        preferredPositions: positions,
      });
    }
    setFormOpen(false);
  };

  const handleCsvImport = async () => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: Partial<Player>[] = [];
    for (const line of lines) {
      if (line.toLowerCase().startsWith('name,')) continue;
      const parts = line.split(',').map((s) => s.trim());
      const playerName = parts[0];
      if (!playerName) continue;
      const num = parts[1] ? parseInt(parts[1], 10) : undefined;
      const posRaw = (parts[2] || 'Midfield').toLowerCase();
      const prefs: PositionCategory[] = [];
      if (posRaw.includes('gk') || posRaw.includes('goal')) prefs.push('Goalkeeper');
      if (posRaw.includes('def')) prefs.push('Defence');
      if (posRaw.includes('mid')) prefs.push('Midfield');
      if (posRaw.includes('att') || posRaw.includes('fwd') || posRaw.includes('str'))
        prefs.push('Attack');
      parsed.push({
        name: playerName,
        squadNumber: isNaN(num as number) ? undefined : num,
        preferredPositions: prefs.length > 0 ? prefs : ['Midfield'],
      });
    }
    if (parsed.length > 0) {
      await bulkCreatePlayers(parsed);
      setCsvText('');
      setCsvOpen(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, sunlightMode && styles.containerSunlight]}
      contentContainerStyle={styles.content}
    >
      <MobileHeaderBar />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{activeTeam.name} Squad</Text>
          <Text style={styles.subtitle}>
            {players.length} Registered Players • Tap player to edit
          </Text>
        </View>
        <View style={styles.headerBtns}>
          <Pressable style={styles.csvBtn} onPress={() => setCsvOpen(true)}>
            <Text style={styles.csvBtnText}>📥 CSV Import</Text>
          </Pressable>
          <Pressable style={styles.addBtn} onPress={openAddPlayer}>
            <Text style={styles.addBtnText}>+ Add Player</Text>
          </Pressable>
        </View>
      </View>

      {players.map((player) => {
        const isUnavailableForActive = (player.unavailableDates || []).includes(
          activeFixture.date
        );
        return (
          <View key={player.id} style={styles.card}>
            <Pressable style={styles.cardMain} onPress={() => openEditPlayer(player)}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>#{player.squadNumber ?? '-'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{player.name}</Text>
                <Text style={styles.positions}>{player.preferredPositions.join(' • ')}</Text>
                <Text style={styles.seasonStats}>
                  {player.totalMinutesPlayed || 0}m played • {player.matchesPlayed || 0} matches
                  {(player.unavailableDates || []).length > 0
                    ? ` • 🏖️ ${player.unavailableDates.length} holiday date(s)`
                    : ''}
                </Text>
              </View>
            </Pressable>

            <View style={styles.cardFooter}>
              <Pressable
                style={[
                  styles.availBtn,
                  isUnavailableForActive ? styles.availBtnAbsent : styles.availBtnPresent,
                ]}
                onPress={() => togglePlayerAvailability(player.id, activeFixture.date)}
              >
                <Text style={styles.availBtnText}>
                  {isUnavailableForActive
                    ? `❌ Absent (${activeFixture.date})`
                    : `✅ Available (${activeFixture.date})`}
                </Text>
              </Pressable>
              <Pressable
                style={styles.holidayBtn}
                onPress={() => {
                  setHolidayPlayer(player);
                  setNewHolidayDate(activeFixture.date);
                }}
              >
                <Text style={styles.holidayBtnText}>🏖️ Dates</Text>
              </Pressable>
              <Pressable style={styles.editBtn} onPress={() => openEditPlayer(player)}>
                <Text style={styles.editBtnText}>✏️ Edit</Text>
              </Pressable>
              <Pressable style={styles.delBtn} onPress={() => deletePlayer(player.id)}>
                <Text style={styles.delBtnText}>🗑️</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* Add / Edit Player Modal */}
      <Modal visible={formOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingPlayer ? `Edit ${editingPlayer.name}` : 'Add New Squad Player'}
            </Text>

            <Text style={styles.label}>Player Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Leo Davies"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Squad Number (#)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={squadNumber}
              onChangeText={setSquadNumber}
            />

            <Text style={styles.label}>Preferred Positions (Select 1 or more)</Text>
            <View style={styles.posGrid}>
              {ALL_POSITIONS.map((pos) => {
                const active = positions.includes(pos);
                return (
                  <Pressable
                    key={pos}
                    style={[styles.posChip, active && styles.posChipActive]}
                    onPress={() => togglePos(pos)}
                  >
                    <Text style={[styles.posChipText, active && styles.posChipTextActive]}>
                      {active ? '✓ ' : ''}
                      {pos}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={handleSavePlayer}>
                <Text style={styles.saveBtnText}>
                  {editingPlayer ? 'Save Changes' : 'Add Player'}
                </Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setFormOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Player Holiday / Unavailable Dates Modal */}
      <Modal visible={Boolean(holidayPlayer)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              🏖️ Unavailable Dates — {holidayPlayer?.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="YYYY-MM-DD (e.g. 2026-11-21)"
                placeholderTextColor="#64748b"
                value={newHolidayDate}
                onChangeText={setNewHolidayDate}
              />
              <Pressable
                style={styles.addBtn}
                onPress={async () => {
                  if (!holidayPlayer || !newHolidayDate.trim()) return;
                  await togglePlayerAvailability(holidayPlayer.id, newHolidayDate.trim());
                  const updated = players.find((p) => p.id === holidayPlayer.id);
                  if (updated) {
                    setHolidayPlayer({
                      ...updated,
                      unavailableDates: updated.unavailableDates.includes(newHolidayDate.trim())
                        ? updated.unavailableDates.filter((d) => d !== newHolidayDate.trim())
                        : [...updated.unavailableDates, newHolidayDate.trim()],
                    });
                  }
                }}
              >
                <Text style={styles.addBtnText}>+ Toggle</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 200 }}>
              {(
                players.find((p) => p.id === holidayPlayer?.id)?.unavailableDates || []
              ).map((d) => (
                <View key={d} style={styles.dateRow}>
                  <Text style={styles.dateText}>📅 {d}</Text>
                  <Pressable
                    onPress={() =>
                      holidayPlayer && togglePlayerAvailability(holidayPlayer.id, d)
                    }
                  >
                    <Text style={styles.delBtnText}>Remove ✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setHolidayPlayer(null)}>
              <Text style={styles.cancelBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal visible={csvOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📥 Bulk Import Players (CSV)</Text>
            <Text style={styles.subtitle}>
              Enter one player per line: Name, SquadNumber, Position (e.g. Leo Davies, 1, Goalkeeper)
            </Text>
            <TextInput
              style={[styles.input, { height: 140, textAlignVertical: 'top', marginTop: 10 }]}
              multiline
              placeholder={'Leo Davies, 1, Goalkeeper\nHarry Roberts, 9, Attack'}
              placeholderTextColor="#64748b"
              value={csvText}
              onChangeText={setCsvText}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={handleCsvImport}>
                <Text style={styles.saveBtnText}>Import Players</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setCsvOpen(false)}>
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
  headerBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  csvBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  csvBtnText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 11,
  },
  addBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBadge: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    color: '#38bdf8',
    fontWeight: '900',
    fontSize: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  positions: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  seasonStats: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  availBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  availBtnPresent: {
    backgroundColor: '#064e3b',
  },
  availBtnAbsent: {
    backgroundColor: '#450a0a',
  },
  availBtnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  holidayBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  holidayBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    color: '#38bdf8',
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
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 12,
  },
  posGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  posChip: {
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  posChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  posChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  posChipTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
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
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtnText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#020617',
    borderRadius: 8,
    marginBottom: 6,
  },
  dateText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
});
