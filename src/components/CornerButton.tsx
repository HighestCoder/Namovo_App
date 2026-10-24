import React, { useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, View, Text, Platform } from 'react-native';
import { COLORS } from '../theme/colors';
import { triggerLightHaptic } from '../utils/haptics';

interface CornerButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  label?: string;
  accessibilityLabel: string;
  testID?: string;
  floatingEmoji?: string;
}

export const CornerButton: React.FC<CornerButtonProps> = ({
  onPress,
  icon,
  label,
  accessibilityLabel,
  testID,
  floatingEmoji,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 40,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    triggerLightHaptic();
    onPress();
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.86}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={styles.touchArea}
      >
        <View style={styles.button}>
          <View style={styles.iconContainer}>{icon}</View>
          {floatingEmoji ? (
            <View style={styles.floatingEmojiBadge}>
              <Text style={styles.floatingEmojiText}>{floatingEmoji}</Text>
            </View>
          ) : null}
        </View>
        {label ? <Text style={styles.labelText}>{label}</Text> : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  touchArea: {
    alignItems: 'center',
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 5,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingEmojiBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.25)',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
  },
  floatingEmojiText: {
    fontSize: 10.5,
    lineHeight: 13,
  },
  labelText: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '600',
    color: '#6E637F',
    letterSpacing: 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
      : {}),
  },
});
