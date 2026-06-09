import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  KeyboardTypeOptions,
} from 'react-native';
import { colors, radius } from '../../lib/theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  error?: string | null;
  style?: ViewStyle;
}

export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  secureTextEntry,
  keyboardType,
  editable = true,
  error,
  style,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.slate[300]}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: colors.slate[500],
    lineHeight: 11,
  },
  input: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink[900],
    backgroundColor: colors.slate[0],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFocused: {
    borderColor: colors.brand[600],
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.coral[600],
  },
  inputDisabled: {
    backgroundColor: colors.slate[100],
    color: colors.slate[400],
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    color: colors.coral[600],
    marginTop: -2,
  },
});
