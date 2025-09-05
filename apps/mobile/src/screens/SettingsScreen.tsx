import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Colors, Spacing } from '../constants/theme'
import { useAuthStore } from '../stores/authStore'

export function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout)

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings Screen</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  text: {
    fontSize: 18,
    color: Colors.gray[900],
    marginBottom: Spacing.lg,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  logoutText: {
    color: Colors.white,
    fontWeight: 600,
  },
})
