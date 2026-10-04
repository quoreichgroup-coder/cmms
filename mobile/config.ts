import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL } from 'react-native-url-polyfill';

export const googleMapsConfig = { apiKey: process.env.GOOGLE_KEY };
export const IS_LOCALHOST = false;

export function normalizeApiUrl(value: string): string {
  if (!value?.trim()) throw new Error('Aucun serveur CMMS configuré. Choisissez votre serveur.');
  let url: URL;
  try { url = new URL(value.trim()); } catch {
    throw new Error('Saisissez une URL de serveur valide avec http:// ou https://.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Saisissez une URL http:// ou https:// sans identifiants ni paramètres.');
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Utilisez une adresse HTTPS pour protéger le mot de passe de votre entreprise.');
  }
  if (url.pathname === '/' || !url.pathname) url.pathname = '/api';
  return url.toString().replace(/\/+$/, '') + '/';
}

export const getApiUrl = async (): Promise<string> => {
  let customUrl: string | null = null;
  try { customUrl = await AsyncStorage.getItem('customApiUrl'); } catch { }
  return normalizeApiUrl(customUrl || Constants.expoConfig?.extra?.API_URL);
};
