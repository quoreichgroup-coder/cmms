import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useContext, useState } from 'react';
import api from '../utils/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';

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

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    try {
      await api.post('reviews/feedback', { value: feedback.trim() });
      showSnackBar(t('feedback_sent'), 'success');
      navigation.goBack();
    } catch {
      showSnackBar(t('an_error_occured'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
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
          value={feedback}
          onChangeText={setFeedback}
          style={styles.input}
          placeholder={t('feedback_placeholder')}
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
        >
          {t('send')}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1,
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
    minWidth: 120
  }
});
