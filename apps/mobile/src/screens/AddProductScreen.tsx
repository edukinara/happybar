import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Colors } from '../constants/theme'

export function AddProductScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Add Product Screen</Text>
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
  },
})
