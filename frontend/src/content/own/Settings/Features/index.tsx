import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  EngineeringOutlined,
  GroupsOutlined,
  SettingsOutlined,
  WebAssetOutlined
} from '@mui/icons-material';
import useAuth from '../../../../hooks/useAuth';
import { Formik } from 'formik';
import CustomSwitch from '../../components/form/CustomSwitch';
import { UiConfiguration } from '../../../../models/owns/uiConfiguration';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { useContext, useEffect } from 'react';
import { TitleContext } from '../../../../contexts/TitleContext';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';

interface FeatureModule {
  id: string;
  icon: React.ElementType;
  titleKey: string;
  descriptionKey: string;
  preferencesPath: string;
  preferencesTitleKey?: string;
  toggleKey?: keyof Omit<UiConfiguration, 'id'>;
}

function FeaturesSettings() {
  const { t }: { t: any } = useTranslation();
  const navigate = useNavigate();
  const {
    companySettings,
    patchGeneralPreferences,
    patchUiConfiguration,
    user
  } = useAuth();
  const { setTitle } = useContext(TitleContext);
  const { generalPreferences } = companySettings;
  const { uiConfiguration } = user;

  const featureModules: FeatureModule[] = [
    {
      id: 'work-orders',
      icon: AssignmentOutlinedIcon,
      titleKey: 'work_orders',
      descriptionKey: 'work_orders_settings_description',
      preferencesPath: '/app/settings/features/work-order'
    },
    {
      id: 'requests',
      icon: MoveToInboxOutlinedIcon,
      titleKey: 'requests',
      descriptionKey: 'requests_settings_description',
      preferencesPath: '/app/settings/features/request',
      toggleKey: 'requests'
    },
    {
      id: 'assets',
      icon: Inventory2OutlinedIcon,
      titleKey: 'assets',
      descriptionKey: 'assets_settings_description',
      preferencesPath: '/app/settings/features/asset'
    },
    {
      id: 'locations',
      icon: LocationOnOutlinedIcon,
      titleKey: 'locations',
      descriptionKey: 'locations_settings_description',
      preferencesPath: '/app/settings/features/location',
      toggleKey: 'locations'
    },
    {
      id: 'request-portals',
      icon: WebAssetOutlined,
      titleKey: 'request_portals',
      preferencesTitleKey: 'go_to_request_portals',
      descriptionKey: 'request_portals_settings_description',
      preferencesPath: '/app/settings/features/request-portals'
    },
    {
      id: 'parts-inventory',
      icon: HandymanOutlinedIcon,
      titleKey: 'parts_inventory',
      descriptionKey: 'parts_inventory_settings_description',
      preferencesPath: '/app/settings/features/parts'
    },
    {
      id: 'meters',
      icon: SpeedOutlinedIcon,
      titleKey: 'meters',
      descriptionKey: 'meters_settings_description',
      preferencesPath: '/app/settings/features/meters',
      toggleKey: 'meters'
    },
    {
      id: 'contractors',
      icon: EngineeringOutlined,
      titleKey: 'customers',
      descriptionKey: 'customers_settings_description',
      preferencesPath: '/app/settings/features/contractors',
      toggleKey: 'vendorsAndCustomers'
    },
    {
      id: 'vendors',
      icon: BusinessOutlinedIcon,
      titleKey: 'vendors',
      descriptionKey: 'vendors_settings_description',
      preferencesPath: '/app/settings/features/vendors',
      toggleKey: 'vendorsAndCustomers'
    },
    {
      id: 'workflows',
      icon: AccountTreeOutlinedIcon,
      titleKey: 'workflows',
      descriptionKey: 'workflows_settings_description',
      preferencesPath: '/app/settings/features/workflows'
    }
  ];

  useEffect(() => {
    setTitle(t('features'));
  }, []);

  const handleToggleChange = (
    feature: FeatureModule,
    currentValue: boolean
  ) => {
    if (feature.toggleKey) {
      patchUiConfiguration({
        ...uiConfiguration!,
        [feature.toggleKey]: !currentValue
      });
    }
  };

  const getToggleValue = (feature: FeatureModule): boolean => {
    if (feature.toggleKey) {
      return uiConfiguration?.[feature.toggleKey] || false;
    }
    return false;
  };

  const handleSetPreferences = (path: string) => {
    navigate(path);
  };

  return (
    <Grid item xs={12}>
      <Box p={4}>
        <Formik initialValues={{}} onSubmit={() => {}}>
          {() => (
            <form>
              <Stack spacing={2}>
                {featureModules.map((feature, index) => {
                  const IconComponent = feature.icon;

                  return (
                    <Card
                      key={feature.id}
                      sx={{
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <CardContent>
                        <Box
                          display="flex"
                          flexDirection="row"
                          alignItems="center"
                          justifyContent="space-between"
                          gap={2}
                        >
                          {/* Left side - Icon, Title, Description */}
                          <Box
                            display="flex"
                            alignItems="flex-start"
                            gap={2}
                            flex={1}
                          >
                            <Box
                              sx={{
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <IconComponent fontSize="large" />
                            </Box>
                            <Box flex={1}>
                              <Typography
                                variant="h6"
                                fontWeight="bold"
                                sx={{ mb: 0.5 }}
                              >
                                {t(feature.titleKey)}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {t(feature.descriptionKey)}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Right side - Toggle and/or Button */}
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                          >
                            {feature.toggleKey && (
                              <CustomSwitch
                                title={
                                  getToggleValue(feature)
                                    ? t('enabled')
                                    : t('disabled')
                                }
                                description=""
                                sx={{ m: 0 }}
                                titleSx={{ fontWeight: 'normal' }}
                                name={feature.toggleKey}
                                checked={getToggleValue(feature)}
                                handleChange={() => {
                                  handleToggleChange(
                                    feature,
                                    getToggleValue(feature)
                                  );
                                }}
                              />
                            )}

                            {/* Set preferences button */}
                            <Button
                              variant="outlined"
                              disabled={
                                feature.toggleKey && !getToggleValue(feature)
                              }
                              onClick={() =>
                                handleSetPreferences(feature.preferencesPath)
                              }
                              startIcon={<SettingsOutlined />}
                              sx={{ ml: 2 }}
                            >
                              {t(
                                feature.preferencesTitleKey ?? 'set_preferences'
                              )}
                            </Button>
                          </Stack>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </form>
          )}
        </Formik>
      </Box>
    </Grid>
  );
}

export default FeaturesSettings;
