import { Formation } from './types';

export const BUILT_IN_FORMATIONS: Formation[] = [
  {
    id: '5v5-1-2-1',
    name: '1-2-1',
    pitchPlayerCount: 5,
    positions: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF', label: 'Central Defender', category: 'Defence', x: 50, y: 66 },
      { code: 'LM', label: 'Left Midfield', category: 'Midfield', x: 24, y: 44 },
      { code: 'RM', label: 'Right Midfield', category: 'Midfield', x: 76, y: 44 },
      { code: 'FWD', label: 'Striker', category: 'Attack', x: 50, y: 20 },
    ],
  },
  {
    id: '7v7-2-3-1',
    name: '2-3-1',
    pitchPlayerCount: 7,
    positions: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'LD', label: 'Left Defender', category: 'Defence', x: 30, y: 68 },
      { code: 'RD', label: 'Right Defender', category: 'Defence', x: 70, y: 68 },
      { code: 'LM', label: 'Left Midfield', category: 'Midfield', x: 20, y: 44 },
      { code: 'CM', label: 'Central Midfield', category: 'Midfield', x: 50, y: 46 },
      { code: 'RM', label: 'Right Midfield', category: 'Midfield', x: 80, y: 44 },
      { code: 'FWD', label: 'Striker', category: 'Attack', x: 50, y: 20 },
    ],
  },
  {
    id: '9v9-3-3-2',
    name: '3-3-2',
    pitchPlayerCount: 9,
    positions: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 90 },
      { code: 'LB', label: 'Left Back', category: 'Defence', x: 22, y: 70 },
      { code: 'CB', label: 'Centre Back', category: 'Defence', x: 50, y: 72 },
      { code: 'RB', label: 'Right Back', category: 'Defence', x: 78, y: 70 },
      { code: 'LM', label: 'Left Midfield', category: 'Midfield', x: 22, y: 46 },
      { code: 'CM', label: 'Central Midfield', category: 'Midfield', x: 50, y: 48 },
      { code: 'RM', label: 'Right Midfield', category: 'Midfield', x: 78, y: 46 },
      { code: 'LF', label: 'Left Striker', category: 'Attack', x: 36, y: 20 },
      { code: 'RF', label: 'Right Striker', category: 'Attack', x: 64, y: 20 },
    ],
  },
  {
    id: '11v11-4-3-3',
    name: '4-3-3',
    pitchPlayerCount: 11,
    positions: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 90 },
      { code: 'LB', label: 'Left Back', category: 'Defence', x: 18, y: 70 },
      { code: 'LCB', label: 'Left Centre Back', category: 'Defence', x: 38, y: 72 },
      { code: 'RCB', label: 'Right Centre Back', category: 'Defence', x: 62, y: 72 },
      { code: 'RB', label: 'Right Back', category: 'Defence', x: 82, y: 70 },
      { code: 'LCM', label: 'Left Central Midfield', category: 'Midfield', x: 30, y: 48 },
      { code: 'CDM', label: 'Defensive Midfield', category: 'Midfield', x: 50, y: 52 },
      { code: 'RCM', label: 'Right Central Midfield', category: 'Midfield', x: 70, y: 48 },
      { code: 'LW', label: 'Left Wing', category: 'Attack', x: 22, y: 22 },
      { code: 'ST', label: 'Striker', category: 'Attack', x: 50, y: 18 },
      { code: 'RW', label: 'Right Wing', category: 'Attack', x: 78, y: 22 },
    ],
  },
];

