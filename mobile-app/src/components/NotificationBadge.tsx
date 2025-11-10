import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotifications } from '../contexts/NotificationContext';

interface NotificationBadgeProps {
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showCount?: boolean;
}

export function NotificationBadge({
  onPress,
  size = 'medium',
  color = '#3B82F6',
  showCount = true
}: NotificationBadgeProps) {
  const { unreadCount } = useNotifications();

  const sizeStyles = {
    small: { iconSize: 20, containerSize: 32 },
    medium: { iconSize: 24, containerSize: 40 },
    large: { iconSize: 28, containerSize: 48 },
  };

  const { iconSize, containerSize } = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          backgroundColor: unreadCount > 0 ? '#EBF8FF' : '#F3F4F6',
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Bell
        size={iconSize}
        color={unreadCount > 0 ? color : '#6B7280'}
      />

      {unreadCount > 0 && showCount && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}

      {unreadCount > 0 && !showCount && (
        <View style={styles.dot} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});
