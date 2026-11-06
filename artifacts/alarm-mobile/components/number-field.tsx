import React from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function NumberField(props: TextInputProps & { width?: number }) {
  const colors = useColors();
  return (
    <TextInput
      keyboardType="number-pad"
      maxLength={props.maxLength ?? 2}
      selectTextOnFocus
      placeholderTextColor={colors.mutedForeground}
      {...props}
      style={[
        {
          color: colors.foreground,
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 13,
          minWidth: props.width ?? 58,
          height: 46,
          paddingHorizontal: 8,
          textAlign: 'center',
          fontFamily: 'Inter_600SemiBold',
          fontSize: 16,
        },
        props.style,
      ]}
    />
  );
}
