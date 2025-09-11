import { Platform } from 'react-native'

export const pos = <T>(forIos: T, forAndroid: T): T =>
  Platform.OS === 'ios' ? forIos : forAndroid
