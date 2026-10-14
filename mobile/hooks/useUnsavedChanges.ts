import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dispatchAfterDiscard } from '../utils/unsavedChanges';

export default function useUnsavedChanges(
  navigation: NativeStackNavigationProp<any>,
  isFormDirty: boolean
) {
  const { t } = useTranslation();
  const isDirtyRef = useRef(isFormDirty);
  isDirtyRef.current = isFormDirty;

  const markClean = useCallback(() => {
    isDirtyRef.current = false;
  }, []);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (!isDirtyRef.current) {
        return;
      }
      e.preventDefault();
      Alert.alert(t('discard_changes'), t('discard_changes_question'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('discard_changes'),
          style: 'destructive',
          onPress: () =>
            dispatchAfterDiscard(isDirtyRef, () =>
              navigation.dispatch(e.data.action)
            )
        }
      ]);
    });
  }, [navigation, t]);

  return markClean;
}
