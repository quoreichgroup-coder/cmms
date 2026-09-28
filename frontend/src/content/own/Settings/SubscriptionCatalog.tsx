import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import {
  SubscriptionPlan,
  PlanFeature
} from '../../../models/owns/subscriptionPlan';
import api from '../../../utils/api';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { TitleContext } from '../../../contexts/TitleContext';

const features = Object.values(PlanFeature);

function normalizeFeatures(planFeatures: PlanFeature[]) {
  return [...planFeatures].sort().join('|');
}

function SubscriptionCatalog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { setTitle } = useContext(TitleContext);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savingPlanIds, setSavingPlanIds] = useState<number[]>([]);
  const [pendingSavePlan, setPendingSavePlan] = useState<SubscriptionPlan | null>(null);
  const savedPlans = useRef<Record<number, { name: string; features: string }>>(
    {}
  );
  const isSuperAdmin = user?.role?.roleType === 'ROLE_SUPER_ADMIN';

  useEffect(() => {
    setTitle(t('plan_catalog'));
  }, [setTitle, t]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    api
      .get<SubscriptionPlan[]>('subscription-plans')
      .then((result) => {
        if (!active) return;
        const sortedPlans = [...result].sort((first, second) =>
          first.code.localeCompare(second.code)
        );
        savedPlans.current = Object.fromEntries(
          sortedPlans.map((plan) => [
            plan.id,
            {
              name: plan.name,
              features: normalizeFeatures(plan.features ?? [])
            }
          ])
        );
        setPlans(sortedPlans);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  const toggleFeature = (
    planId: number,
    feature: PlanFeature,
    checked: boolean
  ) => {
    setPlans((currentPlans) =>
      currentPlans.map((plan) => {
        if (plan.id !== planId) return plan;
        const currentFeatures = plan.features ?? [];
        return {
          ...plan,
          features: checked
            ? [...new Set([...currentFeatures, feature])]
            : currentFeatures.filter(
                (currentFeature) => currentFeature !== feature
              )
        };
      })
    );
  };

  const savePlan = async (plan: SubscriptionPlan) => {
    setSavingPlanIds((current) => [...current, plan.id]);
    try {
      const updated = await api.patch<SubscriptionPlan>(
        `subscription-plans/${plan.id}`,
        {
          // The current PATCH DTO uses primitive fields, so preserve these values
          // while changing only the module list.
          name: plan.name,
          code: plan.code,
          monthlyCostPerUser: plan.monthlyCostPerUser,
          yearlyCostPerUser: plan.yearlyCostPerUser,
          features: plan.features
        }
      );
      setPlans((currentPlans) =>
        currentPlans.map((currentPlan) =>
          currentPlan.id === updated.id ? updated : currentPlan
        )
      );
      savedPlans.current[updated.id] = {
        name: updated.name,
        features: normalizeFeatures(updated.features ?? [])
      };
      showSnackBar(t('plan_catalog_saved', { plan: updated.name }), 'success');
    } catch {
      showSnackBar(t('plan_catalog_save_error'), 'error');
    } finally {
      setSavingPlanIds((current) => current.filter((id) => id !== plan.id));
    }
  };

  if (!isSuperAdmin) return <Navigate to="/app/work-orders" replace />;

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h3" gutterBottom>
            {t('plan_catalog')}
          </Typography>
          <Typography color="text.secondary">
            {t('plan_catalog_description')}
          </Typography>
        </Box>

        <Alert severity="warning">{t('plan_catalog_impact_warning')}</Alert>
        <Alert severity="info">{t('plan_catalog_price_notice')}</Alert>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : failed ? (
          <Alert severity="error">{t('plan_catalog_load_error')}</Alert>
        ) : (
          <Grid container spacing={2}>
            {plans.map((plan) => {
              const normalized = normalizeFeatures(plan.features ?? []);
              const savedPlan = savedPlans.current[plan.id];
              const dirty =
                !savedPlan ||
                normalized !== savedPlan.features ||
                plan.name !== savedPlan.name;
              const saving = savingPlanIds.includes(plan.id);
              return (
                <Grid item xs={12} md={6} xl={4} key={plan.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="h4">{plan.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {plan.code}
                          </Typography>
                        </Box>
                        <TextField
                          label={t('plan_catalog_name')}
                          size="small"
                          value={plan.name}
                          onChange={(event) =>
                            setPlans((currentPlans) =>
                              currentPlans.map((currentPlan) =>
                                currentPlan.id === plan.id
                                  ? { ...currentPlan, name: event.target.value }
                                  : currentPlan
                              )
                            )
                          }
                        />
                        <Typography variant="body2">
                          {t('plan_catalog_price', {
                            monthly: plan.monthlyCostPerUser,
                            yearly: plan.yearlyCostPerUser
                          })}
                        </Typography>
                        <Typography variant="subtitle2">
                          {t('plan_catalog_included_modules')}
                        </Typography>
                        <FormGroup>
                          {features.map((feature) => (
                            <FormControlLabel
                              key={feature}
                              control={
                                <Checkbox
                                  checked={(plan.features ?? []).includes(
                                    feature
                                  )}
                                  onChange={(event) =>
                                    toggleFeature(
                                      plan.id,
                                      feature,
                                      event.target.checked
                                    )
                                  }
                                />
                              }
                              label={t(`${feature}_feature`)}
                            />
                          ))}
                        </FormGroup>
                        <Button
                          variant="contained"
                          startIcon={
                            saving ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <SaveTwoToneIcon />
                            )
                          }
                          disabled={!dirty || saving}
                          onClick={() => setPendingSavePlan(plan)}
                        >
                          {t('plan_catalog_save')}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Stack>
      <Dialog
        open={pendingSavePlan !== null}
        onClose={() => setPendingSavePlan(null)}
        aria-labelledby="plan-catalog-confirm-title"
      >
        <DialogTitle id="plan-catalog-confirm-title">
          {t('plan_catalog_confirm_title')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t('plan_catalog_confirm_message', {
              plan: pendingSavePlan?.name ?? ''
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSavePlan(null)}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={!pendingSavePlan}
            onClick={() => {
              if (!pendingSavePlan) return;
              const planToSave = pendingSavePlan;
              setPendingSavePlan(null);
              void savePlan(planToSave);
            }}
          >
            {t('plan_catalog_confirm_save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SubscriptionCatalog;
