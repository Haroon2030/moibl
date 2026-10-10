import { Alert, Platform } from 'react-native';

/** تأكيد نعم/لا يعمل على الجوال والويب (Alert لا يدعم الأزرار على الويب). */
export function confirmDialog(title: string, message: string, okLabel = 'تأكيد'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
        { text: okLabel, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return Promise.resolve();
  }
  return new Promise((resolve) => Alert.alert(title, message, [{ text: 'حسنًا', onPress: () => resolve() }], { onDismiss: () => resolve() }));
}
