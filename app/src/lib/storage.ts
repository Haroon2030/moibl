import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * تخزين الجلسة: Keychain/Keystore على الجوال عبر expo-secure-store.
 * على الويب (للمعاينة أثناء التطوير فقط) يُستخدم localStorage لأن SecureStore غير مدعوم هناك.
 */
const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* التخزين اختياري: التطبيق يعمل بدونه لكن لن تُحفظ الجلسة */
  }
}

export async function deleteItem(key: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* تجاهل */
  }
}
