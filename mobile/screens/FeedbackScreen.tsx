import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Text, Button, TextInput, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useContext, useRef, useState } from 'react';
import api from '../utils/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { createAsyncActionLock } from '../utils/asyncActionLock';
import { qpmLayoutTokens } from '../custom-theme';

type FeedbackNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'Feedback'
>;

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<FeedbackNavProp>();
  const theme = useTheme();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef<ReturnType<typeof createAsyncActionLock> | null>(
    null
  );
  const submitLock =
    submitLockRef.current ?? (submitLockRef.current = createAsyncActionLock());

  const handleSubmit = () => {
    const value = feedback.trim();
    if (!value) return;

    return submitLock(async () => {
      setSubmitting(true);
      try {
        await api.post('reviews/feedback', { value });
        showSnackBar(t('feedback_sent'), 'success');
        navigation.goBack();
      } catch {
        showSnackBar(t('an_error_occured'), 'error');
      } finally {
        setSubmitting(false);
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <Text
          variant="headlineSmall"
          accessibilityRole="header"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          {t('feedback_title')}
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('feedback_description1')}
        </Text>
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={4}
          label={t('feedback_placeholder')}
          value={feedback}
          onChangeText={setFeedback}
          style={styles.input}
          accessibilityLabel={t('feedback_placeholder')}
          editable={!submitting}
        />
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!feedback.trim() || submitting}
          style={styles.button}
          accessibilityRole="button"
          accessibilityState={{
            disabled: !feedback.trim() || submitting,
            busy: submitting
          }}
        >
          {t('send')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  title: {
    marginBottom: 16
  },
  description: {
    textAlign: 'center',
    marginBottom: 32
  },
  input: {
    width: '100%',
    marginBottom: 24
  },
  button: {
    minWidth: 120,
    minHeight: qpmLayoutTokens.touchTarget.prominent
  }
});
