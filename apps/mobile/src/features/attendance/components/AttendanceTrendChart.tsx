import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme/theme';
import type { TrendPoint } from '@/features/attendance/hooks/useClassAttendanceTrend';

const CHART_WIDTH = 280;
const CHART_HEIGHT = 90;
const MIN_POINTS_TO_RENDER = 2;

const START_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function AttendanceTrendChart({ trend }: { trend: TrendPoint[] }) {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">Tendance de présence (14 jours)</ThemedText>

      {trend.length < MIN_POINTS_TO_RENDER ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyMessage}>
          Historique insuffisant pour afficher une tendance.
        </ThemedText>
      ) : (
        <>
          <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} style={styles.svg}>
            <Polyline
              points={trend
                .map((point, index) => {
                  const x = (index / (trend.length - 1)) * CHART_WIDTH;
                  const y = CHART_HEIGHT - (point.presenceRate / 100) * CHART_HEIGHT;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke={theme.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle
              cx={CHART_WIDTH}
              cy={CHART_HEIGHT - (trend[trend.length - 1].presenceRate / 100) * CHART_HEIGHT}
              r={4}
              fill={theme.primary}
            />
          </Svg>

          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              {START_DATE_FORMATTER.format(parseDateKey(trend[0].dateKey))}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Aujourd&apos;hui : {Math.round(trend[trend.length - 1].presenceRate)}%
            </ThemedText>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  svg: {
    marginTop: Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyMessage: {
    paddingVertical: Spacing.two + 4,
  },
});
