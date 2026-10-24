import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import {
  Heart,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Users,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { triggerPairingSuccessNotification } from '../services/notifications';
import { initializeOrJoinCoupleSpace } from '../services/firebase';
import {
  triggerLightHaptic,
  triggerSelectionHaptic,
  triggerSuccessHaptic,
} from '../utils/haptics';

import {
  STORAGE_COUPLE_ID_KEY,
  STORAGE_COUPLE_DATA_KEY,
} from '../constants/storage';

export { STORAGE_COUPLE_ID_KEY, STORAGE_COUPLE_DATA_KEY };

interface PairingViewProps {
  onPaired: (coupleId: string, initialData?: any) => void;
  initialCode?: string | null;
}

// Conjunto de caracteres legíveis sem ambiguidades visuais
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROMANTIC_PREFIXES = ['AMOR', 'LOVE', 'VIDA', 'PAR', 'SOL', 'LUA', 'BEM', 'DOCE'];

const generateUniqueCoupleCode = (): string => {
  const usePrefix = Math.random() > 0.4;
  if (usePrefix) {
    const prefix = ROMANTIC_PREFIXES[Math.floor(Math.random() * ROMANTIC_PREFIXES.length)];
    const digit = Math.floor(Math.random() * 9) + 1;
    const combined = `${prefix}${digit}`;
    return combined.slice(0, 5).toUpperCase();
  }
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result.toUpperCase();
};

export const PairingView: React.FC<PairingViewProps> = ({ onPaired, initialCode }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'enter'>('generate');
  const [generatedCode, setGeneratedCode] = useState<string>(
    initialCode || generateUniqueCoupleCode()
  );
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Transição suave ao montar a tela
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Efeito de pulso sutil no ícone de conexão
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Gerar outro código
  const handleRegenerateCode = () => {
    triggerLightHaptic();
    setGeneratedCode(generateUniqueCoupleCode());
    setCopied(false);
  };

  // Copiar código para área de transferência
  const handleCopyCode = async () => {
    triggerLightHaptic();
    try {
      await Clipboard.setStringAsync(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (err) {
      console.warn('Erro ao copiar código:', err);
    }
  };

  // Concluir pareamento com código gerado (cria ou conecta ao doc `couples/{code}` no Firestore)
  const handleConfirmGenerated = async () => {
    triggerSuccessHaptic();
    setIsVerifying(true);
    setErrorMessage(null);

    const cleanCode = generatedCode.trim().toUpperCase();

    try {
      // 1. Salva sincronamente no window.localStorage na Web e aguarda no AsyncStorage PRIMEIRO
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
      }
      await AsyncStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);

      // 2. Conecta ao Firestore e carrega dados caso já existentes
      let docData: any = null;
      try {
        docData = await initializeOrJoinCoupleSpace(cleanCode);
        if (docData && docData.coupleData) {
          await AsyncStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(docData.coupleData));
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(docData.coupleData));
          }
        }
      } catch (firestoreErr) {
        console.warn('Aviso ao sincronizar espaço do casal no Firestore:', firestoreErr);
      }

      // 3. Garante novamente que o código está gravado com sucesso no AsyncStorage
      await AsyncStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
      }

      await triggerPairingSuccessNotification(cleanCode);
      setIsVerifying(false);
      onPaired(cleanCode, docData?.coupleData);
    } catch (err) {
      console.warn('Erro ao salvar STORAGE_COUPLE_ID_KEY localmente:', err);
      try {
        await AsyncStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
        }
      } catch (_) {}
      setIsVerifying(false);
      onPaired(cleanCode);
    }
  };

  // Concluir pareamento com código digitado (conecta ao doc compartilhado `couples/{code}` no Firestore)
  const handleConfirmEntered = async () => {
    const cleanCode = enteredCode.trim().toUpperCase();
    if (cleanCode.length !== 5) {
      setErrorMessage('Por favor, informe um código de exatamente 5 caracteres.');
      return;
    }

    triggerSuccessHaptic();
    setErrorMessage(null);
    setIsVerifying(true);

    try {
      // 1. FORÇA A PERSISTÊNCIA: Salva sincronamente no window.localStorage e aguarda AsyncStorage.setItem
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
      }
      await AsyncStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);

      // 2. Conecta ao Firestore para verificar o código e obter dados existentes do casal
      let docData: any = null;
      try {
        docData = await initializeOrJoinCoupleSpace(cleanCode);
        if (docData && docData.coupleData) {
          await AsyncStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(docData.coupleData));
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(docData.coupleData));
          }
        }
      } catch (firestoreErr) {
        console.warn('Aviso ao sincronizar espaço do casal no Firestore no join:', firestoreErr);
      }

      // 3. Reconfirma a persistência com await bem-sucedido para garantir que nada foi perdido
      await AsyncStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
      }

      await triggerPairingSuccessNotification(cleanCode);
      setIsVerifying(false);

      // 4. Somente após a persistência concluída com sucesso no armazenamento local, chama onPaired
      onPaired(cleanCode, docData?.coupleData);
    } catch (err) {
      console.warn('Erro na persistência do código de pareamento no join:', err);
      try {
        await AsyncStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
        }
      } catch (_) {}
      setIsVerifying(false);
      onPaired(cleanCode);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.innerWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Superior Romântico */}
          <View style={styles.header}>
            <Animated.View
              style={[styles.badgeWrapper, { transform: [{ scale: pulseAnim }] }]}
            >
              <View style={styles.badge}>
                <Sparkles size={13} color={COLORS.accent} strokeWidth={2.2} />
                <Text style={styles.badgeText}>CONEXÃO DO CASAL</Text>
              </View>
            </Animated.View>

            <Text style={styles.title}>Nosso Código</Text>
            <Text style={styles.subtitle}>
              Sincronize o aplicativo com o seu amor para compartilharem datas, presentes e cartas em um espaço privado a dois.
            </Text>
          </View>

          {/* Abas Alternadoras (Gerar vs Inserir) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                triggerSelectionHaptic();
                setActiveTab('generate');
                setErrorMessage(null);
              }}
              style={[
                styles.tabButton,
                activeTab === 'generate' && styles.tabButtonActive,
              ]}
            >
              <Sparkles
                size={14}
                color={activeTab === 'generate' ? '#FFFFFF' : COLORS.textMuted}
                strokeWidth={2}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'generate' && styles.tabButtonTextActive,
                ]}
              >
                Gerar Código
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                triggerSelectionHaptic();
                setActiveTab('enter');
                setErrorMessage(null);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              style={[
                styles.tabButton,
                activeTab === 'enter' && styles.tabButtonActive,
              ]}
            >
              <KeyRound
                size={14}
                color={activeTab === 'enter' ? '#FFFFFF' : COLORS.textMuted}
                strokeWidth={2}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'enter' && styles.tabButtonTextActive,
                ]}
              >
                Inserir Código
              </Text>
            </TouchableOpacity>
          </View>

          {/* Card Principal */}
          <View style={styles.mainCard}>
            {activeTab === 'generate' ? (
              // Modo 1: Gerar Código
              <View style={styles.tabContent}>
                <View style={styles.infoBadge}>
                  <Users size={14} color={COLORS.accent} strokeWidth={2} />
                  <Text style={styles.infoBadgeText}>
                    Compartilhe este código com o seu parceiro
                  </Text>
                </View>

                {/* Mostrador dos 5 Caracteres */}
                <View style={styles.codeBoxesRow}>
                  {generatedCode.split('').map((char, index) => (
                    <View key={index} style={styles.codeBox}>
                      <Text style={styles.codeBoxChar}>{char}</Text>
                    </View>
                  ))}
                </View>

                {/* Botões de Ação Secundária (Copiar e Gerar Outro) */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={handleCopyCode}
                    activeOpacity={0.8}
                    style={styles.secondaryButton}
                  >
                    {copied ? (
                      <>
                        <Check size={16} color="#166534" strokeWidth={2.4} />
                        <Text style={[styles.secondaryButtonText, { color: '#166534' }]}>
                          Copiado!
                        </Text>
                      </>
                    ) : (
                      <>
                        <Copy size={16} color={COLORS.accent} strokeWidth={2} />
                        <Text style={styles.secondaryButtonText}>Copiar Código</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleRegenerateCode}
                    activeOpacity={0.8}
                    style={styles.secondaryButton}
                  >
                    <RefreshCw size={15} color={COLORS.textSecondary} strokeWidth={2} />
                    <Text style={styles.secondaryButtonText}>Gerar Outro</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <Text style={styles.helperText}>
                  ✨ Ao prosseguir, seu dispositivo ficará vinculado a este código. O seu amor deverá inserir este mesmo código no aparelho dele(a).
                </Text>

                {/* Botão de Continuar */}
                <TouchableOpacity
                  onPress={handleConfirmGenerated}
                  disabled={isVerifying}
                  activeOpacity={0.88}
                  style={styles.primaryButton}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>
                        Continuar com este Código
                      </Text>
                      <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.2} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // Modo 2: Inserir Código
              <View style={styles.tabContent}>
                <View style={styles.infoBadge}>
                  <Heart size={14} color={COLORS.accent} strokeWidth={2} />
                  <Text style={styles.infoBadgeText}>
                    Digite o código de 5 dígitos recebido
                  </Text>
                </View>

                {/* Display Visual das 5 Caixas Interativas */}
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => inputRef.current?.focus()}
                  style={styles.codeBoxesRow}
                >
                  {[0, 1, 2, 3, 4].map((i) => {
                    const char = enteredCode[i] || '';
                    const isCurrent = i === enteredCode.length;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.codeBox,
                          isCurrent && styles.codeBoxActive,
                          char ? styles.codeBoxFilled : null,
                        ]}
                      >
                        <Text style={styles.codeBoxChar}>{char || ''}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>

                {/* TextInput Oculto/Integrado */}
                <TextInput
                  ref={inputRef}
                  value={enteredCode}
                  onChangeText={(val) => {
                    const formatted = val
                      .replace(/[^A-Za-z0-9]/g, '')
                      .toUpperCase()
                      .slice(0, 5);
                    setEnteredCode(formatted);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onSubmitEditing={() => {
                    if (enteredCode.trim().length === 5 && !isVerifying) {
                      handleConfirmEntered();
                    }
                  }}
                  returnKeyType="done"
                  maxLength={5}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType="default"
                  style={styles.hiddenInput}
                />

                <Text style={styles.characterCounter}>
                  {enteredCode.length} de 5 caracteres preenchidos
                </Text>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <View style={styles.divider} />

                <Text style={styles.helperText}>
                  🔒 A sincronização é instantânea e mantém suas mensagens e lembretes salvos com total privacidade.
                </Text>

                {/* Botão de Conectar */}
                <TouchableOpacity
                  onPress={handleConfirmEntered}
                  disabled={enteredCode.length !== 5 || isVerifying}
                  activeOpacity={0.88}
                  style={[
                    styles.primaryButton,
                    enteredCode.length !== 5 && styles.primaryButtonDisabled,
                  ]}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Vincular Nosso Amor</Text>
                      <Heart size={17} color="#FFFFFF" strokeWidth={2.2} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Rodapé com Selo de Privacidade */}
          <View style={styles.footerNote}>
            <ShieldCheck size={14} color={COLORS.textMuted} strokeWidth={2} />
            <Text style={styles.footerNoteText}>
              Armazenamento local seguro e persistente no dispositivo
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeWrapper: {
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 139, 89, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.28)',
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: COLORS.accent,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontSize: 32,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  tabContent: {
    alignItems: 'center',
    width: '100%',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 139, 89, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.accentDark,
    marginLeft: 6,
  },
  codeBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    width: '100%',
  },
  codeBox: {
    width: 52,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: 'rgba(198, 139, 89, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C68B59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  codeBoxActive: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  codeBoxFilled: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(198, 139, 89, 0.05)',
  },
  codeBoxChar: {
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.accentDark,
    letterSpacing: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  characterCounter: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 14,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#D1C7BD',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerNoteText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
