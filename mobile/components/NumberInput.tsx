import { useEffect, useState } from 'react';
import { TextInput } from 'react-native-paper';
import { isNumeric } from '../utils/validators';
import { normalizeFormNumberInput } from '../utils/numericInput';

export default function NumberInput(props: {
  style: any;
  mode: 'flat' | 'outlined';
  error: boolean;
  label: string;
  defaultValue: string | number | null | undefined;
  placeholder: string;
  onBlur: (e) => void;
  onChangeText: (value: string) => void;
  disabled: boolean;
  multiline: boolean;
}) {
  const { defaultValue, ...inputProps } = props;
  const [numberInputValue, setNumberInputValue] = useState<string>(
    isNumeric(defaultValue) ? defaultValue?.toString() || '' : ''
  );

  useEffect(() => {
    setNumberInputValue(
      isNumeric(defaultValue)
        ? defaultValue?.toString() || ''
        : defaultValue == null
        ? ''
        : String(defaultValue)
    );
  }, [defaultValue]);

  return (
    <TextInput
      {...inputProps}
      value={numberInputValue}
      keyboardType="decimal-pad"
      onChangeText={(newValue) => {
        const formatted = normalizeFormNumberInput(newValue);
        setNumberInputValue(formatted);
        props.onChangeText(formatted);
      }}
    />
  );
}
