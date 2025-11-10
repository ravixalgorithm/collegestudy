import React from 'react';
import { StatusBar } from 'expo-status-bar';

interface AppStatusBarProps {
  style?: 'light' | 'dark' | 'auto';
  backgroundColor?: string;
  hidden?: boolean;
}

export function AppStatusBar({
  style = 'dark',
  backgroundColor = '#ffffff',
  hidden = false
}: AppStatusBarProps) {
  return (
    <StatusBar
      style={style}
      backgroundColor={backgroundColor}
      hidden={hidden}
      translucent={false}
    />
  );
}

// Predefined variants for common use cases
export const LightStatusBar = () => (
  <AppStatusBar style="dark" backgroundColor="#ffffff" />
);

export const DarkStatusBar = () => (
  <AppStatusBar style="light" backgroundColor="#000000" />
);

export const PrimaryStatusBar = () => (
  <AppStatusBar style="light" backgroundColor="#3B82F6" />
);

export const TransparentStatusBar = () => (
  <AppStatusBar style="dark" backgroundColor="transparent" />
);
