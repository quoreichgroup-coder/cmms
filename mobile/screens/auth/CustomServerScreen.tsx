import { ScrollView, StyleSheet } from 'react-native';
import * as Yup from 'yup';
import { View } from '../../components/Themed';
import { AuthStackScreenProps } from '../../types';
import { Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useRef, useState } from 'react';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../custom-theme';
import { useDispatch } from '../../store';
import { getApiUrl, normalizeApiUrl } from '../../config';
import { revertAll } from '../../utils/redux';
import { getInstanceConfig } from '../../slices/instanceConfig';

export default function CustomServerScreen({
  navigation
}: AuthStackScreenProps<'CustomServer'>) {
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const theme = useAppTheme();
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [hasCustomUrl, setHasCustomUrl] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const resettingRef = useRef(false);
  const dispatch = useDispatch();

  useEffect(() => {
    // Load the current custom URL if it exists
    const loadCustomUrl = async () => {
      const savedUrl = await AsyncStorage.getItem('customApiUrl');
      if (savedUrl) {
        setCurrentUrl(savedUrl);
        setHasCustomUrl(true);
      } else {
        setCurrentUrl(await getApiUrl());
      }
    };

    loadCustomUrl();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        <Text style={styles.title}>{t('custom_server_title')}</Text>
        <Text style={styles.description}>{t('custom_server_description')}</Text>

        <Formik
          initialValues={{
            serverUrl: currentUrl,
            submit: null
          }}
          enableReinitialize
          validationSchema={Yup.object().shape({
            serverUrl: Yup.string().required(t('required_url'))
          })}
          onSubmit={async (
            values,
            { setStatus, setSubmitting }
          ): Promise<void> => {
            setSubmitting(true);
            try {
              const url = normalizeApiUrl(values.serverUrl, t);
              const controller = new AbortController();
              const deadline = setTimeout(() => controller.abort(), 10000);
              try {
                const response = await fetch(url + 'instance-config', {
                  signal: controller.signal
                });
                if (!response.ok && response.status !== 401)
                  throw new Error(t('server_unreachable'));
                if (response.status !== 401) {
                  const config = await response.json();
                  if (typeof config.ldapEnabled !== 'boolean')
                    throw new Error(t('invalid_cmms_server_address'));
                }
              } finally {
                clearTimeout(deadline);
              }
              const previous = await AsyncStorage.getItem('customApiUrl');
              if (previous !== url) {
                await AsyncStorage.multiRemove([
                  'accessToken',
                  'refreshToken',
                  'companyId'
                ]);
                dispatch(revertAll());
              }
              await AsyncStorage.setItem('customApiUrl', url);
              setCurrentUrl(url);
              setHasCustomUrl(true);
              showSnackBar(t('server_url_saved'), 'success');

              await dispatch(getInstanceConfig());

              // Navigate back to login
              navigation.goBack();
            } catch (error) {
              const message =
                error?.name === 'AbortError'
                  ? t('server_unreachable')
                  : error?.message || t('error_saving_url');
              showSnackBar(message, 'error');
              setStatus({ success: false });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({
            errors,
            handleBlur,
            handleChange,
            handleSubmit,
            isSubmitting,
            touched,
            values
          }) => (
            <View style={{ alignSelf: 'stretch', paddingHorizontal: 30 }}>
              <TextInput
                error={Boolean(touched.serverUrl && errors.serverUrl)}
                label={t('server_url')}
                onBlur={handleBlur('serverUrl')}
                onChangeText={handleChange('serverUrl')}
                value={values.serverUrl}
                mode="outlined"
                style={{ marginBottom: 10 }}
                autoCapitalize="none"
                placeholder="https://your-server-url.com"
              />
              {Boolean(touched.serverUrl && errors.serverUrl) && (
                <HelperText type="error">
                  {errors.serverUrl?.toString()}
                </HelperText>
              )}

              <Button
                color={theme.colors.primary}
                onPress={() => handleSubmit()}
                loading={isSubmitting}
                style={{ marginTop: 20 }}
                disabled={isSubmitting || isResetting}
                mode="contained"
              >
                {t('save')}
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                style={{ marginTop: 10 }}
                disabled={isSubmitting || isResetting}
              >
                {t('cancel')}
              </Button>

              {hasCustomUrl && (
                <Button
                  mode="outlined"
                  onPress={async () => {
                    if (resettingRef.current || isSubmitting) return;
                    resettingRef.current = true;
                    setIsResetting(true);
                    try {
                      await AsyncStorage.removeItem('customApiUrl');
                      setCurrentUrl(await getApiUrl());
                      setHasCustomUrl(false);
                      await dispatch(getInstanceConfig());
                      showSnackBar(t('server_url_reset'), 'success');
                    } catch (error) {
                      showSnackBar(
                        error?.message || t('error_saving_url'),
                        'error'
                      );
                    } finally {
                      resettingRef.current = false;
                      setIsResetting(false);
                    }
                  }}
                  style={{ marginTop: 20 }}
                  color={theme.colors.error}
                  loading={isResetting}
                  disabled={isSubmitting || isResetting}
                >
                  {t('reset_to_default')}
                </Button>
              )}
            </View>
          )}
        </Formik>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 30
  },
  scrollView: {
    marginVertical: 20,
    paddingHorizontal: 10,
    width: '100%'
  }
});
