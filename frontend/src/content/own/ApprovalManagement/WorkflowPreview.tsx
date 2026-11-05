import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Step, StepLabel, Stepper, Typography, useMediaQuery, useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ApprovalPolicy, ApprovalTarget } from '../../../models/owns/procurementApproval';

export default function WorkflowPreview({ policy, targets, open, onClose }: {
  policy: ApprovalPolicy; targets: ApprovalTarget[]; open: boolean; onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm" aria-labelledby="approval-preview-title">
      <DialogTitle id="approval-preview-title">{t('ap_preview')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>{policy.name || t('ap_new')}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>{t(policy.documentType === 'PR' ? 'purchase_requisitions' : 'purchase_orders')}</Typography>
        <Alert severity="info" sx={{ my: 2 }}>
          {t('ap_priority')}: {policy.priority ?? 100} · {(policy.conditions ?? []).length
            ? (policy.conditions ?? []).map(condition => `${t('ap_estimated_amount')} ${t(`ap_operator_${condition.operator.toLowerCase()}`)} ${condition.value} ${condition.currency}`).join(` ${t('and')} `)
            : t('ap_all_documents')}
        </Alert>
        <Stepper orientation="vertical" activeStep={-1}>
          {policy.levels.map((level, index) => (
            <Step key={index} expanded>
              <StepLabel>
                <Typography fontWeight={600}>{level.name || `${t('approval_level')} ${index + 1}`}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {level.required === false
                    ? t('ap_optional_level_skipped')
                    : `${targets.find(target => target.id === level.approverId && target.approverType === level.approverType)?.name || t('ap_choose_approver')}${level.approverType === 'ROLE' ? ` · ${t('ap_one_vote')}` : ''}`}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        {!policy.levels.length && <Alert severity="warning">{t('approval_levels_required')}</Alert>}
        <Box sx={{ mt: 3 }}><Typography variant="body2">{t('ap_final_outcome')}</Typography></Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>{t('close')}</Button></DialogActions>
    </Dialog>
  );
}
