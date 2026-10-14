import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import SignatureScreen, {
  SignatureViewRef
} from 'react-native-signature-canvas';
import { Button, Text } from 'react-native-paper';
import { IHash } from '../../models/form';
import { useTranslation } from 'react-i18next';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';

interface SignaturePadProps {
  label: string;
  onChange: (base64Data: string) => void;
  value?: string;
  disabled?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  onChange,
  value,
  disabled = false
}) => {
  const ref = useRef<SignatureViewRef>(null);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [hasChanged, setHasChanged] = useState(false);

  const handleOK = (signature: string) => {
    if (disabled) return;
    onChange(signature);
    setHasChanged(false);
  };

  const handleBegin = () => {
    if (!disabled) setHasChanged(true);
  };

  const saveSignature = () => {
    if (disabled) return;
    ref.current.readSignature(); // This triggers onOK
  };

  const handleClear = () => {
    if (disabled) return;
    ref.current.clearSignature();
    onChange('');
    setHasChanged(false);
  };

  const style = `.m-signature-pad--footer .button {
    background-color: ${theme.colors.primary};
    color: ${theme.colors.onPrimary};
  }
   body, html {
      height: 100%;
      margin: 0;
      padding: 0;
    }
    .m-signature-pad--body canvas {
      width: 100%;
      height: 100%;
    }`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.signatureContainer,
          {
            borderColor: theme.colors.controlOutline,
            opacity: disabled ? 0.65 : 1
          }
        ]}
      >
        <SignatureScreen
          ref={ref}
          onOK={handleOK}
          onBegin={handleBegin}
          webStyle={style}
          dataURL={value}
          descriptionText={label}
          clearText={t('clear')}
          confirmText={t('save')}
          webviewProps={{
            accessibilityLabel: label,
            pointerEvents: disabled ? 'none' : 'auto'
          }}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          disabled={disabled}
          onPress={handleClear}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {t('clear')}
        </Button>
        {hasChanged && (
          <Button
            mode="contained"
            disabled={disabled}
            onPress={saveSignature}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {t('save')}
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10
  },
  label: {
    fontSize: 16,
    marginBottom: 5
  },
  signatureContainer: {
    height: 200,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.control,
    overflow: 'hidden'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: qpmLayoutTokens.space.sm,
    gap: qpmLayoutTokens.space.sm
  },
  button: {
    minHeight: 48,
    marginLeft: qpmLayoutTokens.space.sm
  },
  buttonContent: { minHeight: 48 }
});

export default SignaturePad;
