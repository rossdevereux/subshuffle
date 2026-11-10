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
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SuggestedSubPlan, SubsPerWindowOption } from '@subshuffle/shared';
import { useMobileMatchday } from '../../src/context/MobileMatchdayContext';
import { MobileHeaderBar } from '../../src/components/MobileHeaderBar';

export default function PitchAndBenchScreen() {
  const router = useRouter();
  const {
    activeTeam,
    activeFixture,
    players,
    activePeriod,
    setActivePeriod,
    availableFormations,
    activeFormation,
    changeFormation,
    selectedSwapSource,
    handleTapPlayerNode,
    autoRotateLineup,
    resetMatchSheet,
    setMatchCaptain,
    toggleFixedPlayerPosition,
    togglePlayerInMatchSquad,
    fetchSuggestedSubs,
    applySuggestedPlansToSchedule,
    addCustomScheduledSub,
    removeScheduledSub,
    triggerEarlyDeparture,
    shareFixtureToWhatsApp,
    exportFixturePdf,
    sunlightMode,
  } = useMobileMatchday();

  // Modals state
  const [subSchedulerOpen, setSubSchedulerOpen] = useState(false);
  const [customSubModalOpen, setCustomSubModalOpen] = useState(false);
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const [departureModalOpen, setDepartureModalOpen] = useState(false);

  // Rolling Sub Scheduler state
  const [subInterval, setSubInterval] = useState<number>(
    activeFixture.midPeriodSubIntervalMinutes ||
      activeTeam.settings.defaultSubIntervalMinutes ||
      10
  );
  const [subsPerWindow, setSubsPerWindow] = useState<SubsPerWindowOption>('auto');
  const [everyoneRestsOnce, setEveryoneRestsOnce] = useState<boolean>(true);
  const [suggestedPlans, setSuggestedPlans] = useState<SuggestedSubPlan[]>([]);
  const [loadingSubs, setLoadingSubs] = useState<boolean>(false);

  // Custom sub form state
  const [customSubMinute, setCustomSubMinute] = useState<string>('10');
  const [customOffId, setCustomOffId] = useState<string>('');
  const [customOnId, setCustomOnId] = useState<string>('');

  // Early departure form state
  const [departPlayerId, setDepartPlayerId] = useState<string>('');
  const [departReason, setDepartReason] = useState<'injured' | 'left_early' | 'unwell'>('injured');

  const periodCount =
    activeFixture.matchPeriodCount || activeTeam.settings.matchPeriodCount || 2;
  const lineupsList = activeFixture.matchSquad?.lineupsByPeriod || [];
  const currentLineup =
    lineupsList.find((lp) => lp.period === activePeriod) || lineupsList[0];

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const fixedMap = {
    ...(activeFixture.fixedPlayerPositions || {}),
    ...(activeFixture.matchSquad?.fixedPlayerPositions || {}),
  };
  const selectedIds = activeFixture.matchSquad?.selectedPlayerIds || [];
  const restedPlayers = players.filter((p) => !selectedIds.includes(p.id));
  const plannedSubs = activeFixture.matchSquad?.plannedInGameSubs || [];

  const openSubScheduler = async () => {
    setSubSchedulerOpen(true);
    setLoadingSubs(true);
    try {
      const plans = await fetchSuggestedSubs(subInterval, subsPerWindow, everyoneRestsOnce);
      setSuggestedPlans(plans);
    } finally {
      setLoadingSubs(false);
    }
  };

  const recalculateSuggestedSubs = async (
    nextInterval: number,
    nextCount: SubsPerWindowOption,
    nextEveryone: boolean
  ) => {
    setSubInterval(nextInterval);
    setSubsPerWindow(nextCount);
    setEveryoneRestsOnce(nextEveryone);
    setLoadingSubs(true);
    try {
      const plans = await fetchSuggestedSubs(nextInterval, nextCount, nextEveryone);
      setSuggestedPlans(plans);
    } finally {
      setLoadingSubs(false);
    }
  };

  const selectedPlayerObj = selectedSwapSource
    ? playerMap.get(selectedSwapSource.playerId)
    : undefined;

  return (
    <ScrollView
      style={[styles.container, sunlightMode && styles.containerSunlight]}
      contentContainerStyle={styles.content}
    >
      <MobileHeaderBar />

      {/* Top Matchday Quick Actions */}
      <View style={styles.quickActionRow}>
        <Pressable style={styles.primaryActionBtn} onPress={() => autoRotateLineup()}>
          <Text style={styles.primaryActionText}>⚡ Auto-Rotate</Text>
        </Pressable>
        <Pressable style={styles.secondaryActionBtn} onPress={openSubScheduler}>
          <Text style={styles.secondaryActionText}>
            ⏱️ Sub Scheduler ({plannedSubs.length})
          </Text>
        </Pressable>
        <Pressable
          style={styles.customSubActionBtn}
          onPress={() => setCustomSubModalOpen(true)}
        >
          <Text style={styles.customSubActionText}>➕ Custom Sub</Text>
        </Pressable>
        <Pressable
          style={styles.liveLaunchBtn}
          onPress={() => router.push('/live-match')}
        >
          <Text style={styles.liveLaunchText}>▶️ Live Match</Text>
        </Pressable>
      </View>

      <View style={styles.subActionRow}>
        <Pressable style={styles.chipBtn} onPress={() => setSquadModalOpen(true)}>
          <Text style={styles.chipBtnText}>
            📋 Match Squad ({selectedIds.length}/{players.length})
          </Text>
        </Pressable>
        <Pressable style={styles.chipBtn} onPress={() => setDepartureModalOpen(true)}>
          <Text style={styles.chipBtnText}>🚑 Call-Off / Injury Rebalance</Text>
        </Pressable>
        <Pressable style={styles.chipBtn} onPress={resetMatchSheet}>
          <Text style={styles.chipBtnText}>🗑️ Reset</Text>
        </Pressable>
      </View>

      {/* Formation Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.formationScroll}
        contentContainerStyle={{ gap: 6 }}
      >
        {availableFormations.map((f) => {
          const isCurrent = f.name === activeFormation.name;
          return (
            <Pressable
              key={f.id || f.name}
              style={[styles.formationChip, isCurrent && styles.formationChipActive]}
              onPress={() => changeFormation(f.name)}
            >
              <Text
                style={[styles.formationChipText, isCurrent && styles.formationChipTextActive]}
              >
                {f.name} ({f.pitchPlayerCount}v{f.pitchPlayerCount})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Period Selector Tabs */}
      <View style={styles.periodBar}>
        {Array.from({ length: periodCount }, (_, idx) => idx + 1).map((period) => (
          <Pressable
            key={period}
            onPress={() => setActivePeriod(period)}
            style={[
              styles.periodTab,
              activePeriod === period && styles.periodTabActive,
            ]}
          >
            <Text
              style={[
                styles.periodTabText,
                activePeriod === period && styles.periodTabTextActive,
              ]}
            >
              {periodCount === 2 ? (period === 1 ? '1st Half' : '2nd Half') : `Period ${period}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 2D SVG Tactical Pitch */}
      <View style={[styles.pitchWrapper, sunlightMode && styles.pitchWrapperSunlight]}>
        <Svg viewBox="0 0 100 130" style={styles.pitchSvg}>
          <Rect
            x="2"
            y="2"
            width="96"
            height="126"
            rx="4"
            fill={sunlightMode ? '#064e3b' : '#065f46'}
            stroke="#f8fafc"
            strokeWidth="1.2"
          />
          <Line x1="2" y1="65" x2="98" y2="65" stroke="#f8fafc" strokeWidth="0.9" />
          <Circle cx="50" cy="65" r="12" fill="none" stroke="#f8fafc" strokeWidth="0.9" />
          <Rect x="22" y="2" width="56" height="18" fill="none" stroke="#f8fafc" strokeWidth="0.9" />
          <Rect
            x="22"
            y="110"
            width="56"
            height="18"
            fill="none"
            stroke="#f8fafc"
            strokeWidth="0.9"
          />
        </Svg>

        {/* Floating Non-Layout Shift Selected Player Toolbar */}
        {selectedSwapSource && selectedPlayerObj && (
          <View style={styles.floatingSelectedToolbar}>
            <View style={styles.floatingToolbarHeader}>
              <Text style={styles.selectedToolbarTitle} numberOfLines={1}>
                ⚡ {selectedPlayerObj.name} selected: tap another player to swap
              </Text>
              <Pressable
                onPress={() => handleTapPlayerNode({ type: selectedSwapSource.type, playerId: selectedSwapSource.playerId })}
                style={styles.floatingCloseBtn}
              >
                <Text style={styles.floatingCloseText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.selectedToolbarBtns}>
              <Pressable
                style={styles.toolbarBtn}
                onPress={() =>
                  toggleFixedPlayerPosition(
                    selectedSwapSource.playerId,
                    selectedSwapSource.position
                  )
                }
              >
                <Text style={styles.toolbarBtnText}>
                  {fixedMap[selectedSwapSource.playerId]
                    ? `🔓 Unlock (${fixedMap[selectedSwapSource.playerId]})`
                    : `🔒 Lock (${selectedSwapSource.position || 'GK'})`}
                </Text>
              </Pressable>
              <Pressable
                style={styles.toolbarBtn}
                onPress={() => setMatchCaptain(selectedSwapSource.playerId)}
              >
                <Text style={styles.toolbarBtnText}>
                  {activeFixture.captainId === selectedSwapSource.playerId
                    ? '© Clear Captain'
                    : '© Make Captain'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {(() => {
          const formationPositions = activeFormation.positions || [];
          const onPitchList = currentLineup?.onPitch || [];
          const matchedPlayerIds = new Set<string>();
          const directAssignments = formationPositions.map((pos) => {
            const match = onPitchList.find(
              (op) => op.position === pos.code && !matchedPlayerIds.has(op.playerId)
            );
            if (match?.playerId) {
              matchedPlayerIds.add(match.playerId);
            }
            return match;
          });
          const remainingOnPitch = onPitchList.filter(
            (op) => op.playerId && !matchedPlayerIds.has(op.playerId)
          );
          let fallbackIdx = 0;

          return formationPositions.map((pos, idx) => {
            const assignment =
              directAssignments[idx] ||
              (fallbackIdx < remainingOnPitch.length
                ? remainingOnPitch[fallbackIdx++]
                : undefined);
            const player = assignment ? playerMap.get(assignment.playerId) : undefined;
            const isSelected =
              selectedSwapSource?.type === 'pitch' &&
              selectedSwapSource.playerId === assignment?.playerId;
            const isLocked = assignment?.playerId && Boolean(fixedMap[assignment.playerId]);
            const isCaptain =
              assignment?.playerId && activeFixture.captainId === assignment.playerId;

            return (
              <Pressable
                key={pos.code}
                onPress={() => {
                  if (assignment?.playerId) {
                    handleTapPlayerNode({
                      type: 'pitch',
                      playerId: assignment.playerId,
                      position: assignment.position || pos.code,
                    });
                  }
                }}
                style={[
                  styles.playerNode,
                  {
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                  },
                  isSelected && styles.playerNodeSelected,
                ]}
              >
                <View
                  style={[
                    styles.positionBadge,
                    pos.code === 'GK' && styles.gkBadge,
                  ]}
                >
                  <Text style={styles.positionBadgeText}>
                    {isLocked ? '🔒 ' : ''}
                    {pos.code}
                    {isCaptain ? ' ©' : ''}
                  </Text>
                </View>
                <Text style={styles.playerNodeName} numberOfLines={1}>
                  {player
                    ? `${player.squadNumber ? `#${player.squadNumber} ` : ''}${(
                        player.name || 'Player'
                      ).split(' ')[0]}`
                    : 'Empty'}
                </Text>
              </Pressable>
            );
          });
        })()}
      </View>

      {/* Bench Players Card */}
      <View style={[styles.benchCard, sunlightMode && styles.cardSunlight]}>
        <View style={styles.benchHeader}>
          <Text style={[styles.benchTitle, sunlightMode && styles.textSunlight]}>
            Substitutes Bench (Period {activePeriod})
          </Text>
          <Text style={styles.benchHint}>Tap player to swap onto pitch</Text>
        </View>
        <View style={styles.benchGrid}>
          {(currentLineup?.bench || []).map((benchId) => {
            const player = playerMap.get(benchId);
            const isSelected =
              selectedSwapSource?.type === 'bench' && selectedSwapSource.playerId === benchId;
            return (
              <Pressable
                key={benchId}
                onPress={() => handleTapPlayerNode({ type: 'bench', playerId: benchId })}
                style={[styles.benchPill, isSelected && styles.benchPillSelected]}
              >
                <Text style={styles.benchSquadNum}>#{player?.squadNumber ?? '-'}</Text>
                <Text style={styles.benchPlayerName}>{player?.name || benchId}</Text>
              </Pressable>
            );
          })}
          {(currentLineup?.bench || []).length === 0 && (
            <Text style={styles.emptySubText}>
              No substitutes on bench for Period {activePeriod}. Tap "⚡ Auto-Rotate" to generate lineups.
            </Text>
          )}
        </View>
      </View>

      {/* Rested / Not in Matchday Squad */}
      {restedPlayers.length > 0 && (
        <View style={[styles.benchCard, sunlightMode && styles.cardSunlight]}>
          <Text style={[styles.benchTitle, { marginBottom: 8 }]}>
            Rested / Unavailable ({restedPlayers.length})
          </Text>
          <View style={styles.benchGrid}>
            {restedPlayers.map((rp) => (
              <Pressable
                key={rp.id}
                style={styles.restedPill}
                onPress={() => togglePlayerInMatchSquad(rp.id)}
              >
                <Text style={styles.restedPillText}>+ {rp.name} (Add to Squad)</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Share & Export Bar */}
      <View style={styles.exportRow}>
        <Pressable style={styles.whatsappBtn} onPress={shareFixtureToWhatsApp}>
          <Text style={styles.exportBtnText}>💬 Share to WhatsApp</Text>
        </Pressable>
        <Pressable style={styles.pdfBtn} onPress={exportFixturePdf}>
          <Text style={styles.exportBtnText}>📄 Export Match PDF</Text>
        </Pressable>
      </View>

      {/* MODAL 1: Rolling Substitution Scheduler */}
      <Modal visible={subSchedulerOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⏱️ Rolling Substitution Scheduler</Text>
            <ScrollView style={{ maxHeight: 460 }}>
              <Text style={styles.sectionLabel}>Sub Interval (Minutes)</Text>
              <View style={styles.optionRow}>
                {[5, 8, 10, 12, 15].map((min) => (
                  <Pressable
                    key={min}
                    style={[styles.optionChip, subInterval === min && styles.optionChipActive]}
                    onPress={() =>
                      recalculateSuggestedSubs(min, subsPerWindow, everyoneRestsOnce)
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        subInterval === min && styles.optionChipTextActive,
                      ]}
                    >
                      Every {min}m
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Players Swapped per Window</Text>
              <View style={styles.optionRow}>
                {(['auto', 1, 2, 3, 'all_bench'] as SubsPerWindowOption[]).map((opt) => (
                  <Pressable
                    key={String(opt)}
                    style={[
                      styles.optionChip,
                      subsPerWindow === opt && styles.optionChipActive,
                    ]}
                    onPress={() =>
                      recalculateSuggestedSubs(subInterval, opt, everyoneRestsOnce)
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        subsPerWindow === opt && styles.optionChipTextActive,
                      ]}
                    >
                      {opt === 'auto'
                        ? 'Auto'
                        : opt === 'all_bench'
                        ? 'All Bench'
                        : `${opt} Sub${Number(opt) > 1 ? 's' : ''}`}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.toggleRow, everyoneRestsOnce && styles.toggleRowActive]}
                onPress={() =>
                  recalculateSuggestedSubs(subInterval, subsPerWindow, !everyoneRestsOnce)
                }
              >
                <Text style={styles.toggleRowText}>
                  {everyoneRestsOnce ? '✅' : '⬜'} Enforce "Everyone Rests At Least Once"
                </Text>
              </Pressable>

              <Text style={styles.sectionLabel}>
                Suggested Multi-Window Plan ({suggestedPlans.length} windows)
              </Text>
              {loadingSubs ? (
                <Text style={styles.emptySubText}>Calculating optimal rolling substitutions...</Text>
              ) : (
                suggestedPlans.map((plan, idx) => (
                  <View key={idx} style={styles.planWindowCard}>
                    <Text style={styles.planWindowHeader}>
                      Period {plan.period} • Minute {plan.periodMinute}&apos; (Match {plan.minuteMark}&apos;)
                    </Text>
                    {(plan.swaps || []).map((sw, sIdx) => (
                      <Text key={sIdx} style={styles.planSwapRow}>
                        🟢 ON: {sw.onPlayerName} ⇄ 🔴 OFF: {sw.offPlayerName} ({sw.position})
                      </Text>
                    ))}
                  </View>
                ))
              )}

              <Pressable
                style={styles.applyPlanBtn}
                onPress={async () => {
                  await applySuggestedPlansToSchedule(suggestedPlans);
                  setSubSchedulerOpen(false);
                }}
              >
                <Text style={styles.applyPlanBtnText}>
                  ✅ Apply & Sync Plan to Live Match ({suggestedPlans.reduce((a, p) => a + (p.swaps || []).length, 0)} subs)
                </Text>
              </Pressable>

              {/* Existing Scheduled Subs & Custom Builder */}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                Active Scheduled Subs ({plannedSubs.length})
              </Text>
              {plannedSubs.map((ps) => (
                <View key={ps.id} style={styles.activeSubRow}>
                  <Text style={styles.activeSubText}>
                    P{ps.period} {ps.targetMinute}&apos;: {playerMap.get(ps.onPlayerId)?.name || 'ON'}{' '}
                    ⇄ {playerMap.get(ps.offPlayerId)?.name || 'OFF'} ({ps.position})
                  </Text>
                  <Pressable onPress={() => removeScheduledSub(ps.id)}>
                    <Text style={styles.removeSubBtn}>✕</Text>
                  </Pressable>
                </View>
              ))}

              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                + Add Custom Scheduled Sub (Period {activePeriod})
              </Text>
              <View style={styles.customSubBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Minute in Period (e.g. 12)"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={customSubMinute}
                  onChangeText={setCustomSubMinute}
                />
                <Text style={styles.smallHint}>Select Player Coming OFF (On Pitch):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {(currentLineup?.onPitch || []).map((op) => {
                    const p = playerMap.get(op.playerId);
                    return (
                      <Pressable
                        key={op.playerId}
                        style={[
                          styles.miniPlayerChip,
                          customOffId === op.playerId && styles.miniPlayerChipOff,
                        ]}
                        onPress={() => setCustomOffId(op.playerId)}
                      >
                        <Text style={styles.miniPlayerChipText}>
                          {p?.name || op.playerId} ({op.position})
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={styles.smallHint}>Select Player Coming ON (Bench):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {(currentLineup?.bench || []).map((bid) => {
                    const p = playerMap.get(bid);
                    return (
                      <Pressable
                        key={bid}
                        style={[
                          styles.miniPlayerChip,
                          customOnId === bid && styles.miniPlayerChipOn,
                        ]}
                        onPress={() => setCustomOnId(bid)}
                      >
                        <Text style={styles.miniPlayerChipText}>{p?.name || bid}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable
                  style={styles.addCustomSubBtn}
                  onPress={async () => {
                    if (!customOffId || !customOnId) return;
                    const min = parseInt(customSubMinute, 10) || 10;
                    const offSlot = currentLineup?.onPitch.find(
                      (op) => op.playerId === customOffId
                    );
                    const periodDur =
                      activeFixture.periodDurationMinutes ||
                      activeTeam.settings.periodDurationMinutes ||
                      25;
                    await addCustomScheduledSub({
                      period: activePeriod,
                      targetMinute: min,
                      matchMinute: (activePeriod - 1) * periodDur + min,
                      offPlayerId: customOffId,
                      onPlayerId: customOnId,
                      position: offSlot?.position || 'CM',
                      executed: false,
                    });
                    setCustomOffId('');
                    setCustomOnId('');
                  }}
                >
                  <Text style={styles.addCustomSubBtnText}>+ Add Custom Sub</Text>
                </Pressable>
              </View>
            </ScrollView>

            <Pressable style={styles.modalCloseBtn} onPress={() => setSubSchedulerOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL: Direct Custom Substitution Builder */}
      <Modal visible={customSubModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>➕ Create Custom Substitution</Text>
            <Text style={styles.smallHint}>
              Schedule a specific player swap for Period {activePeriod} at an exact minute mark:
            </Text>

            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Minute in Period</Text>
            <TextInput
              style={styles.input}
              placeholder="Minute (e.g. 10)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={customSubMinute}
              onChangeText={setCustomSubMinute}
            />

            <Text style={styles.smallHint}>Select Player Coming OFF (Currently on pitch):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {(currentLineup?.onPitch || []).map((op) => {
                const p = playerMap.get(op.playerId);
                const isSelected = customOffId === op.playerId;
                return (
                  <Pressable
                    key={op.playerId}
                    style={[
                      styles.miniPlayerChip,
                      isSelected && styles.miniPlayerChipOff,
                    ]}
                    onPress={() => setCustomOffId(op.playerId)}
                  >
                    <Text style={styles.miniPlayerChipText}>
                      🔴 #{p?.squadNumber ?? '-'} {p?.name || op.playerId} ({op.position})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.smallHint}>Select Player Coming ON (Substitutes bench):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {(currentLineup?.bench || []).map((bid) => {
                const p = playerMap.get(bid);
                const isSelected = customOnId === bid;
                return (
                  <Pressable
                    key={bid}
                    style={[
                      styles.miniPlayerChip,
                      isSelected && styles.miniPlayerChipOn,
                    ]}
                    onPress={() => setCustomOnId(bid)}
                  >
                    <Text style={styles.miniPlayerChipText}>
                      🟢 #{p?.squadNumber ?? '-'} {p?.name || bid}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={[
                styles.applyPlanBtn,
                (!customOffId || !customOnId) && { opacity: 0.5 },
              ]}
              disabled={!customOffId || !customOnId}
              onPress={async () => {
                if (!customOffId || !customOnId) return;
                const min = parseInt(customSubMinute, 10) || 10;
                const offSlot = currentLineup?.onPitch.find(
                  (op) => op.playerId === customOffId
                );
                const periodDur =
                  activeFixture.periodDurationMinutes ||
                  activeTeam.settings.periodDurationMinutes ||
                  25;
                await addCustomScheduledSub({
                  period: activePeriod,
                  targetMinute: min,
                  matchMinute: (activePeriod - 1) * periodDur + min,
                  offPlayerId: customOffId,
                  onPlayerId: customOnId,
                  position: offSlot?.position || 'CM',
                  executed: false,
                });
                setCustomOffId('');
                setCustomOnId('');
                setCustomSubModalOpen(false);
              }}
            >
              <Text style={styles.applyPlanBtnText}>
                ✅ Add to Match Schedule ({customSubMinute}&apos;)
              </Text>
            </Pressable>

            <Pressable style={styles.modalCloseBtn} onPress={() => setCustomSubModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Matchday Squad Selector */}
      <Modal visible={squadModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              📋 Select Matchday Squad ({selectedIds.length} Selected)
            </Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {players.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const isUnavailable = (p.unavailableDates || []).includes(activeFixture.date);
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.squadSelectRow, isSelected && styles.squadSelectRowActive]}
                    onPress={() => togglePlayerInMatchSquad(p.id)}
                  >
                    <View>
                      <Text style={styles.squadSelectName}>
                        #{p.squadNumber ?? '-'} {p.name}
                      </Text>
                      <Text style={styles.squadSelectSub}>
                        {(p.preferredPositions || ['Midfield']).join(', ')}
                        {isUnavailable ? ' • ⚠️ Marked Unavailable for this date' : ''}
                      </Text>
                    </View>
                    <Text style={styles.squadSelectCheck}>{isSelected ? '✅ In Squad' : '⬜ Rested'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable
                style={[styles.applyPlanBtn, { flex: 1, marginTop: 0 }]}
                onPress={async () => {
                  setSquadModalOpen(false);
                  await autoRotateLineup(selectedIds);
                }}
              >
                <Text style={styles.applyPlanBtnText}>⚡ Save & Auto-Rotate</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCloseBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => setSquadModalOpen(false)}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Late Call-Off / Early Departure Rebalancer */}
      <Modal visible={departureModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚑 Early Departure / Call-Off Rebalancer</Text>
            <Text style={styles.smallHint}>
              Select the player who called off or left injured in Period {activePeriod}. SubShuffle
              will automatically rebalance the remaining periods.
            </Text>
            <View style={[styles.optionRow, { marginTop: 10 }]}>
              {(['injured', 'left_early', 'unwell'] as const).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.optionChip, departReason === r && styles.optionChipActive]}
                  onPress={() => setDepartReason(r)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      departReason === r && styles.optionChipTextActive,
                    ]}
                  >
                    {r === 'injured' ? '🚑 Injured' : r === 'left_early' ? '🚗 Left Early' : '🤒 Unwell'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ScrollView style={{ maxHeight: 260, marginTop: 8 }}>
              {players
                .filter((p) => selectedIds.includes(p.id))
                .map((p) => (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.squadSelectRow,
                      departPlayerId === p.id && styles.squadSelectRowActive,
                    ]}
                    onPress={() => setDepartPlayerId(p.id)}
                  >
                    <Text style={styles.squadSelectName}>
                      #{p.squadNumber ?? '-'} {p.name}
                    </Text>
                    {departPlayerId === p.id && <Text style={styles.squadSelectCheck}>✓</Text>}
                  </Pressable>
                ))}
            </ScrollView>
            <Pressable
              style={styles.applyPlanBtn}
              onPress={async () => {
                if (!departPlayerId) return;
                await triggerEarlyDeparture(departPlayerId, activePeriod, departReason);
                setDepartPlayerId('');
                setDepartureModalOpen(false);
              }}
            >
              <Text style={styles.applyPlanBtnText}>⚡ Rebalance Remaining Periods</Text>
            </Pressable>
            <Pressable style={styles.modalCloseBtn} onPress={() => setDepartureModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
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
  quickActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 12,
  },
  secondaryActionBtn: {
    flex: 1.1,
    backgroundColor: '#1e293b',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryActionText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 12,
  },
  customSubActionBtn: {
    flex: 1.1,
    backgroundColor: '#3b82f6',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  customSubActionText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  liveLaunchBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  liveLaunchText: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 12,
  },
  subActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  chipBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  chipBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  formationScroll: {
    marginBottom: 10,
  },
  formationChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  formationChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  formationChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  formationChipTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  periodBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  periodTab: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  periodTabActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  periodTabText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },
  periodTabTextActive: {
    color: '#022c22',
    fontWeight: '900',
  },
  selectedToolbar: {
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  selectedToolbarTitle: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  selectedToolbarBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  floatingSelectedToolbar: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 99,
    elevation: 10,
    backgroundColor: 'rgba(69, 26, 3, 0.95)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  floatingToolbarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  floatingCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#78350f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCloseText: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '900',
  },
  toolbarBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolbarBtnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  pitchWrapper: {
    width: '100%',
    aspectRatio: 100 / 130,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  pitchWrapperSunlight: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pitchSvg: {
    width: '100%',
    height: '100%',
  },
  playerNode: {
    position: 'absolute',
    transform: [{ translateX: -38 }, { translateY: -24 }],
    width: 76,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
  },
  playerNodeSelected: {
    borderColor: '#fbbf24',
    backgroundColor: '#78350f',
    transform: [{ translateX: -38 }, { translateY: -24 }, { scale: 1.08 }],
  },
  positionBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginBottom: 2,
  },
  gkBadge: {
    backgroundColor: '#eab308',
  },
  positionBadgeText: {
    color: '#f8fafc',
    fontSize: 9,
    fontWeight: '900',
  },
  playerNodeName: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  benchCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  cardSunlight: {
    backgroundColor: '#000000',
    borderColor: '#f8fafc',
  },
  benchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  benchTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  benchHint: {
    color: '#64748b',
    fontSize: 11,
  },
  benchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  benchPillSelected: {
    borderColor: '#fbbf24',
    backgroundColor: '#78350f',
  },
  benchSquadNum: {
    color: '#38bdf8',
    fontWeight: '900',
    fontSize: 12,
    marginRight: 6,
  },
  benchPlayerName: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 13,
  },
  restedPill: {
    backgroundColor: '#020617',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  restedPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  emptySubText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  pdfBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  textSunlight: {
    color: '#ffffff',
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
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  optionChip: {
    backgroundColor: '#020617',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  optionChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  optionChipTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  toggleRow: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 6,
  },
  toggleRowActive: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  toggleRowText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  planWindowCard: {
    backgroundColor: '#020617',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  planWindowHeader: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  planSwapRow: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  applyPlanBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  applyPlanBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 13,
  },
  activeSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  activeSubText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  removeSubBtn: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 14,
    paddingHorizontal: 6,
  },
  customSubBox: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 6,
  },
  smallHint: {
    color: '#94a3b8',
    fontSize: 11,
    marginVertical: 2,
  },
  miniPlayerChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  miniPlayerChipOff: {
    backgroundColor: '#7f1d1d',
  },
  miniPlayerChipOn: {
    backgroundColor: '#065f46',
  },
  miniPlayerChipText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  addCustomSubBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  addCustomSubBtnText: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 12,
  },
  squadSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 11,
    borderRadius: 10,
    backgroundColor: '#020617',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  squadSelectRowActive: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  squadSelectName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  squadSelectSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  squadSelectCheck: {
    color: '#10b981',
    fontSize: 12,
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
