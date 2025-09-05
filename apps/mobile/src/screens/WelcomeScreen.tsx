import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BorderRadius, Colors, Spacing } from '../constants/theme'
import { AuthStackParamList } from '../navigation/AuthNavigator'

const { width, height } = Dimensions.get('window')

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>()

  return (
    <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🍹</Text>
            </View>
            <Text style={styles.appName}>Happy Bar</Text>
            <Text style={styles.tagline}>Smart Inventory Management</Text>
          </View>

          <View style={styles.featuresSection}>
            <FeatureItem
              icon='📊'
              title='Real-time Analytics'
              description='Track inventory levels and costs instantly'
            />
            <FeatureItem
              icon='📱'
              title='Quick Barcode Scanning'
              description='Count inventory 5x faster with AI'
            />
            <FeatureItem
              icon='🎯'
              title='Smart Predictions'
              description='Never run out with intelligent forecasting'
            />
          </View>

          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                Access your Happy Bar account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: height * 0.08,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: Spacing.md,
  },
  logoEmoji: {
    fontSize: 50,
  },
  appName: {
    fontSize: 40,
    fontWeight: 700,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: 18,
    color: Colors.gray[600],
    fontWeight: 500,
  },
  featuresSection: {
    marginVertical: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white + '95',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: Colors.gray[900],
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  buttonsSection: {
    marginTop: Spacing.lg,
  },
  primaryButton: {
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 700,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 500,
  },
})
