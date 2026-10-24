import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Vibração leve e sofisticada para botões do teclado numérico e navegação
 */
export const triggerLightHaptic = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Ignora silenciosamente caso o dispositivo não suporte
  }
};

/**
 * Vibração média para transições e ações estruturais
 */
export const triggerMediumHaptic = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Ignora silenciosamente
  }
};

/**
 * Vibração de sucesso para desbloqueio ou salvamento bem-sucedido
 */
export const triggerSuccessHaptic = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Ignora silenciosamente
  }
};

/**
 * Vibração de erro para PIN incorreto ou falha
 */
export const triggerErrorHaptic = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Ignora silenciosamente
  }
};

/**
 * Vibração de seleção para toggles / switches
 */
export const triggerSelectionHaptic = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // Ignora silenciosamente
  }
};
