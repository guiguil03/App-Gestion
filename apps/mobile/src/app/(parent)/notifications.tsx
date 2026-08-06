// apps/mobile/src/app/(parent)/notifications.tsx
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import { useMyNotificationHistory, type NotificationHistoryEntry } from '@/features/notifications/hooks/useNotificationHistory';

const CHANNEL_ICON: Record<NotificationHistoryEntry['channel'], keyof typeof Ionicons.glyphMap> = {
  SMS: 'chatbox-outline',
  PUSH: 'notifications-outline',
};
const CHANNEL_LABEL: Record<NotificationHistoryEntry['channel'], string> = { SMS: 'SMS', PUSH: 'Notification push' };

export default function ParentNotificationsScreen() {
  const theme = useTheme();
  const { data, isLoading } = useMyNotificationHistory();

  return (
    <Screen>
      <ScreenHeader title="Notifications" />

      {!isLoading && (
        <FlatList
          data={data ?? []}
          keyExtractor={(entry) => entry.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Ionicons name={CHANNEL_ICON[item.channel]} size={20} color={theme.textSecondary} />
              <View style={styles.rowText}>
                <ThemedText type="smallBold">
                  {item.kind ?? 'Notification'}
                  {item.student ? ` — ${item.student.firstName} ${item.student.lastName}` : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {CHANNEL_LABEL[item.channel]} ·{' '}
                  {new Date(item.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </View>
              {item.status === 'FAILED' && (
                <ThemedText type="small" themeColor="danger">
                  Échec
                </ThemedText>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="Aucune notification"
              description="Les SMS et notifications push envoyés pour tes enfants apparaîtront ici."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
