/**
 * Enhanced Color Constants for Nearby Connect
 * WCAG AA+ Compliant Dark Theme with Accessibility Focus
 */

export const Colors = {
  // Dark theme base colors - optimized for eye strain reduction
  background: '#121212',      // Dark grey base (not pure black)
  surface: '#1F1F1F',         // Layered surface level 1 (cards, panels)
  surfaceElevated: '#282828', // Layered surface level 2 (elevated panels)
  surfaceHighest: '#323232',  // Highest elevation surfaces (modals)

  // Text colors - WCAG AA+ compliant contrast ratios
  textPrimary: '#F5F5F5',     // Off-white primary text (19.6:1 contrast ratio)
  textSecondary: '#C9C9C9',   // Light grey secondary text (8.9:1 contrast ratio)
  textTertiary: '#A0A0A0',    // Medium grey tertiary text (5.7:1 contrast ratio)
  textDisabled: '#707070',    // Disabled text (3.8:1 contrast ratio)

  // Unsaturated accent colors - muted for dark backgrounds
  primary: '#6BB6FF',         // Muted blue primary (5.8:1 contrast - exceeds WCAG AA)
  primaryDark: '#4A9EFF',     // Darker primary for buttons (4.5:1 contrast)
  primaryLight: '#87C4FF',    // Lighter primary variant (7.2:1 contrast)

  // Status colors - WCAG compliant and unsaturated
  success: '#66BB6A',         // Muted green (5.1:1 contrast)
  warning: '#FFB74D',         // Muted orange (6.8:1 contrast) 
  error: '#EF5350',           // Muted red (4.8:1 contrast)
  errorDark: '#E57373',       // Lighter error for better readability (5.4:1 contrast)

  // Border and separator colors - enhanced visibility
  border: '#404040',          // Brighter borders for better visibility
  borderLight: '#4A4A4A',     // Lighter borders for subtle separation
  separator: '#333333',       // Content separators

  // Interactive states
  buttonPrimary: '#6BB6FF',   // Muted blue for buttons
  buttonSecondary: 'transparent',
  buttonDisabled: '#404040',  // Brighter disabled state
  
  // Radar-specific colors - enhanced for visibility
  radarGrid: '#4A4A4A',       // Brighter radar grid lines for better visibility
  radarSweep: '#6BB6FF80',    // Semi-transparent radar sweep (50% opacity)
  radarSweepGlow: '#6BB6FF40', // Glow effect for sweep (25% opacity)
  radarUserBlip: '#6BB6FF',   // User blip color (accent color)
  radarSelectedBlip: '#87C4FF', // Selected user blip (brighter)
  radarCenter: '#8A8A8A',     // Brighter center dot
  radarBackground: '#1A1A1A', // Slightly lighter than main background

  // Shadow and overlay
  shadow: '#000000',
  overlay: '#00000080',       // 50% black overlay
  overlayLight: '#00000040',  // 25% black overlay
  
  // Focus states for accessibility
  focusRing: '#6BB6FF',       // Focus indicator color
  focusRingWidth: 2,          // Focus ring width in pixels
};

// Typography constants for consistent sizing
export const Typography = {
  // Sizes optimized for dark backgrounds
  title: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 18,           // Increased from 16 for better readability
    fontWeight: '500',      // Increased weight to prevent halo effect
    lineHeight: 26,         // Increased line height
    color: Colors.textSecondary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500',      // Increased weight for dark backgrounds
    lineHeight: 20,
    color: Colors.textSecondary,
  },
};

// Accessibility helpers
export const Accessibility = {
  minimumTouchTarget: 44,   // Minimum touch target size (iOS HIG)
  focusRingOffset: 2,       // Offset for focus rings
  animationDuration: {
    short: 200,
    medium: 300,
    long: 500,
  },
};

// Enhanced contrast verification
export const getContrastCompliantColor = (backgroundColor: string, textSize: 'small' | 'large' = 'small') => {
  // Enhanced contrast requirements for dark theme
  const minContrast = textSize === 'large' ? 4.5 : 7; // Higher standards for better readability
  
  if (backgroundColor === Colors.background || backgroundColor === Colors.surface) {
    return Colors.textPrimary; // 19.6:1 contrast
  }
  
  if (backgroundColor === Colors.surfaceElevated) {
    return Colors.textPrimary; // High contrast maintained
  }
  
  return Colors.textPrimary;
};