import React from 'react'
import { View, Text } from 'react-native'

export function TailwindTest() {
  return (
    <View className="flex-1 justify-center items-center bg-red-500">
      <Text className="text-white text-2xl font-bold">Tailwind Test</Text>
      <Text className="text-blue-500 text-lg">If this is styled, Tailwind works!</Text>
      <View className="w-20 h-20 bg-green-500 rounded-lg mt-4" />
    </View>
  )
}