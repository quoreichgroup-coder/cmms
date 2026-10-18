import { Box, styled, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getPriorityLabel } from '../../../utils/formatters';
import { qpmPriorityTokens } from '../../../theme/tokens';

const LabelWrapper = styled(Box)(
  ({ theme }) => `
    font-size: ${theme.typography.pxToRem(10)};
    font-weight: bold;
    text-transform: uppercase;
    border-radius: ${theme.general.borderRadiusSm};
    padding: ${theme.spacing(0.9, 1.5, 0.7)};
    line-height: 1;
    width: fit-content;
  `
);
export default function PriorityWrapper(props: {
  priority: string | null;
  withSuffix?: boolean;
}) {
  const { priority, withSuffix } = props;
  const { t }: { t: any } = useTranslation();
  if (!priority) return null;
  const tokens = qpmPriorityTokens[priority] ?? qpmPriorityTokens.DEFAULT;
  return priority === 'NONE' ? (
    <Typography>{getPriorityLabel(priority, t)}</Typography>
  ) : (
    <LabelWrapper
      sx={{
        backgroundColor: tokens.background,
        color: tokens.foreground
      }}
    >
      {t(priority)} {withSuffix ? t('priority') : null}
    </LabelWrapper>
  );
}
