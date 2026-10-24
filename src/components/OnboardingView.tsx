import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Sparkles, Calendar, Heart, ArrowRight, User } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { CoupleData } from '../types';
import { applyDateMask, parseDateInputToISO, isoToDisplayDate } from '../utils/timeCalculation';

interface OnboardingViewProps {
  initialData?: CoupleData | null;
  onSubmit: (data: CoupleData) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  initialData,
  onSubmit,
}) => {
  const [partner1, setPartner1] = useState(initialData?.partner1 || '');
  const [partner2, setPartner2] = useState(initialData?.partner2 || '');
  const [dateInput, setDateInput] = useState(
    initialData?.startDate ? isoToDisplayDate(initialData.startDate) : ''
  );

  const partner1Ref = useRef<any>(null);
  const partner2Ref = useRef<any>(null);
  const dateRef = useRef<any>(null);

  const [partner1Focused, setPartner1Focused] = useState(false);
  const [partner2Focused, setPartner2Focused] = useState(false);
  const [dateFocused, setDateFocused] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDateChange = (text: string) => {
    const masked = applyDateMask(text);
    setDateInput(masked);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = () => {
    setErrorMessage(null);

    const trimmedPartner1 = partner1.trim();
    const trimmedPartner2 = partner2.trim();

    if (!trimmedPartner1) {
      setErrorMessage('Por favor, informe o seu nome.');
      partner1Ref.current?.focus();
      return;
    }

    if (!trimmedPartner2) {
      setErrorMessage('Por favor, informe o nome do seu amor.');
      partner2Ref.current?.focus();
      return;
    }

    const isoDate = parseDateInputToISO(dateInput);
    if (!isoDate) {
      setErrorMessage('Informe uma data válida no formato DD/MM/AAAA (não pode ser futura).');
      dateRef.current?.focus();
      return;
    }

    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }

    onSubmit({
      partner1: trimmedPartner1,
      partner2: trimmedPartner2,
      startDate: isoDate,
      createdAt: initialData?.createdAt || Date.now(),
    });
  };

  const content = (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerWrapper}>
          {/* Header Sofisticado */}
          <View style={styles.header}>
            <View style={styles.badgeWrapper}>
              <View style={styles.badge}>
                <Sparkles size={13} color={COLORS.accent} strokeWidth={2} />
                <Text style={styles.badgeText}>ESPAÇO DO CASAL</Text>
              </View>
            </View>

            <Text style={styles.title}>Nossa História</Text>
            <Text style={styles.subtitle}>
              Eternize cada segundo da sua trajetória e acompanhe o crescimento do amor de vocês.
            </Text>
          </View>

          {/* Card do Formulário */}
          <View style={styles.formCard}>
            {/* Campo 1: Seu nome */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Seu nome</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => partner1Ref.current?.focus()}
                style={[
                  styles.inputWrapper,
                  partner1Focused && styles.inputWrapperFocused,
                ]}
              >
                <User
                  size={18}
                  color={partner1Focused ? COLORS.accent : COLORS.textMuted}
                  strokeWidth={1.8}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={partner1Ref}
                  value={partner1}
                  onChangeText={(t) => {
                    setPartner1(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setPartner1Focused(true)}
                  onBlur={() => setPartner1Focused(false)}
                  placeholder="Ex: Sophia"
                  placeholderTextColor={COLORS.textLight}
                  style={styles.textInput}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => partner2Ref.current?.focus()}
                />
              </TouchableOpacity>
            </View>

            {/* Divisor Elegante com Coração */}
            <View style={styles.connectorRow}>
              <View style={styles.connectorLine} />
              <View style={styles.connectorHeart}>
                <Heart size={14} color={COLORS.accent} fill="rgba(198, 139, 89, 0.12)" strokeWidth={1.8} />
              </View>
              <View style={styles.connectorLine} />
            </View>

            {/* Campo 2: Nome do seu amor */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome do seu amor</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => partner2Ref.current?.focus()}
                style={[
                  styles.inputWrapper,
                  partner2Focused && styles.inputWrapperFocused,
                ]}
              >
                <User
                  size={18}
                  color={partner2Focused ? COLORS.accent : COLORS.textMuted}
                  strokeWidth={1.8}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={partner2Ref}
                  value={partner2}
                  onChangeText={(t) => {
                    setPartner2(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setPartner2Focused(true)}
                  onBlur={() => setPartner2Focused(false)}
                  placeholder="Ex: Lucas"
                  placeholderTextColor={COLORS.textLight}
                  style={styles.textInput}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => dateRef.current?.focus()}
                />
              </TouchableOpacity>
            </View>

            {/* Campo 3: Data de início */}
            <View style={[styles.inputGroup, { marginTop: 18 }]}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Data de início do relacionamento</Text>
                <Text style={styles.inputLabelFormat}>DD/MM/AAAA</Text>
              </View>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => dateRef.current?.focus()}
                style={[
                  styles.inputWrapper,
                  dateFocused && styles.inputWrapperFocused,
                ]}
              >
                <Calendar
                  size={18}
                  color={dateFocused ? COLORS.accent : COLORS.textMuted}
                  strokeWidth={1.8}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={dateRef}
                  value={dateInput}
                  onChangeText={handleDateChange}
                  onFocus={() => setDateFocused(true)}
                  onBlur={() => setDateFocused(false)}
                  placeholder="Ex: 14/02/2022"
                  placeholderTextColor={COLORS.textLight}
                  style={styles.textInput}
                  keyboardType="numeric"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </TouchableOpacity>
            </View>

            {/* Mensagem de Erro Discreta */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Botão de Ação: Criar Nosso Espaço */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.88}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Criar Nosso Espaço</Text>
              <View style={styles.submitArrow}>
                <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Rodapé discreto */}
          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Seus dados são salvos localmente e com total privacidade no dispositivo.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {content}
    </TouchableWithoutFeedback>
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 36,
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badgeWrapper: {
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.9)',
    shadowColor: '#2D2D2D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  inputLabelFormat: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'web' ? 12 : 0,
    height: '100%',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(234, 230, 225, 0.7)',
  },
  connectorHeart: {
    marginHorizontal: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: COLORS.errorSoft,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    lineHeight: 18,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 26,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  submitArrow: {
    marginLeft: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 26,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
