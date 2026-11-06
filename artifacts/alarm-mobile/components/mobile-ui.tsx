import React, { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export function Screen({
  title,
  subtitle,
  children,
  right,
  titleAccessory,
}: PropsWithChildren<{ title: string; subtitle?: React.ReactNode; right?: React.ReactNode; titleAccessory?: React.ReactNode }>) {
  const colors = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
            {titleAccessory}
          </View>
          {subtitle ? (
            typeof subtitle === 'string'
              ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
              : subtitle
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export function Panel({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const colors = useColors();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function Label({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  const colors = useColors();
  return <Text style={[styles.label, { color: muted ? colors.mutedForeground : colors.foreground }]}>{children}</Text>;
}

export function AppInput({ style, ...props }: TextInputProps) {
  const colors = useColors();
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      selectionColor={colors.primary}
      style={[
        styles.input,
        { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
        style,
      ]}
      {...props}
    />
  );
}

export function ActionButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  disabled?: boolean;
  compact?: boolean;
}) {
  const colors = useColors();
  const palette = {
    primary: { backgroundColor: colors.primary, color: colors.primaryForeground, borderColor: colors.primary },
    secondary: { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border },
    destructive: { backgroundColor: colors.destructive, color: colors.destructiveForeground, borderColor: colors.destructive },
    ghost: { backgroundColor: 'transparent', color: colors.foreground, borderColor: 'transparent' },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        palette,
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}
    >
      {icon ? <Feather name={icon} size={compact ? 16 : 18} color={palette.color} /> : null}
      <Text style={[styles.buttonText, { color: palette.color }, compact && { fontSize: 13 }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
    >
      <Feather name={icon} size={19} color={color ?? colors.foreground} />
    </Pressable>
  );
}

export function ChoiceChips<T extends string | number>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  columns?: number;
}) {
  const colors = useColors();
  return (
    <View style={[styles.chips, columns ? { maxWidth: '100%' } : undefined]}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.background,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={{ color: selected ? colors.primaryForeground : colors.foreground, fontSize: 13, fontWeight: '600' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '600' }}>{title}</Text>
        {detail ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>{detail}</Text> : null}
      </View>
      <View style={[styles.toggleTrack, { backgroundColor: value ? colors.primary : colors.muted }]}>
        <View
          style={[
            styles.toggleThumb,
            { backgroundColor: colors.foreground, transform: [{ translateX: value ? 18 : 2 }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

export function LoadingState({ label = 'Caricamento…' }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors = useColors();
  return (
    <Panel>
      <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: 16 }}>Impossibile caricare i dati</Text>
      <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>{message}</Text>
      <ActionButton title="Riprova" icon="refresh-cw" onPress={onRetry} variant="secondary" />
    </Panel>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 34, gap: 16 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32, letterSpacing: -0.65 },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 18 },
  panel: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 14 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonCompact: { minHeight: 39, paddingHorizontal: 12, borderRadius: 12 },
  buttonText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 14 },
  toggleTrack: { width: 44, height: 27, borderRadius: 20, justifyContent: 'center' },
  toggleThumb: { width: 23, height: 23, borderRadius: 12, elevation: 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 50 },
});
