import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { athletiqColors } from '@athletiq/ui';
import { familyCommunicationsFixture } from '../offline/family-communications-fixtures.js';
import {
  deliverableNotices,
  hydrateFamilyCommunicationsState,
  markNoticeRead,
  queueFamilyMessage,
  retainModerationRecord,
  retryFamilyMutations,
  updateFamilyPreference,
} from '../offline/family-communications-store.js';
import type { FamilyCommunicationsState } from '../offline/family-communications-types.js';

export function getFamilyCommunicationSections(state: FamilyCommunicationsState) {
  return {
    athleteCount: state.athletes.length,
    unreadCount: state.notices.filter((notice) => notice.status === 'unread').length,
    deliverableCount: deliverableNotices(state).length,
    moderatedCount: state.threads.filter((thread) => thread.retainedForReview).length,
    pendingMutations: state.mutations.filter((mutation) => mutation.status === 'pending').length,
  };
}

export function FamilyCommunicationsApp() {
  const [state, setState] = useState(() =>
    hydrateFamilyCommunicationsState(familyCommunicationsFixture),
  );
  const summary = useMemo(() => getFamilyCommunicationSections(state), [state]);

  const suppressOptionalPush = () => {
    setState((current) =>
      updateFamilyPreference(current, {
        mutationId: `pref-${current.mutations.length + 1}`,
        channel: 'push',
        category: 'announcement',
        enabled: false,
        locale: 'ne',
      }),
    );
  };

  const sendThreadReply = () => {
    setState((current) =>
      queueFamilyMessage(current, {
        mutationId: `msg-${current.mutations.length + 1}`,
        threadId: current.threads[0]?.id ?? 'thread-missing',
        body: 'We reviewed the update.',
      }),
    );
  };

  const retainModeration = () => {
    setState((current) =>
      retainModerationRecord(current, {
        threadId: current.threads[0]?.id ?? 'thread-missing',
        reason: 'School admin approval required before publishing',
      }),
    );
  };

  const retry = () => {
    setState((current) => retryFamilyMutations(current).state);
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
          ATHLETIQ FAMILY
        </Text>
        <Text selectable style={styles.title}>
          Guardian inbox
        </Text>
        <Text selectable style={styles.bodyText}>
          Offline-ready family notices, bilingual reminders, preferences, and moderated school
          threads.
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <Metric label="Athletes" value={String(summary.athleteCount)} />
        <Metric label="Unread" value={String(summary.unreadCount)} />
        <Metric label="Moderated" value={String(summary.moderatedCount)} />
      </View>

      <Panel title="Linked Athletes">
        {state.athletes.map((athlete) => (
          <InfoRow key={athlete.id} label={athlete.fullName} value={athlete.nextAction} />
        ))}
      </Panel>

      <Panel title="Notices">
        <InfoRow label="Deliverable" value={String(summary.deliverableCount)} />
        {deliverableNotices(state).map((notice) => (
          <Pressable
            accessibilityRole="button"
            key={notice.id}
            onPress={() => setState((current) => markNoticeRead(current, notice.id))}
            style={styles.notice}
          >
            <Text selectable style={styles.rowTitle}>
              {notice.title}
            </Text>
            <Text selectable style={styles.bodyText}>
              {notice.body}
            </Text>
            <StatusPill label={notice.required ? 'required' : notice.channel} />
          </Pressable>
        ))}
      </Panel>

      <Panel title="Preferences">
        <ActionButton label="Suppress optional push notices" onPress={suppressOptionalPush} />
        {state.preferences.map((preference) => (
          <InfoRow
            key={`${preference.channel}-${preference.category}`}
            label={`${preference.channel} ${preference.category}`}
            value={preference.enabled ? `on (${preference.locale})` : `off (${preference.locale})`}
          />
        ))}
      </Panel>

      <Panel title="Moderated Threads">
        {state.threads.map((thread) => (
          <View key={thread.id} style={styles.notice}>
            <Text selectable style={styles.rowTitle}>
              {thread.title}
            </Text>
            <Text selectable style={styles.bodyText}>
              {thread.latestMessage}
            </Text>
            <StatusPill label={thread.status} />
          </View>
        ))}
        <ActionButton label="Queue guardian reply" onPress={sendThreadReply} />
        <ActionButton label="Retain moderation record" onPress={retainModeration} secondary />
      </Panel>

      <Panel title="Sync Queue">
        <InfoRow label="Pending mutations" value={String(summary.pendingMutations)} />
        <InfoRow label="Retry count" value={String(state.sync.retryCount)} />
        <ActionButton label="Retry family sync" onPress={retry} />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
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

function StatusPill({ label }: { label: string }) {
  return (
    <View style={styles.statusPill}>
      <Text selectable style={styles.statusText}>
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, secondary ? styles.buttonSecondary : undefined]}
    >
      <Text style={[styles.buttonText, secondary ? styles.buttonTextSecondary : undefined]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: athletiqColors.background },
  content: { gap: 14, padding: 18, paddingBottom: 36 },
  header: {
    gap: 8,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: athletiqColors.border,
    backgroundColor: athletiqColors.surface,
  },
  eyebrow: { color: athletiqColors.green, fontSize: 12, fontWeight: '800' },
  title: { color: athletiqColors.navy, fontSize: 28, fontWeight: '900', lineHeight: 32 },
  bodyText: { color: athletiqColors.muted, fontSize: 14, lineHeight: 20 },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    gap: 6,
    minHeight: 74,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ABEFC6',
    backgroundColor: '#ECFDF3',
  },
  metricLabel: { color: athletiqColors.muted, fontSize: 12, fontWeight: '800' },
  metricValue: { color: athletiqColors.navy, fontSize: 22, fontWeight: '900' },
  panel: {
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: athletiqColors.border,
    backgroundColor: athletiqColors.surface,
  },
  panelTitle: { color: athletiqColors.navy, fontSize: 18, fontWeight: '900' },
  panelBody: { gap: 10 },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: { color: athletiqColors.muted, fontSize: 13, fontWeight: '800' },
  infoValue: {
    color: athletiqColors.ink,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  notice: { gap: 6, padding: 12, borderRadius: 8, backgroundColor: athletiqColors.background },
  rowTitle: { color: athletiqColors.navy, fontSize: 15, fontWeight: '900' },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { color: '#166534', fontSize: 11, fontWeight: '900' },
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
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  buttonTextSecondary: { color: athletiqColors.navy },
});
