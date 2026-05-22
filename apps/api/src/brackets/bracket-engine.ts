import type {
  BracketNodeRecord,
  BracketSeedRecord,
  BracketSide,
  MatchRecord,
  StandingRowRecord,
  TournamentTeamRecord,
} from '../common/store.js';

type NodeIdFactory = () => string;

export type BracketNodeDraft = Omit<BracketNodeRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

type BuildInput = {
  bracketId: string;
  versionId: string;
  seeds: BracketSeedRecord[];
  nextNodeId: NodeIdFactory;
  now: string;
};

const orderedSeeds = (seeds: BracketSeedRecord[]) =>
  [...seeds]
    .filter((seed) => !seed.withdrawn)
    .sort((first, second) => first.seedNumber - second.seedNumber);

const nextPowerOfTwo = (value: number) => {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
};

const pairSeeds = (seeds: BracketSeedRecord[]) => {
  const ordered = orderedSeeds(seeds);
  const size = nextPowerOfTwo(ordered.length);
  const slots: Array<BracketSeedRecord | undefined> = Array.from({ length: size });

  ordered.forEach((seed, index) => {
    slots[index] = seed;
  });

  const pairs: Array<[BracketSeedRecord | undefined, BracketSeedRecord | undefined]> = [];
  for (let index = 0; index < size / 2; index += 1) {
    pairs.push([slots[index], slots[size - index - 1]]);
  }

  return pairs;
};

const createNode = (
  input: BuildInput,
  values: Omit<BracketNodeRecord, 'id' | 'bracketId' | 'versionId' | 'createdAt' | 'updatedAt'>,
): BracketNodeRecord => ({
  id: input.nextNodeId(),
  bracketId: input.bracketId,
  versionId: input.versionId,
  createdAt: input.now,
  updatedAt: input.now,
  ...values,
  sourceNodeIds: [...values.sourceNodeIds],
});

export const generateSingleEliminationNodes = (input: BuildInput): BracketNodeRecord[] => {
  const pairs = pairSeeds(input.seeds);
  const nodes: BracketNodeRecord[] = [];
  const firstRoundNodes = pairs.map(([homeSeed, awaySeed], index) =>
    createNode(input, {
      round: 1,
      position: index + 1,
      bracketSide: 'main',
      ...(homeSeed ? { homeTeamId: homeSeed.teamId } : {}),
      ...(awaySeed ? { awayTeamId: awaySeed.teamId } : {}),
      ...(homeSeed ? { homeSeedNumber: homeSeed.seedNumber } : {}),
      ...(awaySeed ? { awaySeedNumber: awaySeed.seedNumber } : {}),
      sourceNodeIds: [],
      status: homeSeed && awaySeed ? 'ready' : 'bye',
      ...(homeSeed && !awaySeed ? { winnerTeamId: homeSeed.teamId } : {}),
      ...(awaySeed && !homeSeed ? { winnerTeamId: awaySeed.teamId } : {}),
    }),
  );

  nodes.push(...firstRoundNodes);

  let previousRound = firstRoundNodes;
  let round = 2;
  while (previousRound.length > 1) {
    const nextRound: BracketNodeRecord[] = [];
    for (let index = 0; index < previousRound.length; index += 2) {
      const firstSource = previousRound[index];
      const secondSource = previousRound[index + 1];
      if (!firstSource || !secondSource) {
        continue;
      }
      const homeTeamId = firstSource.winnerTeamId;
      const awayTeamId = secondSource.winnerTeamId;
      const node = createNode(input, {
        round,
        position: index / 2 + 1,
        bracketSide: 'main',
        ...(homeTeamId ? { homeTeamId } : {}),
        ...(awayTeamId ? { awayTeamId } : {}),
        sourceNodeIds: [firstSource.id, secondSource.id],
        status: homeTeamId && awayTeamId ? 'ready' : 'pending',
      });
      firstSource.nextNodeId = node.id;
      firstSource.updatedAt = input.now;
      secondSource.nextNodeId = node.id;
      secondSource.updatedAt = input.now;
      nextRound.push(node);
    }
    nodes.push(...nextRound);
    previousRound = nextRound;
    round += 1;
  }

  return nodes;
};

export const generateDoubleEliminationNodes = (input: BuildInput): BracketNodeRecord[] => {
  const seedCount = orderedSeeds(input.seeds).length;
  if (seedCount !== 4 && seedCount !== 8) {
    throw new Error('Double elimination currently supports 4 or 8 teams');
  }

  const winners = generateSingleEliminationNodes(input).map((node) => ({
    ...node,
    bracketSide: 'winners' as BracketSide,
  }));
  const firstRoundWinners = winners.filter((node) => node.round === 1);

  if (seedCount === 4) {
    const firstLoserNode = createNode(input, {
      round: 1,
      position: 1,
      bracketSide: 'losers',
      sourceNodeIds: firstRoundWinners.map((node) => node.id),
      status: 'pending',
    });
    for (const node of firstRoundWinners) {
      node.loserNextNodeId = firstLoserNode.id;
      node.updatedAt = input.now;
    }

    const winnersFinal = winners.find((node) => node.round === 2);
    const loserFinal = createNode(input, {
      round: 2,
      position: 1,
      bracketSide: 'losers',
      sourceNodeIds: [firstLoserNode.id, ...(winnersFinal ? [winnersFinal.id] : [])],
      status: 'pending',
    });
    const grandFinal = createNode(input, {
      round: 3,
      position: 1,
      bracketSide: 'winners',
      sourceNodeIds: [...(winnersFinal ? [winnersFinal.id] : []), loserFinal.id],
      status: 'pending',
    });
    const resetFinal = createNode(input, {
      round: 4,
      position: 1,
      bracketSide: 'winners',
      sourceNodeIds: [grandFinal.id],
      status: 'pending',
      isIfNecessary: true,
    });
    firstLoserNode.nextNodeId = loserFinal.id;
    firstLoserNode.updatedAt = input.now;
    loserFinal.nextNodeId = grandFinal.id;
    loserFinal.updatedAt = input.now;
    if (winnersFinal) {
      winnersFinal.nextNodeId = grandFinal.id;
      winnersFinal.loserNextNodeId = loserFinal.id;
      winnersFinal.updatedAt = input.now;
    }
    return [...winners, firstLoserNode, loserFinal, grandFinal, resetFinal];
  }

  const firstLoserNodes = [
    createNode(input, {
      round: 1,
      position: 1,
      bracketSide: 'losers',
      sourceNodeIds: firstRoundWinners.slice(0, 2).map((node) => node.id),
      status: 'pending',
    }),
    createNode(input, {
      round: 1,
      position: 2,
      bracketSide: 'losers',
      sourceNodeIds: firstRoundWinners.slice(2, 4).map((node) => node.id),
      status: 'pending',
    }),
  ];
  const firstLoserNodeA = firstLoserNodes[0];
  const firstLoserNodeB = firstLoserNodes[1];
  if (!firstLoserNodeA || !firstLoserNodeB) {
    throw new Error('Invalid double elimination loser graph');
  }
  for (const [index, node] of firstRoundWinners.entries()) {
    node.loserNextNodeId = index < 2 ? firstLoserNodeA.id : firstLoserNodeB.id;
    node.updatedAt = input.now;
  }

  const winnersSemis = winners.filter((node) => node.round === 2);
  const secondLoserNodes = firstLoserNodes.map((source, index) =>
    createNode(input, {
      round: 2,
      position: index + 1,
      bracketSide: 'losers',
      sourceNodeIds: [source.id, ...(winnersSemis[index] ? [winnersSemis[index].id] : [])],
      status: 'pending',
    }),
  );
  for (const [index, node] of firstLoserNodes.entries()) {
    const targetNode = secondLoserNodes[index];
    if (!targetNode) {
      throw new Error('Invalid double elimination loser graph');
    }
    node.nextNodeId = targetNode.id;
    node.updatedAt = input.now;
  }
  for (const [index, node] of winnersSemis.entries()) {
    const targetNode = secondLoserNodes[index];
    if (!targetNode) {
      throw new Error('Invalid double elimination loser graph');
    }
    node.loserNextNodeId = targetNode.id;
    node.updatedAt = input.now;
  }

  const thirdLoserNode = createNode(input, {
    round: 3,
    position: 1,
    bracketSide: 'losers',
    sourceNodeIds: secondLoserNodes.map((node) => node.id),
    status: 'pending',
  });
  for (const node of secondLoserNodes) {
    node.nextNodeId = thirdLoserNode.id;
    node.updatedAt = input.now;
  }

  const winnersFinal = winners.find((node) => node.round === 3);
  const fourthLoserNode = createNode(input, {
    round: 4,
    position: 1,
    bracketSide: 'losers',
    sourceNodeIds: [thirdLoserNode.id, ...(winnersFinal ? [winnersFinal.id] : [])],
    status: 'pending',
  });
  thirdLoserNode.nextNodeId = fourthLoserNode.id;
  thirdLoserNode.updatedAt = input.now;

  const grandFinal = createNode(input, {
    round: 5,
    position: 1,
    bracketSide: 'winners',
    sourceNodeIds: [...(winnersFinal ? [winnersFinal.id] : []), fourthLoserNode.id],
    status: 'pending',
  });
  const resetFinal = createNode(input, {
    round: 6,
    position: 1,
    bracketSide: 'winners',
    sourceNodeIds: [grandFinal.id],
    status: 'pending',
    isIfNecessary: true,
  });
  fourthLoserNode.nextNodeId = grandFinal.id;
  fourthLoserNode.updatedAt = input.now;
  if (winnersFinal) {
    winnersFinal.nextNodeId = grandFinal.id;
    winnersFinal.loserNextNodeId = fourthLoserNode.id;
    winnersFinal.updatedAt = input.now;
  }

  return [
    ...winners,
    ...firstLoserNodes,
    ...secondLoserNodes,
    thirdLoserNode,
    fourthLoserNode,
    grandFinal,
    resetFinal,
  ];
};

export const generateGroupStageNodes = (input: BuildInput): BracketNodeRecord[] => {
  const byGroup = new Map<string, BracketSeedRecord[]>();
  for (const seed of orderedSeeds(input.seeds)) {
    const key = seed.groupKey ?? 'A';
    byGroup.set(key, [...(byGroup.get(key) ?? []), seed]);
  }

  const nodes: BracketNodeRecord[] = [];
  for (const [, seeds] of [...byGroup.entries()].sort(([first], [second]) =>
    first.localeCompare(second),
  )) {
    for (let homeIndex = 0; homeIndex < seeds.length; homeIndex += 1) {
      for (let awayIndex = homeIndex + 1; awayIndex < seeds.length; awayIndex += 1) {
        const homeSeed = seeds[homeIndex];
        const awaySeed = seeds[awayIndex];
        if (!homeSeed || !awaySeed) {
          continue;
        }
        nodes.push(
          createNode(input, {
            groupKey: homeSeed.groupKey ?? 'A',
            round: 1,
            position: nodes.length + 1,
            bracketSide: 'group',
            homeTeamId: homeSeed.teamId,
            awayTeamId: awaySeed.teamId,
            homeSeedNumber: homeSeed.seedNumber,
            awaySeedNumber: awaySeed.seedNumber,
            sourceNodeIds: [],
            status: 'ready',
          }),
        );
      }
    }
  }

  return nodes;
};

const emptyStandingRow = (
  bracketId: string,
  versionId: string,
  groupKey: string,
  teamId: string,
  updatedAt: string,
): StandingRowRecord => ({
  id: `${versionId}:${groupKey}:${teamId}`,
  bracketId,
  versionId,
  groupKey,
  teamId,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  points: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  disciplinaryPoints: 0,
  headToHeadPoints: 0,
  rank: 0,
  updatedAt,
});

const addResult = (
  row: StandingRowRecord,
  goalsFor: number,
  goalsAgainst: number,
  disciplinaryPoints: number,
) => {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  row.disciplinaryPoints += disciplinaryPoints;
  if (goalsFor > goalsAgainst) {
    row.wins += 1;
    row.points += 3;
  } else if (goalsFor === goalsAgainst) {
    row.draws += 1;
    row.points += 1;
  } else {
    row.losses += 1;
  }
};

export const calculateStandings = (input: {
  bracketId: string;
  versionId: string;
  seeds: BracketSeedRecord[];
  nodes: BracketNodeRecord[];
  matches: MatchRecord[];
  teams: TournamentTeamRecord[];
  now: string;
}): StandingRowRecord[] => {
  const rows = new Map<string, StandingRowRecord>();
  const groupByTeam = new Map<string, string>();
  const teamNames = new Map(input.teams.map((team) => [team.id, team.name]));

  for (const seed of input.seeds) {
    const groupKey = seed.groupKey ?? 'A';
    groupByTeam.set(seed.teamId, groupKey);
    rows.set(
      seed.teamId,
      emptyStandingRow(input.bracketId, input.versionId, groupKey, seed.teamId, input.now),
    );
  }

  const verifiedMatches = new Map(
    input.matches.filter((match) => match.status === 'verified').map((match) => [match.id, match]),
  );
  const headToHead = new Map<string, Map<string, number>>();

  for (const node of input.nodes.filter((candidate) => candidate.bracketSide === 'group')) {
    if (!node.matchId || !node.homeTeamId || !node.awayTeamId) {
      continue;
    }
    const match = verifiedMatches.get(node.matchId);
    if (!match || match.homeScore === undefined || match.awayScore === undefined) {
      continue;
    }
    const homeRow = rows.get(node.homeTeamId);
    const awayRow = rows.get(node.awayTeamId);
    if (!homeRow || !awayRow) {
      continue;
    }

    const homeDiscipline = Number(match.report?.homeDisciplinaryPoints ?? 0);
    const awayDiscipline = Number(match.report?.awayDisciplinaryPoints ?? 0);
    addResult(homeRow, match.homeScore, match.awayScore, homeDiscipline);
    addResult(awayRow, match.awayScore, match.homeScore, awayDiscipline);

    const homeHeadToHeadPoints =
      match.homeScore > match.awayScore ? 3 : match.homeScore === match.awayScore ? 1 : 0;
    const awayHeadToHeadPoints =
      match.awayScore > match.homeScore ? 3 : match.homeScore === match.awayScore ? 1 : 0;
    const homeMap = headToHead.get(node.homeTeamId) ?? new Map<string, number>();
    const awayMap = headToHead.get(node.awayTeamId) ?? new Map<string, number>();
    homeMap.set(node.awayTeamId, (homeMap.get(node.awayTeamId) ?? 0) + homeHeadToHeadPoints);
    awayMap.set(node.homeTeamId, (awayMap.get(node.homeTeamId) ?? 0) + awayHeadToHeadPoints);
    headToHead.set(node.homeTeamId, homeMap);
    headToHead.set(node.awayTeamId, awayMap);
  }

  for (const row of rows.values()) {
    const tiedTeamIds = [...rows.values()]
      .filter(
        (candidate) =>
          candidate.groupKey === row.groupKey &&
          candidate.teamId !== row.teamId &&
          candidate.points === row.points &&
          candidate.goalDifference === row.goalDifference &&
          candidate.goalsFor === row.goalsFor,
      )
      .map((candidate) => candidate.teamId);
    const rowHeadToHead = headToHead.get(row.teamId);
    row.headToHeadPoints = tiedTeamIds.length
      ? tiedTeamIds.reduce((sum, teamId) => sum + (rowHeadToHead?.get(teamId) ?? 0), 0)
      : 0;
  }

  const sorted = [...rows.values()].sort((first, second) => {
    if (first.groupKey !== second.groupKey) {
      return first.groupKey.localeCompare(second.groupKey);
    }
    if (second.points !== first.points) {
      return second.points - first.points;
    }
    if (second.goalDifference !== first.goalDifference) {
      return second.goalDifference - first.goalDifference;
    }
    if (second.goalsFor !== first.goalsFor) {
      return second.goalsFor - first.goalsFor;
    }
    if (second.headToHeadPoints !== first.headToHeadPoints) {
      return second.headToHeadPoints - first.headToHeadPoints;
    }
    if (first.disciplinaryPoints !== second.disciplinaryPoints) {
      return first.disciplinaryPoints - second.disciplinaryPoints;
    }
    return (teamNames.get(first.teamId) ?? first.teamId).localeCompare(
      teamNames.get(second.teamId) ?? second.teamId,
    );
  });

  let currentGroup = '';
  let rank = 0;
  for (const row of sorted) {
    if (row.groupKey !== currentGroup) {
      currentGroup = row.groupKey;
      rank = 1;
    } else {
      rank += 1;
    }
    row.rank = rank;
  }

  return sorted;
};
