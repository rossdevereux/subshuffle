import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Fixture, PlannedInGameSub, Player } from '@subshuffle/shared';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestMatchNotificationPermissions(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

export async function triggerTouchlineHaptic(type: 'swap' | 'whistle' | 'goal' = 'swap'): Promise<void> {
  try {
    if (type === 'whistle') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (type === 'goal') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // Ignore on devices/simulators without haptics
  }
}

export async function cancelScheduledMatchAlarms(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignore
  }
}

/**
 * Schedules pocket-safe OS-level local notifications for:
 * 1. Every unexecuted scheduled substitution window in the active period.
 * 2. The exact end-of-period whistle when the period reaches periodDurationSeconds.
 * These fire reliably even when the coach locks their phone and puts it in their coat pocket.
 */
export async function scheduleLiveMatchAlarms(params: {
  fixture: Fixture;
  activePeriod: number;
  currentElapsedSeconds: number;
  periodDurationSeconds: number;
  plannedSubs: PlannedInGameSub[];
  playerMap: Map<string, Player>;
}): Promise<number> {
  const {
    fixture,
    activePeriod,
    currentElapsedSeconds,
    periodDurationSeconds,
    plannedSubs,
    playerMap,
  } = params;

  await cancelScheduledMatchAlarms();
  const hasPermission = await requestMatchNotificationPermissions();
  if (!hasPermission) return 0;

  let scheduledCount = 0;

  // Group unexecuted subs for the current period by targetMinute
  const windowMap = new Map<number, PlannedInGameSub[]>();
  plannedSubs
    .filter((s) => s.period === activePeriod && !s.executed)
    .forEach((s) => {
      const list = windowMap.get(s.targetMinute) || [];
      list.push(s);
      windowMap.set(s.targetMinute, list);
    });

  for (const [targetMinute, subs] of windowMap.entries()) {
    const targetSeconds = Math.round(targetMinute * 60);
    const secondsUntilWindow = targetSeconds - currentElapsedSeconds;
    if (secondsUntilWindow > 1) {
      const swapDescriptions = subs
        .map((s) => {
          const offName = playerMap.get(s.offPlayerId)?.name || 'Starter';
          const onName = playerMap.get(s.onPlayerId)?.name || 'Sub';
          return `OFF ${offName} ➔ ON ${onName} (${s.position})`;
        })
        .join(' • ');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔄 Sub Window Open (${subs[0]?.matchMinute || targetMinute}') — vs ${fixture.opponent}`,
          body: swapDescriptions,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilWindow,
        },
      });
      scheduledCount++;
    }
  }

  // Schedule period-end referee whistle notification
  const secondsUntilPeriodEnd = periodDurationSeconds - currentElapsedSeconds;
  if (secondsUntilPeriodEnd > 1) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏁 Period ${activePeriod} Complete — Whistle!`,
        body: `Period ${activePeriod} vs ${fixture.opponent} has reached full time. Open SubShuffle to advance to the next period.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilPeriodEnd,
      },
    });
    scheduledCount++;
  }

  return scheduledCount;
}

