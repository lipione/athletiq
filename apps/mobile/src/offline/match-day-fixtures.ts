import type { MatchPacket } from './match-day-types.js';

export const matchDayPacketFixture: MatchPacket = {
  packetId: 'packet-ksc-final-2026',
  matchId: 'match-ksc-03',
  tournamentId: 'tournament-kathmandu-cup',
  title: 'Kathmandu School Cup U16 Final',
  venue: 'Dasharath Main Pitch',
  startsAt: '2026-06-07T09:45:00.000Z',
  downloadedAt: '2026-06-07T07:30:00.000Z',
  homeTeam: {
    id: 'team-kantipur-u16',
    name: 'Kantipur Falcons',
    schoolName: 'Kantipur International School',
    checkedIn: false,
    athletes: [
      {
        id: 'ath-nima-rai',
        fullName: 'Nima Rai',
        athletiqId: 'ATH-NP-2026-000184',
        documentStatus: 'verified',
        checkedIn: false,
      },
      {
        id: 'ath-maya-shrestha',
        fullName: 'Maya Shrestha',
        athletiqId: 'ATH-NP-2026-000211',
        documentStatus: 'review',
        checkedIn: false,
      },
    ],
  },
  awayTeam: {
    id: 'team-riverside-u16',
    name: 'Riverside Rangers',
    schoolName: 'Riverside Academy',
    checkedIn: false,
    athletes: [
      {
        id: 'ath-riverside-1',
        fullName: 'Aarav Kc',
        athletiqId: 'ATH-NP-2026-000510',
        documentStatus: 'verified',
        checkedIn: false,
      },
    ],
  },
  officials: [
    {
      id: 'official-tamang',
      name: 'Referee Tamang',
      role: 'center_referee',
      accepted: true,
      checkedIn: true,
    },
    {
      id: 'official-sharma',
      name: 'Assistant Sharma',
      role: 'assistant_referee',
      accepted: true,
      checkedIn: false,
    },
  ],
};

export const qrFixtures = {
  athlete: 'athlete:ath-nima-rai',
  team: 'team:team-kantipur-u16',
  match: 'match:match-ksc-03',
  checkIn: 'check-in:team-kantipur-u16',
  venue: 'venue:unit-main-pitch',
} as const;
