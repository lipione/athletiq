import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { athletiqColors } from '@athletiq/ui';
import { matchDayPacketFixture, qrFixtures } from '../offline/match-day-fixtures.js';
import {
  classifyQrPayload,
  createInitialMatchDayState,
  downloadMatchPacket,
  markMutationConflict,
  recordCheckIn,
  recordMatchEvent,
  retryPendingMutations,
  storeToken,
} from '../offline/match-day-store.js';
import type {
  MatchDayState,
  PacketAthlete,
  SyncMutationStatus,
} from '../offline/match-day-types.js';

function createDemoState() {
  return downloadMatchPacket(
    storeToken(createInitialMatchDayState(), {
      token: 'demo-access-token',
      userId: 'usr_referee',
      role: 'referee',
    }),
    matchDayPacketFixture,
  );
}

export function getMatchDaySections(state: MatchDayState) {
  return {
    title: state.activePacket?.title ?? 'No match packet',
    qrStatus: state.scans[0]?.label ?? 'Scanner ready',
    offlineQueueCount: state.mutations.filter((mutation) => mutation.status === 'pending').length,
    conflictCount: state.conflicts.length,
    sessionState: state.session.secureStorage,
  };
}

export function MatchDayApp() {
  const [state, setState] = useState<MatchDayState>(() => createDemoState());
  const summary = useMemo(() => getMatchDaySections(state), [state]);
  const packet = state.activePacket;

  const pending = state.mutations.filter((mutation) => mutation.status === 'pending').length;
  const synced = state.mutations.filter((mutation) => mutation.status === 'synced').length;
  const conflicts = state.mutations.filter((mutation) => mutation.status === 'conflict').length;

  const scanCheckIn = () => {
    setState((current) => recordCheckIn(current, classifyQrPayload(qrFixtures.checkIn)));
  };

  const recordGoal = () => {
    setState((current) =>
      recordMatchEvent(current, {
        mutationId: `m-goal-${current.matchEvents.length + 1}`,
        matchId: matchDayPacketFixture.matchId,
        teamId: matchDayPacketFixture.homeTeam.id,
        athleteId: matchDayPacketFixture.homeTeam.athletes[0]?.id ?? 'athlete-missing',
        type: 'goal',
        minute: 18 + current.matchEvents.length,
      }),
    );
  };

  const createConflict = () => {
    setState((current) => {
      const mutation = current.mutations.find((candidate) => candidate.status === 'pending');
      if (!mutation) {
        return current;
      }

      return markMutationConflict(
        current,
        mutation.mutationId,
        'Server already verified this match',
        {
          status: 'verified',
          homeScore: 2,
          awayScore: 1,
        },
      );
    });
  };

  const retrySync = () => {
    setState((current) => retryPendingMutations(current).state);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text selectable style={styles.eyebrow}>
          ATHLETIQ MATCH DAY
        </Text>
        <Text selectable style={styles.title}>
          {summary.title}
        </Text>
        <Text selectable style={styles.bodyText}>
          Offline-first scoring, QR check-in, and sync review for low-connectivity tournaments.
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <Metric label="Session" value={summary.sessionState} tone="success" />
        <Metric label="Pending" value={String(summary.offlineQueueCount)} tone="warning" />
        <Metric label="Conflicts" value={String(summary.conflictCount)} tone="danger" />
      </View>

      <Panel title="Secure Session">
        <InfoRow label="Role" value={state.session.role ?? 'signed out'} />
        <InfoRow label="Storage" value={`Token ${state.session.secureStorage}`} />
        <InfoRow label="User" value={state.session.userId ?? 'none'} />
      </Panel>

      {packet ? (
        <Panel title="Offline Match Packet">
          <InfoRow label="Match" value={packet.matchId} />
          <InfoRow label="Venue" value={packet.venue} />
          <InfoRow label="Kickoff" value={packet.startsAt} />
          <InfoRow label="Downloaded" value={packet.downloadedAt} />
        </Panel>
      ) : (
        <Panel title="Offline Match Packet">
          <Text selectable style={styles.bodyText}>
            No packet is downloaded on this device.
          </Text>
        </Panel>
      )}

      <Panel title="QR Scan And Check-In">
        <InfoRow label="Last scan" value={summary.qrStatus} />
        <ActionButton label="Scan team check-in QR" onPress={scanCheckIn} />
        <View style={styles.gridTwo}>
          <QrType
            label="Athlete"
            value={classifyQrPayload(qrFixtures.athlete).resourceId ?? 'unknown'}
          />
          <QrType label="Team" value={classifyQrPayload(qrFixtures.team).resourceId ?? 'unknown'} />
          <QrType
            label="Match"
            value={classifyQrPayload(qrFixtures.match).resourceId ?? 'unknown'}
          />
          <QrType
            label="Venue"
            value={classifyQrPayload(qrFixtures.venue).resourceId ?? 'unknown'}
          />
        </View>
      </Panel>

      {packet ? (
        <Panel title="Referee Match Sheet">
          <TeamBlock name={packet.homeTeam.name} athletes={packet.homeTeam.athletes} />
          <TeamBlock name={packet.awayTeam.name} athletes={packet.awayTeam.athletes} />
          <ActionButton label="Record goal offline" onPress={recordGoal} />
          <InfoRow label="Result submission" value="2-1 draft ready for online submit" />
          <InfoRow label="Signature" value="Center referee confirmation pending" />
        </Panel>
      ) : null}

      {packet ? (
        <Panel title="School Workflow">
          <InfoRow
            label="Home check-in"
            value={packet.homeTeam.checkedIn ? 'checked in' : 'not checked in'}
          />
          <InfoRow
            label="Away check-in"
            value={packet.awayTeam.checkedIn ? 'checked in' : 'not checked in'}
          />
          <InfoRow
            label="Document review"
            value={`${packet.homeTeam.athletes.filter((athlete) => athlete.documentStatus !== 'verified').length} action needed`}
          />
        </Panel>
      ) : null}

      <Panel title="Sync Queue">
        <View style={styles.metricsRow}>
          <Metric label="Pending" value={String(pending)} tone="warning" compact />
          <Metric label="Synced" value={String(synced)} tone="success" compact />
          <Metric label="Conflict" value={String(conflicts)} tone="danger" compact />
        </View>
        <ActionButton label="Retry unsynced mutations" onPress={retrySync} />
        <ActionButton label="Simulate conflict" onPress={createConflict} variant="secondary" />
        {state.mutations.map((mutation) => (
          <MutationRow
            key={mutation.mutationId}
            status={mutation.status}
            title={mutation.mutationId}
          />
        ))}
      </Panel>

      <Panel title="Conflict Inbox">
        {state.conflicts.length === 0 ? (
          <Text selectable style={styles.bodyText}>
            No conflicts. Any rejected offline edits will stay here with client and server
            snapshots.
          </Text>
        ) : (
          state.conflicts.map((conflict) => (
            <View key={conflict.mutationId} style={styles.conflictRow}>
              <Text selectable style={styles.rowTitle}>
                {conflict.mutationId}
              </Text>
              <Text selectable style={styles.bodyText}>
                {conflict.reason}
              </Text>
            </View>
          ))
        )}
      </Panel>
    </ScrollView>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text selectable style={styles.panelTitle}>
        {title}
      </Text>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function Metric({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger';
  compact?: boolean;
}) {
  return (
    <View style={[styles.metric, compact ? styles.metricCompact : undefined, toneStyle(tone)]}>
      <Text selectable style={styles.metricLabel}>
        {label}
      </Text>
      <Text selectable style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text selectable style={styles.infoLabel}>
        {label}
      </Text>
      <Text selectable style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, variant === 'secondary' ? styles.buttonSecondary : undefined]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' ? styles.buttonTextSecondary : undefined,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function QrType({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.qrType}>
      <Text selectable style={styles.metricLabel}>
        {label}
      </Text>
      <Text selectable style={styles.qrValue}>
        {value}
      </Text>
    </View>
  );
}

function TeamBlock({ name, athletes }: { name: string; athletes: PacketAthlete[] }) {
  return (
    <View style={styles.teamBlock}>
      <Text selectable style={styles.rowTitle}>
        {name}
      </Text>
      {athletes.map((athlete) => (
        <View key={athlete.id} style={styles.athleteRow}>
          <View>
            <Text selectable style={styles.infoValue}>
              {athlete.fullName}
            </Text>
            <Text selectable style={styles.bodyText}>
              {athlete.athletiqId}
            </Text>
          </View>
          <StatusPill label={athlete.documentStatus} />
        </View>
      ))}
    </View>
  );
}

function MutationRow({ title, status }: { title: string; status: SyncMutationStatus }) {
  return (
    <View style={styles.mutationRow}>
      <Text selectable style={styles.infoValue}>
        {title}
      </Text>
      <StatusPill label={status} />
    </View>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <View style={styles.statusPill}>
      <Text selectable style={styles.statusText}>
        {label}
      </Text>
    </View>
  );
}

function toneStyle(tone: 'success' | 'warning' | 'danger'): ViewStyle {
  if (tone === 'success') {
    return styles.toneSuccess;
  }

  if (tone === 'warning') {
    return styles.toneWarning;
  }

  return styles.toneDanger;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: athletiqColors.background,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 36,
  },
  header: {
    gap: 8,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: athletiqColors.border,
    backgroundColor: athletiqColors.surface,
  },
  eyebrow: {
    color: athletiqColors.green,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: athletiqColors.navy,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  bodyText: {
    color: athletiqColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    gap: 6,
    minHeight: 78,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  metricCompact: {
    minHeight: 62,
  },
  metricLabel: {
    color: athletiqColors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: athletiqColors.navy,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  toneSuccess: {
    backgroundColor: '#ECFDF3',
    borderColor: '#ABEFC6',
  },
  toneWarning: {
    backgroundColor: '#FFFAEB',
    borderColor: '#FEDF89',
  },
  toneDanger: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FECDCA',
  },
  panel: {
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: athletiqColors.border,
    backgroundColor: athletiqColors.surface,
  },
  panelTitle: {
    color: athletiqColors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  panelBody: {
    gap: 10,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    color: athletiqColors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    color: athletiqColors.ink,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  button: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: athletiqColors.green,
    paddingHorizontal: 14,
  },
  buttonSecondary: {
    backgroundColor: athletiqColors.background,
    borderWidth: 1,
    borderColor: athletiqColors.border,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  buttonTextSecondary: {
    color: athletiqColors.navy,
  },
  gridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  qrType: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: athletiqColors.background,
  },
  qrValue: {
    color: athletiqColors.navy,
    fontSize: 13,
    fontWeight: '900',
  },
  teamBlock: {
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: athletiqColors.background,
  },
  rowTitle: {
    color: athletiqColors.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  athleteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: '#EEF8FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    color: '#026AA2',
    fontSize: 12,
    fontWeight: '900',
  },
  mutationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
  },
  conflictRow: {
    gap: 4,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEF3F2',
  },
});
