import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/shared/lib/cn';

export interface FieldProps extends TextInputProps {
  label?: string;
  error?: string | undefined;
  hint?: string;
}

/** Labeled text input with an error line (covers web's Input + Textarea). */
export function Field({ label, error, hint, multiline, className, ...rest }: FieldProps) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="font-sans-medium text-sm text-content-secondary">{label}</Text>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor="#94a3b8"
        className={cn(
          'rounded-xl border bg-surface px-4 py-3 font-sans text-base text-content',
          multiline && 'min-h-[96px]',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
        {...rest}
      />
      {error ? (
        <Text className="font-sans text-sm text-danger">{error}</Text>
      ) : hint ? (
        <Text className="font-sans text-sm text-content-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
