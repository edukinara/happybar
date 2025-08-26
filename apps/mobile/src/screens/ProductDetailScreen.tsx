import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../constants/theme';

export function ProductDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Product Detail Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  text: {
    fontSize: Typography.sizes.lg,
    color: Colors.gray[900],
  },
});