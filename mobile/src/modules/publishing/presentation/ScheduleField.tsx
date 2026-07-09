import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform as RNPlatform, Pressable, Text, View } from 'react-native';

import { formatDateTime } from '@/shared/lib/format';

/**
 * Cross-platform date+time picker for scheduling. iOS renders an inline
 * compact datetime control; Android only supports modal pickers, so a tap
 * walks through date then time.
 */
export function ScheduleField({
  value,
  onChange,
}: {
  /** ISO timestamp, or '' when unset. */
  value: string;
  onChange: (iso: string) => void;
}) {
  // Captured once on mount — render must stay pure (no Date.now() in render).
  const [mountedAt] = useState(() => new Date());
  const current = value ? new Date(value) : new Date(mountedAt.getTime() + 60 * 60 * 1000);

  if (RNPlatform.OS === 'ios') {
    return (
      <View className="items-start">
        <DateTimePicker
          mode="datetime"
          value={current}
          minimumDate={mountedAt}
          onChange={(_event: DateTimePickerEvent, date?: Date) => {
            if (date) onChange(date.toISOString());
          }}
        />
      </View>
    );
  }

  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({
      mode: 'date',
      value: current,
      minimumDate: new Date(), // event handler — impure is fine here
      onChange: (dateEvent, date) => {
        if (dateEvent.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          mode: 'time',
          value: date,
          onChange: (timeEvent, dateTime) => {
            if (timeEvent.type === 'set' && dateTime) onChange(dateTime.toISOString());
          },
        });
      },
    });
  };

  return (
    <Pressable
      onPress={openAndroidPicker}
      className="self-start rounded-xl border border-line bg-surface px-4 py-3 active:bg-sunken"
    >
      <Text className="font-sans text-sm text-content">
        {value ? formatDateTime(value) : 'Pick a date and time'}
      </Text>
    </Pressable>
  );
}
