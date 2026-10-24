import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Lock,
  Delete,
  ShieldCheck,
  KeyRound,
  Sparkles,
  ScanFace,
  Fingerprint,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '../utils/haptics';

import {
  STORAGE_PRIVATE_ACCESS_KEY,
  STORAGE_BIOMETRICS_KEY,
} from '../constants/storage';

export { STORAGE_PRIVATE_ACCESS_KEY, STORAGE_BIOMETRICS_KEY };
export const REQUIRED_PIN = '021727';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [currentPin, setCurrentPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'generic'>('generic');

  // Animações
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasAttemptedBiometrics = useRef<boolean>(false);

  // Executa autenticação biométrica (Face ID / Touch ID)
  const promptBiometricUnlock = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear o seu espaço a dois',
        fallbackLabel: 'Digitar PIN',
        cancelLabel: 'Digitar PIN',
        disableDeviceFallback: true, // Mantém o fallback para o teclado numérico do próprio Namovo
      });

      if (result.success) {
        await triggerSuccessHaptic();
        await AsyncStorage.setItem(STORAGE_PRIVATE_ACCESS_KEY, 'true');
        onUnlock();
      }
      // Se falhou ou foi cancelado, permanece na tela de PIN normalmente
    } catch (err) {
      console.warn('Falha no prompt biométrico:', err);
    }
  }, [onUnlock]);

  // 1. Transição de fade na montagem
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fadeAnim]);

  // 2. Disparo de Biometria Dinâmica (Apenas se o usuário tiver optado por habilitar em Ajustes)
  useEffect(() => {
    const checkAndTriggerBiometrics = async () => {
      try {
        const pref = await AsyncStorage.getItem(STORAGE_BIOMETRICS_KEY);
        if (pref !== 'true') return; // Usuário não habilitou biometria (requer PIN)

        if (Platform.OS === 'web') return;

        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          setIsBiometricsEnabled(true);

          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('face');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
          }

          // Se ainda não disparou nesta montagem da tela, executa prompt biométrico
          if (!hasAttemptedBiometrics.current) {
            hasAttemptedBiometrics.current = true;
            // Pequeno delay de 120ms para renderizar a tela antes do prompt nativo do sistema
            setTimeout(() => {
              promptBiometricUnlock();
            }, 120);
          }
        }
      } catch (err) {
        console.warn('Erro ao checar biometria no LockScreen:', err);
      }
    };

    checkAndTriggerBiometrics();
  }, [promptBiometricUnlock]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  };

  const validatePin = (enteredPin: string) => {
    setIsVerifying(true);

    if (enteredPin === REQUIRED_PIN) {
      setTimeout(async () => {
        try {
          await triggerSuccessHaptic();
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_PRIVATE_ACCESS_KEY, 'true');
          }
          await AsyncStorage.setItem(STORAGE_PRIVATE_ACCESS_KEY, 'true');
        } catch (err) {
          console.warn('Erro ao salvar acesso privado:', err);
        }
        setIsVerifying(false);
        onUnlock();
      }, 140);
    } else {
      setTimeout(() => {
        triggerErrorHaptic();
        triggerShake();
        setErrorMessage('Código de acesso incorreto. Tente novamente.');
        setCurrentPin('');
        setIsVerifying(false);
      }, 140);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (currentPin.length >= 6 || isVerifying) return;
    triggerLightHaptic();
    const nextPin = currentPin + digit;
    setCurrentPin(nextPin);
    setErrorMessage('');

    if (nextPin.length === 6) {
      validatePin(nextPin);
    }
  };

  const handleDelete = () => {
    if (currentPin.length > 0 && !isVerifying) {
      triggerLightHaptic();
      setCurrentPin(currentPin.slice(0, -1));
      setErrorMessage('');
    }
  };

  // Suporte a teclado físico na Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleHelp = () => {
    triggerLightHaptic();
    const title = 'Acesso Privado';
    const message = 'Digite o código de 6 dígitos para desbloquear seu espaço privativo.';
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleBiometricPress = () => {
    triggerLightHaptic();
    promptBiometricUnlock();
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientTop, COLORS.gradientMiddle, COLORS.gradientBottom, COLORS.gradientBottomAlt]}
      locations={[0, 0.32, 0.72, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Cabeçalho de Segurança */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Lock size={24} color={COLORS.accent} strokeWidth={2.2} />
            </View>

            <View style={styles.badgeRow}>
              <Sparkles size={11} color={COLORS.accent} strokeWidth={2} />
              <Text style={styles.badgeText}>AMBIENTE PRIVATIVO</Text>
            </View>

            <Text style={styles.title}>Acesso Privado</Text>
            <Text style={styles.subtitle}>
              Digite a senha de 6 dígitos para desbloquear o espaço a dois.
            </Text>
          </View>

          {/* Indicadores Visuais de Dígitos (6 Dots com animação de tremor / shake) */}
          <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < currentPin.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    isFilled && styles.dotFilled,
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Atalho de Biometria se habilitado */}
          {isBiometricsEnabled ? (
            <TouchableOpacity
              onPress={handleBiometricPress}
              activeOpacity={0.78}
              style={styles.biometricPill}
            >
              {biometricType === 'face' ? (
                <ScanFace size={16} color={COLORS.accentDark} strokeWidth={2.2} />
              ) : (
                <Fingerprint size={16} color={COLORS.accentDark} strokeWidth={2.2} />
              )}
              <Text style={styles.biometricPillText}>
                Desbloquear com {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Mensagem de Erro / Feedback */}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <View style={styles.errorPlaceholder} />
          )}

          {/* Teclado Numérico Minimalista */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
            ].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((digit) => (
                  <TouchableOpacity
                    key={digit}
                    onPress={() => handleKeyPress(digit)}
                    activeOpacity={0.7}
                    style={styles.keyButton}
                  >
                    <Text style={styles.keyText}>{digit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Linha final: Biometria/Ajuda, 0, Deletar */}
            <View style={styles.keypadRow}>
              {isBiometricsEnabled ? (
                <TouchableOpacity
                  onPress={handleBiometricPress}
                  activeOpacity={0.7}
                  style={[styles.keyButton, styles.specialKeyButton]}
                >
                  {biometricType === 'face' ? (
                    <ScanFace size={22} color={COLORS.accent} strokeWidth={2} />
                  ) : (
                    <Fingerprint size={22} color={COLORS.accent} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleHelp}
                  activeOpacity={0.7}
                  style={[styles.keyButton, styles.specialKeyButton]}
                >
                  <KeyRound size={20} color={COLORS.accent} strokeWidth={2} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleKeyPress('0')}
                activeOpacity={0.7}
                style={styles.keyButton}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                activeOpacity={0.7}
                style={[styles.keyButton, styles.specialKeyButton]}
              >
                <Delete size={20} color={COLORS.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rodapé de Privacidade */}
          <View style={styles.footer}>
            <ShieldCheck size={14} color="#7D748E" strokeWidth={2} />
            <Text style={styles.footerText}>Protegido contra indexação e acesso não autorizado</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: Platform.OS === 'ios' ? 24 : 32,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 16,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#7E6B94',
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 26,
    fontWeight: '400',
    color: '#24202B',
    letterSpacing: -0.3,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : Platform.OS === 'web' ? '"Didot", "Playfair Display", Georgia, serif' : 'serif',
  },
  subtitle: {
    fontSize: 13,
    color: '#766D85',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginVertical: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#C2B8CE',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    transform: [{ scale: 1.15 }],
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  biometricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 139, 89, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 7,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.28)',
  },
  biometricPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  errorText: {
    fontSize: 12,
    color: '#C85A54',
    fontWeight: '500',
    textAlign: 'center',
    height: 20,
  },
  errorPlaceholder: {
    height: 20,
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
    gap: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  specialKeyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '300',
    color: '#26222E',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  footerText: {
    fontSize: 11,
    color: '#847A94',
    fontWeight: '500',
  },
});
