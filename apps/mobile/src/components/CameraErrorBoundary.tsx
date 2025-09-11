import { Box } from '@/components/ui/box'
import { Center } from '@/components/ui/center'
import { VStack } from '@/components/ui/vstack'
import React from 'react'
import { Alert } from 'react-native'
import { ThemedButton, ThemedText } from '../components/themed'

interface Props {
  children: React.ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class CameraErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Camera Error Boundary caught an error:', error, errorInfo)

    // Alert user about camera issue
    Alert.alert(
      'Camera Error',
      'The camera encountered an issue. Please try again or restart the app.',
      [{ text: 'OK', style: 'default' }]
    )
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box className='flex-1 bg-black'>
          <Center className='flex-1 px-6'>
            <VStack space='lg' className='items-center'>
              <ThemedText
                variant='h3'
                color='onGradient'
                weight='bold'
                align='center'
              >
                Camera Error
              </ThemedText>
              <ThemedText variant='body' color='onGradientMuted' align='center'>
                The camera encountered an issue. This helps prevent your device
                from overheating or crashing.
              </ThemedText>
              <VStack space='md' className='w-full'>
                <ThemedButton
                  variant='primary'
                  size='lg'
                  onPress={this.handleReset}
                >
                  Try Again
                </ThemedButton>
                <ThemedButton
                  variant='outline'
                  size='lg'
                  onPress={() => {
                    // Navigate back to previous screen
                    // This would need navigation context or callback
                    this.props.onReset?.()
                  }}
                >
                  Go Back
                </ThemedButton>
              </VStack>
            </VStack>
          </Center>
        </Box>
      )
    }

    return this.props.children
  }
}
