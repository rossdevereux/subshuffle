import { Fixture, Player, Team, getFixturePotmIds } from './types';

export function formatWhatsAppMatchSummary(
  team: Team | null,
  fixture: Fixture,
  players: Player[]
): string {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const lines: string[] = [];

  lines.push(`⚽ *${team?.name || 'Our Team'} vs ${fixture.opponent}*`);
  lines.push(`📅 ${fixture.date} • Kick-off: ${fixture.kickOffTime || '10:00'} (${fixture.venue})`);
  if (fixture.groundAddress) {
    lines.push(`📍 ${fixture.groundAddress}`);
  }

  if (typeof fixture.homeScore === 'number' && typeof fixture.awayScore === 'number') {
    lines.push(`🏁 *Score:* ${fixture.homeScore} - ${fixture.awayScore}`);
  }

  const potmIds = getFixturePotmIds(fixture);
  const potmNames = potmIds.map((id) => playerMap.get(id)?.name).filter(Boolean);
  if (potmNames.length > 0) {
    lines.push(`⭐ *Player${potmNames.length > 1 ? 's' : ''} of the Match:* ${potmNames.join(', ')}`);
  }

  if (fixture.matchSquad) {
    lines.push('');
    lines.push('*Period Lineups:*');
    fixture.matchSquad.lineupsByPeriod.forEach((lp) => {
      const starters = lp.onPitch
        .map((op) => {
          const p = playerMap.get(op.playerId);
          return p ? `${op.position}: ${p.name}` : null;
        })
        .filter(Boolean)
        .join(', ');
      const bench = lp.bench
        .map((id) => playerMap.get(id)?.name)
        .filter(Boolean)
        .join(', ');
      lines.push(`• *Period ${lp.period}:* ${starters}`);
      if (bench) {
        lines.push(`  _Subs:_ ${bench}`);
      }
    });

    const planned = fixture.matchSquad.plannedInGameSubs || [];
    if (planned.length > 0) {
      lines.push('');
      lines.push('*Scheduled Rolling Substitutions:*');
      planned.forEach((sub) => {
        const offName = playerMap.get(sub.offPlayerId)?.name || 'Player';
        const onName = playerMap.get(sub.onPlayerId)?.name || 'Player';
        lines.push(`⏱️ ${sub.matchMinute}' (P${sub.period}): OFF ${offName} ➔ ON ${onName} (${sub.position})`);
      });
    }
  }

  return lines.join('\n');
}

