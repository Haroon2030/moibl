import { colors, fonts } from './theme';

/** إعدادات الترويسة وشريط التبويب المشتركة بين واجهة الموظف والمدير. */
export const tabScreenOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerShadowVisible: false,
  headerTintColor: '#fff',
  headerTitleStyle: { fontFamily: fonts.heavy, fontSize: 17 },
  headerTitleAlign: 'center' as const,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: '#8b96ad',
  tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
  tabBarStyle: {
    backgroundColor: '#fff',
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#0b1736',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  sceneStyle: { backgroundColor: colors.canvas },
};
