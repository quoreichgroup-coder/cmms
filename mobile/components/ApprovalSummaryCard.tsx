import * as React from 'react';
import { View } from 'react-native';
import { Card, Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../custom-theme';

export interface ApprovalSummary {
  policyName: string;
  policyVersion: number;
  status: string;
  currentLevel: number;
  levelCount: number;
  canDecide: boolean;
  estimatedNetAmount?: string;
  currency?: string;
  levels: Array<{
    name: string;
    approverType: 'USER' | 'ROLE';
    approverName: string;
  }>;
}

export default function ApprovalSummaryCard({
  summary,
  amountLabel = 'approval_estimated_material_amount'
}: {
  summary: ApprovalSummary;
  amountLabel?: string;
}) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const current = summary.levels[summary.currentLevel - 1];

  return (
    <Card mode="outlined" style={{ backgroundColor: theme.colors.surface, marginTop: 12 }}>
      <Card.Content style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
              {summary.policyName}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('approval_policy_version', { version: summary.policyVersion })}
            </Text>
          </View>
          <Chip compact>{t(`approval_status_${summary.status.toLowerCase()}`)}</Chip>
        </View>
        {summary.estimatedNetAmount != null && summary.currency && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t(amountLabel)}: {Number(summary.estimatedNetAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })} {summary.currency}
          </Text>
        )}
        {current && (
          <View style={{ gap: 2 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('approval_current_level', {
                current: summary.currentLevel,
                total: summary.levelCount
              })}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {current.name} · {current.approverName}
            </Text>
          </View>
        )}
        {summary.status === 'PENDING' && !summary.canDecide && (
          <Text accessibilityRole="alert" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('approval_waiting_for_another_approver')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}
