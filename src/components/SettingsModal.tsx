import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Settings2,
  X,
  User,
  Heart,
  Calendar,
  Check,
  RotateCcw,
  Sparkles,
  Lock,
  KeyRound,
  Copy,
  Fingerprint,
  ScanFace,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../theme/colors';
import { CoupleData } from '../types';
import { STORAGE_BIOMETRICS_KEY } from './LockScreen';
import {
  triggerLightHaptic,
  triggerSelectionHaptic,
  triggerSuccessHaptic,
} from '../utils/haptics';
import {
  applyDateMask,
  parseDateInputToISO,
  isoToDisplayDate,
  formatElegantDate,
} from '../utils/timeCalculation';

interface SettingsModalProps {
  visible: boolean;
  coupleData: CoupleData;
  coupleCode?: string | null;
  onClose: () => void;
  onSave: (updatedData: CoupleData) => void;
  onReset: () => void;
  onUnpairCode?: () => void;
  onLockApp?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  coupleData,
  coupleCode,
  onClose,
  onSave,
  onReset,
  onUnpairCode,
  onLockApp,
}) => {
  const [partner1, setPartner1] = useState(coupleData.partner1 || '');
  const [partner2, setPartner2] = useState(coupleData.partner2 || '');
  const [dateInput, setDateInput] = useState(
    isoToDisplayDate(coupleData.startDate) || ''
  );
  const [dateError, setDateError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricName, setBiometricName] = useState('Face ID / Touch ID');

  const handleCopyCoupleCode = async () => {
    if (!coupleCode) return;
    triggerLightHaptic();
    try {
      await Clipboard.setStringAsync(coupleCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2200);
    } catch (err) {
      console.warn('Erro ao copiar código:', err);
    }
  };

  const handleConfirmUnpair = () => {
    triggerLightHaptic();
    const doUnpair = () => {
      handleClose();
      if (onUnpairCode) {
        setTimeout(onUnpairCode, 200);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja desvincular o Código do Casal? Você voltará à tela de pareamento.')) {
        doUnpair();
      }
    } else {
      Alert.alert(
        'Desvincular Código',
        'Tem certeza que deseja desvincular o código deste dispositivo? Você voltará à tela de pareamento.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Desvincular', style: 'destructive', onPress: doUnpair },
        ]
      );
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Sincroniza campos e carrega preferência biométrica quando o modal abre
  useEffect(() => {
    if (visible) {
      setPartner1(coupleData.partner1 || '');
      setPartner2(coupleData.partner2 || '');
      setDateInput(isoToDisplayDate(coupleData.startDate) || '');
      setDateError('');

      // Carrega estado e suporte da biometria
      const loadBiometrics = async () => {
        try {
          const pref = await AsyncStorage.getItem(STORAGE_BIOMETRICS_KEY);
          setBiometricsEnabled(pref === 'true');

          if (Platform.OS !== 'web') {
            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
              setBiometricName('Face ID');
            } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
              setBiometricName('Touch ID');
            }
          }
        } catch (err) {
          console.warn('Erro ao carregar preferência biométrica:', err);
        }
      };

      loadBiometrics();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
    }
  }, [visible, coupleData, fadeAnim, slideAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleDateChange = (text: string) => {
    const masked = applyDateMask(text);
    setDateInput(masked);
    if (dateError) setDateError('');
  };

  const handleSave = async () => {
    const p1 = partner1.trim();
    const p2 = partner2.trim();

    if (!p1) {
      Alert.alert('Atenção', 'Por favor, insira o seu nome.');
      return;
    }
    if (!p2) {
      Alert.alert('Atenção', 'Por favor, insira o nome do seu amor.');
      return;
    }

    const isoDate = parseDateInputToISO(dateInput);
    if (!isoDate) {
      setDateError('Insira uma data válida no formato DD/MM/AAAA (não pode ser no futuro)');
      Alert.alert('Data Inválida', 'Por favor, confira o dia, mês e ano inseridos.');
      return;
    }

    const updated: CoupleData = {
      ...coupleData,
      partner1: p1,
      partner2: p2,
      startDate: isoDate,
    };

    triggerSuccessHaptic();
    onSave(updated);
    handleClose();
  };

  const handleToggleBiometrics = async (value: boolean) => {
    triggerSelectionHaptic();

    if (value) {
      if (Platform.OS !== 'web') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          Alert.alert(
            'Biometria Não Configurada',
            'Não encontramos Face ID ou biometria cadastrada no dispositivo. Ative nos Ajustes do seu sistema para utilizar este recurso.'
          );
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirme para habilitar o acesso por biometria',
          fallbackLabel: 'Cancelar',
        });

        if (!result.success) {
          return;
        }
      }

      await AsyncStorage.setItem(STORAGE_BIOMETRICS_KEY, 'true');
      setBiometricsEnabled(true);
      triggerSuccessHaptic();
    } else {
      await AsyncStorage.setItem(STORAGE_BIOMETRICS_KEY, 'false');
      setBiometricsEnabled(false);
    }
  };

  const handleConfirmReset = () => {
    Alert.alert(
      'Redefinir Dados',
      'Tem certeza de que deseja apagar todas as informações do casal e voltar ao início?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Redefinir',
          style: 'destructive',
          onPress: () => {
            handleClose();
            setTimeout(onReset, 250);
          },
        },
      ]
    );
  };

  if (!visible) return null;

  const currentIso = parseDateInputToISO(dateInput);
  const previewFormatted = currentIso ? formatElegantDate(currentIso) : null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalCard,
                  { transform: [{ translateY: slideAnim }] },
                ]}
              >
                <View style={styles.grabber} />

                {/* Botão Fechar */}
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
                </TouchableOpacity>

                {/* Cabeçalho */}
                <View style={styles.header}>
                  <View style={styles.badgeWrapper}>
                    <Sparkles size={12} color={COLORS.accent} />
                    <Text style={styles.badgeText}>CONFIGURAÇÕES</Text>
                  </View>
                  <Text style={styles.title}>Nosso Espaço</Text>
                  <Text style={styles.subtitle}>
                    Edite os nomes do casal e a data comemorativa da história de vocês.
                  </Text>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 50 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Campo: Seu Nome */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Seu Nome</Text>
                    <View style={styles.inputBox}>
                      <User size={18} color={COLORS.accent} strokeWidth={2} style={styles.inputIcon} />
                      <TextInput
                        value={partner1}
                        onChangeText={setPartner1}
                        placeholder="Ex: Matheus"
                        placeholderTextColor={COLORS.textLight}
                        style={[
                          styles.textInput,
                          Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
                        ]}
                        autoCapitalize="words"
                        maxLength={30}
                      />
                    </View>
                  </View>

                  {/* Campo: Nome do Seu Amor */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nome do Seu Amor</Text>
                    <View style={styles.inputBox}>
                      <Heart size={18} color={COLORS.accent} strokeWidth={2} style={styles.inputIcon} />
                      <TextInput
                        value={partner2}
                        onChangeText={setPartner2}
                        placeholder="Ex: Laura"
                        placeholderTextColor={COLORS.textLight}
                        style={[
                          styles.textInput,
                          Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
                        ]}
                        autoCapitalize="words"
                        maxLength={30}
                      />
                    </View>
                  </View>

                  {/* Campo: Data de Início do Relacionamento */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Data de Início do Relacionamento</Text>
                    <View style={[styles.inputBox, dateError ? styles.inputBoxError : null]}>
                      <Calendar size={18} color={COLORS.accent} strokeWidth={2} style={styles.inputIcon} />
                      <TextInput
                        value={dateInput}
                        onChangeText={handleDateChange}
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor={COLORS.textLight}
                        style={[
                          styles.textInput,
                          Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
                        ]}
                        keyboardType="numeric"
                        maxLength={10}
                      />
                    </View>
                    {previewFormatted ? (
                      <Text style={styles.datePreviewText}>
                        ✨ Juntos desde {previewFormatted}
                      </Text>
                    ) : null}
                    {dateError ? (
                      <Text style={styles.errorText}>{dateError}</Text>
                    ) : null}
                  </View>

                  {/* Card do Código do Casal */}
                  <View style={styles.coupleCodeCard}>
                    <View style={styles.coupleCodeHeader}>
                      <KeyRound size={15} color={COLORS.accent} strokeWidth={2.2} />
                      <Text style={styles.coupleCodeLabel}>CÓDIGO DE CONEXÃO DO CASAL</Text>
                    </View>
                    <View style={styles.coupleCodeRow}>
                      <View style={styles.codePill}>
                        <Text style={styles.codePillText}>{coupleCode || 'NÃO DEFINIDO'}</Text>
                      </View>
                      {coupleCode ? (
                        <TouchableOpacity
                          onPress={handleCopyCoupleCode}
                          activeOpacity={0.75}
                          style={styles.copyCodeButton}
                        >
                          {codeCopied ? (
                            <Check size={14} color="#166534" strokeWidth={2.4} />
                          ) : (
                            <Copy size={14} color={COLORS.accent} strokeWidth={2} />
                          )}
                          <Text style={[styles.copyCodeText, codeCopied && { color: '#166534' }]}>
                            {codeCopied ? 'Copiado!' : 'Copiar'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text style={styles.coupleCodeSubtext}>
                      Compartilhe este código com o seu parceiro para que ambos fiquem sincronizados.
                    </Text>
                    {onUnpairCode ? (
                      <TouchableOpacity
                        onPress={handleConfirmUnpair}
                        activeOpacity={0.7}
                        style={styles.unpairLink}
                      >
                        <Text style={styles.unpairLinkText}>Desvincular ou trocar código</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Card de Acesso por Biometria (Opt-in) */}
                  <View style={styles.biometricCard}>
                    <View style={styles.biometricLeft}>
                      <View style={styles.biometricIconWrapper}>
                        {biometricName.includes('Face') ? (
                          <ScanFace size={18} color={COLORS.accent} strokeWidth={2.2} />
                        ) : (
                          <Fingerprint size={18} color={COLORS.accent} strokeWidth={2.2} />
                        )}
                      </View>
                      <View style={styles.biometricInfo}>
                        <Text style={styles.biometricTitle}>Habilitar acesso por Biometria</Text>
                        <Text style={styles.biometricSubtitle}>
                          Desbloquear com {biometricName} automaticamente
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={biometricsEnabled}
                      onValueChange={handleToggleBiometrics}
                      trackColor={{ false: '#E0D8D0', true: COLORS.accent }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor="#E0D8D0"
                    />
                  </View>

                  {/* Botão de Salvar Alterações */}
                  <TouchableOpacity
                    onPress={handleSave}
                    activeOpacity={0.88}
                    style={styles.saveButton}
                  >
                    <Check size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                  </TouchableOpacity>

                  {/* Ação de Bloquear Aplicativo */}
                  {onLockApp ? (
                    <TouchableOpacity
                      onPress={() => {
                        handleClose();
                        setTimeout(onLockApp, 250);
                      }}
                      activeOpacity={0.75}
                      style={styles.lockNowButton}
                    >
                      <Lock size={15} color={COLORS.accentDark} strokeWidth={2} />
                      <Text style={styles.lockNowButtonText}>Bloquear Aplicativo Agora (Tela de PIN)</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Ação de Redefinir Dados */}
                  <TouchableOpacity
                    onPress={handleConfirmReset}
                    activeOpacity={0.75}
                    style={styles.resetButton}
                  >
                    <RotateCcw size={15} color={COLORS.textMuted} strokeWidth={2} />
                    <Text style={styles.resetButtonText}>Redefinir e voltar ao onboarding</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.modalBackdrop,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    height: '92%',
    maxHeight: '92%',
    flex: 1,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD9D2',
    alignSelf: 'center',
    marginBottom: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 22,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3EF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
    fontFamily:
      Platform.OS === 'ios'
        ? 'Didot'
        : Platform.OS === 'web'
        ? '"Didot", "Bodoni MT", "Playfair Display", Georgia, serif'
        : 'serif',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 48,
  },
  inputBoxError: {
    borderColor: '#E06D6D',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  datePreviewText: {
    fontSize: 12,
    color: COLORS.accentDark,
    fontWeight: '500',
    marginTop: 5,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#D9534F',
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  lockNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    marginBottom: 10,
  },
  lockNowButtonText: {
    fontSize: 12.5,
    color: COLORS.accentDark,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  resetButtonText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  coupleCodeCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.25)',
    marginBottom: 16,
  },
  coupleCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  coupleCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.accentDark,
    textTransform: 'uppercase',
  },
  coupleCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  codePill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.35)',
  },
  codePillText: {
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accentDark,
    letterSpacing: 2,
  },
  copyCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 5,
  },
  copyCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  coupleCodeSubtext: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.textMuted,
  },
  unpairLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  unpairLinkText: {
    fontSize: 11.5,
    color: '#D9534F',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  biometricCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.25)',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  biometricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  biometricIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 139, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  biometricInfo: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  biometricSubtitle: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
});
