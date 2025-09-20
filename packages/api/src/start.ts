#!/usr/bin/env node
/**
 * Production startup script with enhanced error handling for Render
 * This script provides better logging and graceful shutdown handling
 */

import path from 'path'

// Render provides PORT environment variable
const PORT = process.env.PORT || '3001'
const HOST = '0.0.0.0' // Always bind to all interfaces in containers

// Set Node options for better memory management
process.env.NODE_OPTIONS =
  process.env.NODE_OPTIONS || '--max-old-space-size=512'

console.warn('🚀 Starting Happy Bar API Server...')
console.warn(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
console.warn(`🔌 Port: ${PORT}`)
console.warn(`🌐 Host: ${HOST}`)

// Override environment variables for consistent behavior
process.env.PORT = PORT
process.env.HOST = HOST

// Function to handle graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.warn(`\n📦 Received ${signal}, shutting down gracefully...`)
  process.exit(0)
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Start the main application
const indexPath = path.join(__dirname, 'index.js')

console.warn('📂 Starting from:', indexPath)

// Use dynamic import to start the server
import(indexPath).catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})
