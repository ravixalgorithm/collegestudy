import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

export type StatusBarStyle = 'light' | 'dark' | 'auto';

interface UseStatusBarOptions {
  style?: StatusBarStyle;
  backgroundColor?: string;
  animated?: boolean;
}

/**
 * Hook for managing status bar appearance across different screens
 *
 * @param options Configuration options for the status bar
 */
export function useStatusBar(options: UseStatusBarOptions = {}) {
  const {
    style = 'dark',
    backgroundColor = '#ffffff',
    animated = true
  } = options;

  useEffect(() => {
    // The StatusBar component will handle the styling
    // This hook can be extended for additional status bar logic
  }, [style, backgroundColor, animated]);

  return {
    StatusBarComponent: () => (
      <StatusBar
        style={style}
        backgroundColor={backgroundColor}
        animated={animated}
      />
    ),
    style,
    backgroundColor
  };
}

/**
 * Predefined status bar configurations for common screen types
 */
export const statusBarConfigs = {
  // Light backgrounds (most app screens)
  light: {
    style: 'dark' as StatusBarStyle,
    backgroundColor: '#ffffff'
  },

  // Dark backgrounds (modals, overlays)
  dark: {
    style: 'light' as StatusBarStyle,
    backgroundColor: '#000000'
  },

  // Primary color backgrounds
  primary: {
    style: 'light' as StatusBarStyle,
    backgroundColor: '#3B82F6'
  },

  // Transparent for overlay screens
  transparent: {
    style: 'dark' as StatusBarStyle,
    backgroundColor: 'transparent'
  }
};

/**
 * Quick access hooks for common configurations
 */
export const useStatusBarLight = () => useStatusBar(statusBarConfigs.light);
export const useStatusBarDark = () => useStatusBar(statusBarConfigs.dark);
export const useStatusBarPrimary = () => useStatusBar(statusBarConfigs.primary);
export const useStatusBarTransparent = () => useStatusBar(statusBarConfigs.transparent);
