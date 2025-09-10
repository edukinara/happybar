/**
 * Theme-aware Tailwind classes for consistent dark mode support
 * These classes automatically adapt based on the color mode
 */

export const themeClasses = {
  // Card backgrounds - using semantic CSS variables (automatically handle dark mode)
  card: {
    primary:
      'bg-card-primary/90 dark:bg-gray-900/60 backdrop-blur-sm border border-outline-200',
    secondary:
      'bg-card-secondary/90 dark:bg-card-secondary/90 backdrop-blur-sm border border-outline-200',
    solid: 'bg-card-primary dark:bg-card-primary border border-outline-300',
  },

  // Header backgrounds
  header: {
    glass:
      'bg-white/5 dark:bg-black/20 backdrop-blur-xl border-b border-white/10 dark:border-white/5',
    solid:
      'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800',
  },

  // Input fields
  input: {
    base: 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600',
    focus: 'focus:border-primary-500 dark:focus:border-primary-400',
    text: 'text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400',
  },

  // Text colors with automatic dark mode variants
  text: {
    // For use on gradient backgrounds
    onGradient: 'text-white dark:text-gray-200',
    onGradientSubtle: 'text-gray-200 dark:text-gray-300',
    onGradientMuted: 'text-gray-300 dark:text-gray-400',
    // For use on cards/normal backgrounds
    primary: 'text-gray-900 dark:text-gray-200',
    secondary: 'text-gray-700 dark:text-gray-300',
    muted: 'text-gray-600 dark:text-gray-400',
    // Status colors with dark variants
    error: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-300',
    info: 'text-blue-600 dark:text-blue-400',
    // Color variants
    amber: {
      600: 'text-amber-600 dark:text-amber-300',
      700: 'text-amber-700 dark:text-amber-300',
      800: 'text-amber-800 dark:text-amber-200',
    },
    blue: {
      600: 'text-blue-600 dark:text-blue-400',
      700: 'text-blue-700 dark:text-blue-300',
    },
    green: {
      600: 'text-green-600 dark:text-green-400',
      700: 'text-green-700 dark:text-green-300',
    },
    purple: {
      600: 'text-purple-600 dark:text-purple-400',
      700: 'text-purple-700 dark:text-purple-300',
    },
  },

  // Button styles
  button: {
    primary: 'bg-blue-600 dark:bg-blue-500 text-white dark:text-gray-200',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
  },

  // List items
  listItem: {
    base: 'bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700/30',
    hover: 'hover:bg-white/70 dark:hover:bg-gray-800/70',
  },

  // Background utilities
  bg: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    card: 'bg-white dark:bg-gray-800',
    modal: 'bg-white dark:bg-gray-900',
  },
} as const

// Helper function to combine classes
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ')
}
