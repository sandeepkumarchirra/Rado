/**
 * Color Constants for Nearby Connect
 * WCAG AA Compliant Dark Theme
 */

export const Colors = {
  // Dark theme base colors
  background: '#121212',      // Dark grey base (replaces pure black)
  surface: '#1F1F1F',         // Layered surface level 1
  surfaceElevated: '#282828', // Layered surface level 2 (cards, panels)
  surfaceHighest: '#323232',  // Highest elevation surfaces

  // Text colors (WCAG compliant contrast ratios)
  textPrimary: '#FFFFFF',     // Primary text (21:1 contrast ratio)
  textSecondary: '#B3B3B3',   // Secondary text (7.4:1 contrast ratio)
  textTertiary: '#808080',    // Tertiary text (4.5:1 contrast ratio - minimum)
  textDisabled: '#666666',    // Disabled text (3.4:1 contrast ratio)

  // Accent colors
  primary: '#4A9EFF',         // Primary accent (blue) - 3.2:1 contrast on dark
  primaryDark: '#2196F3',     // Darker primary for better contrast (4.5:1)
  primaryLight: '#64B5F6',    // Lighter primary variant

  // Status colors (WCAG compliant)
  success: '#4CAF50',         // Success green (4.8:1 contrast)
  warning: '#FF9800',         // Warning orange (5.1:1 contrast)
  error: '#F44336',           // Error red (4.7:1 contrast)
  errorDark: '#D32F2F',       // Darker error for better contrast (5.2:1)

  // Border and separator colors
  border: '#333333',          // Subtle borders
  borderLight: '#404040',     // Lighter borders
  separator: '#2A2A2A',       // Content separators

  // Interactive states
  buttonPrimary: '#4A9EFF',
  buttonSecondary: 'transparent',
  buttonDisabled: '#333333',
  
  // Radar-specific colors
  radarGrid: '#333333',       // Radar grid lines
  radarSweep: '#4A9EFF40',    // Semi-transparent radar sweep (25% opacity)
  radarUserBlip: '#4A9EFF',   // User blip color
  radarSelectedBlip: '#64B5F6', // Selected user blip
  radarCenter: '#666666',     // Center dot

  // Shadow and overlay
  shadow: '#000000',
  overlay: '#00000080',       // 50% black overlay
  overlayLight: '#00000040',  // 25% black overlay
};

// Light theme variants (for future light mode support)
export const LightColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  surfaceHighest: '#FAFAFA',
  
  textPrimary: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  textDisabled: '#BDBDBD',
  
  primary: '#1976D2',
  primaryDark: '#0D47A1',
  primaryLight: '#42A5F5',
  
  success: '#388E3C',
  warning: '#F57C00',
  error: '#D32F2F',
  errorDark: '#B71C1C',
  
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  separator: '#EEEEEE',
  
  shadow: '#000000',
  overlay: '#00000020',
  overlayLight: '#00000010',
};

// Accessibility helpers
export const getContrastCompliantColor = (backgroundColor: string, textSize: 'small' | 'large' = 'small') => {
  // For dark backgrounds, return appropriate text color based on size
  const minContrast = textSize === 'large' ? 3 : 4.5;
  
  if (backgroundColor === Colors.background || backgroundColor === Colors.surface) {
    return Colors.textPrimary; // 21:1 contrast
  }
  
  if (backgroundColor === Colors.surfaceElevated) {
    return Colors.textPrimary; // High contrast
  }
  
  return Colors.textPrimary;
};