import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL } from 'react-native-url-polyfill';
import { DEFAULT_API_URL } from './apiConfig';

export const googleMapsConfig = { apiKey: process.env.GOOGLE_KEY };
export const IS_LOCALHOST = false;

type Translate = (key: string) => string;

export function normalizeApiUrl(value: string, translate?: Translate): string {
  const message = (key: string, fallback: string) =>
    translate ? translate(key) : fallback;
  if (!value?.trim()) {
    throw new Error(
      message(
        'no_cmms_server_configured',
        'No CMMS server is configured. Choose your server.'
      )
    );
  }
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(
      message(
        'invalid_server_url_scheme',
        'Enter a valid server URL starting with http:// or https://.'
      )
    );
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      message(
        'invalid_server_url_without_credentials',
        'Use an http:// or https:// URL without credentials or query parameters.'
      )
    );
  }
  if (
    url.protocol === 'http:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ) {
    throw new Error(
      message(
        'https_required_for_server',
        'Use HTTPS to protect your company password.'
      )
    );
  }
  if (url.pathname === '/' || !url.pathname) url.pathname = '/api';
  return url.toString().replace(/\/+$/, '') + '/';
}

export const getApiUrl = async (): Promise<string> => {
  let customUrl: string | null = null;
  try {
    customUrl = await AsyncStorage.getItem('customApiUrl');
  } catch {
    // Fall back to the configured instance when local storage is unavailable.
  }
  const configuredUrl =
    customUrl || Constants.expoConfig?.extra?.API_URL || DEFAULT_API_URL;
  return normalizeApiUrl(configuredUrl);
};
