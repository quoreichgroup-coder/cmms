import { useCallback, useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../../../../store';
import { getUsersMini } from '../../../../../slices/user';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import { TitleContext } from '../../../../../contexts/TitleContext';
import api, { getErrorMessage } from '../../../../../utils/api';

interface ApprovalConfig {
  approverUserIds: number[];
  version: number;
  policyManagementEnabled?: boolean;
}

type ApprovalLevel = number | null;

export default function PurchaseRequisitionApproval() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { usersMini: users, loadingGet: loadingUsers } = useSelector((state) => state.users);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { setTitle } = useContext(TitleContext);
  const [approverIds, setApproverIds] = useState<ApprovalLevel[]>([]);
  const [savedApproverIds, setSavedApproverIds] = useState<number[]>([]);
  const [version, setVersion] = useState(0);
  const [policyManagementEnabled, setPolicyManagementEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [validation, setValidation] = useState(false);
  const unassignedCount = approverIds.filter((id) => id === null).length;
  const dirty = approverIds.length !== savedApproverIds.length ||
    approverIds.some((id, index) => id !== savedApproverIds[index]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const config = await api.get<ApprovalConfig>('purchase-requisitions/approval-config');
      const ids = config.approverUserIds || [];
      setApproverIds(ids);
      setSavedApproverIds(ids);
      setVersion(config.version || 0);
      setPolicyManagementEnabled(Boolean(config.policyManagementEnabled));
      setValidation(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTitle(t('pr_approval_workflow'));
  }, [setTitle, t]);

  useEffect(() => {
    if (!users.length) void dispatch(getUsersMini());
  }, [dispatch, users.length]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const save = async () => {
    if (approverIds.some((id) => id === null)) {
      setValidation(true);
      return;
    }
    setSaving(true);
    try {
      const config = await api.put<ApprovalConfig>('purchase-requisitions/approval-config', {
        approverUserIds: approverIds as number[],
        version
      });
      const ids = config.approverUserIds || approverIds as number[];
      setApproverIds(ids);
      setSavedApproverIds(ids);
      setVersion(config.version);
      setValidation(false);
      showSnackBar(t('pr_approval_config_saved'), 'success');
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'pr_approval_config_failed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= approverIds.length) return;
    const next = [...approverIds];
    [next[index], next[target]] = [next[target], next[index]];
    setApproverIds(next);
    setValidation(false);
  };

  const addLevel = () => {
    setApproverIds((current) => [...current, null]);
    setValidation(false);
  };

  const updateLevel = (index: number, value: string) => {
    setApproverIds((current) => current.map((id, i) => i === index ? Number(value) : id));
    setValidation(false);
  };

  const removeLevel = (index: number) => {
    setApproverIds((current) => current.filter((_, i) => i !== index));
    setValidation(false);
  };

  const availableUserCount = users.filter((user) =>
    !approverIds.includes(user.id)
  ).length;
  const canAdd = approverIds.length < 5 && !loadingUsers && availableUserCount > 0;

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, md: 4 },
        maxWidth: 960,
        mx: 'auto',
        '& .MuiButton-root, & .MuiIconButton-root, & .MuiInputBase-root': {
          minHeight: 44
        }
      }}
    >
      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.25 }}>
            {t('pr_approval_workflow')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
            {t('pr_approval_workflow_description')}
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'action.hover', color: 'primary.main', width: 44, height: 44 }}
              >
                <FactCheckOutlinedIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700}>{t('pr_approval_policy_title')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('pr_approval_policy_description')}
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/app/settings/approval-management/policies"
                variant="contained"
                startIcon={<FactCheckOutlinedIcon fontSize="small" />}
                sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, flexShrink: 0 }}
              >
                {t('ap_open_management')}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Alert severity="info" variant="outlined" sx={{ alignItems: 'flex-start' }}>
          {t(policyManagementEnabled ? 'pr_approval_managed_externally' : 'pr_approval_workflow_info')}
        </Alert>

        {loadError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void loadConfig()}>
                {t('retry')}
              </Button>
            }
          >
            {t('error_loading_data')}
          </Alert>
        )}

        {loading ? (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 4 }} role="status">
            <CircularProgress size={22} aria-label={t('loading')} />
            <Typography color="text.secondary">{t('loading')}</Typography>
          </Stack>
        ) : !loadError && !policyManagementEnabled && (
          <>
            <Card variant="outlined">
              <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={1.5}
                  sx={{ mb: approverIds.length ? 2 : 0 }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {t('pr_approval_levels_title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('pr_approval_levels_description')}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color={approverIds.length ? 'primary' : 'default'}
                    label={t('pr_approval_levels_count', { count: approverIds.length, max: 5 })}
                    sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                  />
                </Stack>

                {!approverIds.length ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 2.5, sm: 3.5 },
                      textAlign: 'center',
                      borderStyle: 'dashed',
                      bgcolor: 'action.hover'
                    }}
                  >
                    <Typography fontWeight={700}>{t('pr_approval_empty_title')}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2 }}>
                      {t('pr_approval_empty_description')}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddOutlinedIcon fontSize="small" />}
                      onClick={addLevel}
                      disabled={!canAdd}
                    >
                      {t('add_approval_level')}
                    </Button>
                    {loadingUsers && <CircularProgress size={20} sx={{ mt: 1.5 }} aria-label={t('loading')} />}
                    {!loadingUsers && !users.length && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                        {t('pr_approval_no_users')}
                      </Typography>
                    )}
                  </Paper>
                ) : (
                  <Stack component="ol" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                    {approverIds.map((approverId, index) => {
                      const selectedUser = users.find((user) => user.id === approverId);
                      const options = users.filter((user) =>
                        !approverIds.includes(user.id) || user.id === approverId
                      );
                      const name = selectedUser
                        ? [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ')
                        : t('pr_approval_unassigned');

                      return (
                        <Box component="li" key={index} sx={{ position: 'relative' }}>
                          {index < approverIds.length - 1 && (
                            <Box
                              aria-hidden="true"
                              sx={{
                                position: 'absolute',
                                left: 19,
                                top: 40,
                                bottom: -14,
                                borderLeft: '2px solid',
                                borderColor: 'divider'
                              }}
                            />
                          )}
                          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="stretch">
                            <Avatar
                              aria-label={t('approval_level') + ' ' + (index + 1)}
                              sx={{
                                zIndex: 1,
                                mt: 1,
                                width: 40,
                                height: 40,
                                flexShrink: 0,
                                fontSize: 14,
                                fontWeight: 700,
                                bgcolor: approverId === null ? 'action.selected' : 'primary.main',
                                color: approverId === null ? 'text.secondary' : 'primary.contrastText'
                              }}
                            >
                              {index + 1}
                            </Avatar>
                            <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: { xs: 1.5, sm: 2 } }}>
                              <Stack spacing={1.5}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
                                      {name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {t('pr_approval_level_order', { current: index + 1, total: approverIds.length })}
                                    </Typography>
                                  </Box>
                                  <Stack direction="row" justifyContent="flex-end" sx={{ flexShrink: 0 }}>
                                    <IconButton
                                      aria-label={t('move_up') + ' ' + (index + 1)}
                                      title={t('move_up')}
                                      disabled={index === 0 || saving}
                                      onClick={() => move(index, -1)}
                                    >
                                      <ArrowUpwardIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      aria-label={t('move_down') + ' ' + (index + 1)}
                                      title={t('move_down')}
                                      disabled={index === approverIds.length - 1 || saving}
                                      onClick={() => move(index, 1)}
                                    >
                                      <ArrowDownwardIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      aria-label={t('delete') + ' ' + (index + 1)}
                                      title={t('delete')}
                                      color="error"
                                      disabled={saving}
                                      onClick={() => removeLevel(index)}
                                    >
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                                <TextField
                                  select
                                  fullWidth
                                  label={t('approver')}
                                  value={approverId ?? ''}
                                  onChange={(event) => updateLevel(index, event.target.value)}
                                  disabled={saving || users.length === 0}
                                  error={validation && approverId === null}
                                  helperText={
                                    validation && approverId === null
                                      ? t('pr_approval_select_approver')
                                      : approverId === null
                                        ? t('pr_approval_select_approver_hint')
                                        : undefined
                                  }
                                  SelectProps={{ displayEmpty: true }}
                                >
                                  <MenuItem value="" disabled>
                                    {users.length ? t('pr_approval_select_approver') : t('pr_approval_no_users')}
                                  </MenuItem>
                                  {options.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || '#' + user.id}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Stack>
                            </Paper>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}

                {approverIds.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                      <Button
                        startIcon={<AddOutlinedIcon fontSize="small" />}
                        disabled={!canAdd || saving}
                        onClick={addLevel}
                        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                      >
                        {t('add_approval_level')}
                      </Button>
                      {users.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {t('pr_approval_no_users')}
                        </Typography>
                      )}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700}>{t('pr_approval_config_version', { version })}</Typography>
                    {dirty && (
                      <Typography variant="body2" color="warning.dark" sx={{ mt: 0.5 }} role="status">
                        {t('document_template_unsaved_changes')}
                      </Typography>
                    )}
                    {validation && unassignedCount > 0 && (
                      <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }} role="alert">
                        {t('pr_approval_unassigned_levels', { count: unassignedCount })}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    onClick={() => void save()}
                    disabled={saving || loading || loadError || !dirty}
                    sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 180 }, flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'center' } }}
                  >
                    {saving ? <CircularProgress size={20} color="inherit" aria-label={t('loading')} /> : t('save_changes')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </Box>
  );
}
