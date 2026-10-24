import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  ActionSheetIOS,
  Animated,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  Plane,
  Flower2,
  Settings2,
  Sparkles,
  Camera,
  Image as ImageIcon,
  RefreshCw,
  CalendarHeart,
  Gift,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { CoupleData, TimeTogether, ActiveCornerModal } from '../types';
import {
  calculateTimeTogether,
  formatElegantDate,
  getNextMilestoneInfo,
} from '../utils/timeCalculation';
import { triggerLightHaptic, triggerSelectionHaptic } from '../utils/haptics';
import { CornerButton } from './CornerButton';
import { FeatureModal } from './FeatureModal';
import {
  FeaturedMediaModal,
  DEFAULT_FEATURED_IMAGE,
} from './FeaturedMediaModal';
import { DateNightRouletteModal } from './DateNightRouletteModal';
import { TravelFeedModal } from './TravelFeedModal';
import { SettingsModal } from './SettingsModal';
import { CalendarModal } from './CalendarModal';
import { GiftsModal } from './GiftsModal';
import { CartasModal } from './CartasModal';

interface HomeViewProps {
  data: CoupleData;
  coupleCode?: string | null;
  onEdit: () => void;
  onReset: () => void;
  onUnpairCode?: () => void;
  onUpdatePhoto?: (newUrl: string, caption?: string) => void;
  onUpdateCoupleData?: (updated: CoupleData) => void;
  onLockApp?: () => void;
}

const STORAGE_MOOD_KEY = '@namovo_couple_mood_v1';
const STORAGE_LOVE_TAPS_KEY = '@namovo_love_taps_v1';

const COUPLE_MOODS = [
  { emoji: '✨', label: 'Em sintonia perfeita' },
  { emoji: '🍷', label: 'Noite de vinho a dois' },
  { emoji: '✈️', label: 'Planejando nossa próxima viagem' },
  { emoji: '🥰', label: 'Contando as horas para te ver' },
  { emoji: '🍿', label: 'Sessão cinema & aconchego' },
  { emoji: '☕', label: 'Manhã preguiçosa juntos' },
  { emoji: '🌙', label: 'Sob o mesmo céu estrelado' },
];

const ROMANTIC_QUOTES = [
  '“Cada segundo ao seu lado é o meu momento favorito.”',
  '“Em você, encontrei meu lar, minha paz e meu melhor destino.”',
  '“O amor não se conta apenas em dias, mas na intensidade de cada olhar.”',
  '“Nossa história é o capítulo mais bonito que a vida escreveu.”',
  '“Que o nosso para sempre seja feito de pequenos instantes eternos.”',
  '“Caminhar ao seu lado transforma qualquer rotina em poesia.”',
  '“Você é a resposta mais bonita que o tempo me trouxe.”',
];

export const HomeView: React.FC<HomeViewProps> = ({
  data,
  coupleCode,
  onEdit,
  onReset,
  onUnpairCode,
  onUpdatePhoto,
  onUpdateCoupleData,
  onLockApp,
}) => {
  const [coupleInfo, setCoupleInfo] = useState<CoupleData>(data);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [time, setTime] = useState<TimeTogether>(() =>
    calculateTimeTogether(data.startDate)
  );
  const [activeModal, setActiveModal] = useState<ActiveCornerModal>(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);

  // Estados dinâmicos de interatividade
  const [moodIndex, setMoodIndex] = useState(0);
  const [loveTaps, setLoveTaps] = useState(0);
  const [counterMode, setCounterMode] = useState<0 | 1 | 2>(0); // 0: Dias + Relógio, 1: Próximo Marco, 2: Horas Totais
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Animações
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const moodScaleAnim = useRef(new Animated.Value(1)).current;
  const quoteFadeAnim = useRef(new Animated.Value(1)).current;
  const floatingHeartY = useRef(new Animated.Value(0)).current;
  const floatingHeartOpacity = useRef(new Animated.Value(0)).current;
  const floatingHeartScale = useRef(new Animated.Value(0.5)).current;

  // Sincroniza dados caso atualizados pelo App
  useEffect(() => {
    setCoupleInfo(data);
  }, [data]);

  // Carrega humor e contador de carinho salvos
  useEffect(() => {
    const loadInteractiveState = async () => {
      try {
        const [savedMood, savedTaps] = await Promise.all([
          AsyncStorage.getItem(STORAGE_MOOD_KEY),
          AsyncStorage.getItem(STORAGE_LOVE_TAPS_KEY),
        ]);
        if (savedMood !== null) {
          const idx = parseInt(savedMood, 10);
          if (!isNaN(idx) && idx >= 0 && idx < COUPLE_MOODS.length) {
            setMoodIndex(idx);
          }
        }
        if (savedTaps !== null) {
          const taps = parseInt(savedTaps, 10);
          if (!isNaN(taps)) setLoveTaps(taps);
        }
      } catch (err) {
        console.warn('Erro ao carregar estado interativo:', err);
      }
    };
    loadInteractiveState();
  }, []);

  // Foto em destaque (usa a salva pelo usuário ou a padrão sofisticada)
  const [featuredPhoto, setFeaturedPhoto] = useState(
    data.featuredImage || DEFAULT_FEATURED_IMAGE
  );

  // Atualiza se mudar nas props
  useEffect(() => {
    if (data.featuredImage) {
      setFeaturedPhoto(data.featuredImage);
    }
  }, [data.featuredImage]);

  // Atualização dinâmica em tempo real com base na data do casal
  useEffect(() => {
    setTime(calculateTimeTogether(coupleInfo.startDate));

    const timer = setInterval(() => {
      setTime(calculateTimeTogether(coupleInfo.startDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [coupleInfo.startDate]);

  // Efeito sutil de pulso suave no cronômetro
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.012,
          duration: 2600,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Alternar sintonia/humor do casal
  const handleCycleMood = async () => {
    triggerSelectionHaptic();
    const nextIdx = (moodIndex + 1) % COUPLE_MOODS.length;
    Animated.sequence([
      Animated.timing(moodScaleAnim, {
        toValue: 0.92,
        duration: 90,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(moodScaleAnim, {
        toValue: 1,
        speed: 40,
        bounciness: 10,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    setMoodIndex(nextIdx);
    try {
      await AsyncStorage.setItem(STORAGE_MOOD_KEY, String(nextIdx));
    } catch (err) {
      console.warn('Erro ao salvar humor:', err);
    }
  };

  // Enviar carinho na foto (Animação de coração flutuante)
  const handleSendLoveTap = async () => {
    triggerLightHaptic();
    const nextTaps = loveTaps + 1;
    setLoveTaps(nextTaps);

    floatingHeartY.setValue(0);
    floatingHeartOpacity.setValue(1);
    floatingHeartScale.setValue(0.6);

    Animated.parallel([
      Animated.timing(floatingHeartY, {
        toValue: -75,
        duration: 850,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(floatingHeartScale, {
        toValue: 1.35,
        friction: 5,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(floatingHeartOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();

    try {
      await AsyncStorage.setItem(STORAGE_LOVE_TAPS_KEY, String(nextTaps));
    } catch (err) {
      console.warn('Erro ao salvar carinho:', err);
    }
  };

  // Alternar modo do badge inferior do cronômetro
  const handleCycleCounterMode = () => {
    setCounterMode((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
  };

  // Alternar citação poética no rodapé
  const handleNextQuote = () => {
    Animated.timing(quoteFadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setQuoteIndex((prev) => (prev + 1) % ROMANTIC_QUOTES.length);
      Animated.timing(quoteFadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
  };

  // Manipulação imediata ao salvar configurações
  const handleSaveSettings = (updated: CoupleData) => {
    setCoupleInfo(updated);
    setTime(calculateTimeTogether(updated.startDate));
    if (onUpdateCoupleData) {
      onUpdateCoupleData(updated);
    }
  };

  const handleSavePhoto = (newUrl: string, caption?: string) => {
    setFeaturedPhoto(newUrl);
    if (onUpdatePhoto) {
      onUpdatePhoto(newUrl, caption);
    }
  };

  const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const liveClockStr = `${padZero(time.hours)}h ${padZero(time.minutes)}m ${padZero(time.seconds)}s`;
  const nextMilestoneStr = getNextMilestoneInfo(coupleInfo.startDate);
  const totalHours = (time.totalDays * 24 + time.hours).toLocaleString('pt-BR');
  const currentMood = COUPLE_MOODS[moodIndex];

  return (
    <LinearGradient
      colors={[
        COLORS.gradientTop,
        COLORS.gradientMiddle,
        COLORS.gradientBottom,
        COLORS.gradientBottomAlt,
      ]}
      locations={[0, 0.35, 0.78, 1]}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* ============================================================== */}
          {/* OS 4 CANTOS DA TELA PRINCIPAL (Com Rótulos p/ Melhor Usabilidade) */}
          {/* ============================================================== */}

          {/* 1. Canto Superior Esquerdo (Coração ❤️ - Roleta de Encontros) */}
          <View style={[styles.cornerPosition, styles.cornerTopLeft]}>
            <CornerButton
              onPress={() => setActiveModal('roulette')}
              label="Encontros"
              accessibilityLabel="Roleta de encontros do casal"
              testID="btn-corner-heart"
              floatingEmoji="✨"
              icon={
                <Heart
                  size={21}
                  color={COLORS.accent}
                  fill="rgba(198, 139, 89, 0.15)"
                  strokeWidth={1.9}
                />
              }
            />
          </View>

          {/* 2. Canto Superior Direito (Avião ✈️ - Diário de Viagens) */}
          <View style={[styles.cornerPosition, styles.cornerTopRight]}>
            <CornerButton
              onPress={() => setActiveModal('travels')}
              label="Viagens"
              accessibilityLabel="Nossas viagens e aventuras"
              testID="btn-corner-plane"
              floatingEmoji="✈️"
              icon={
                <Plane
                  size={21}
                  color={COLORS.accent}
                  strokeWidth={1.9}
                />
              }
            />
          </View>

          {/* 3. Canto Inferior Esquerdo (Rosa 🌹 - Cartas & Mensagens) */}
          <View style={[styles.cornerPosition, styles.cornerBottomLeft]}>
            <CornerButton
              onPress={() => setActiveModal('memories')}
              label="Cartas"
              accessibilityLabel="Nossas cartas e mensagens de amor"
              testID="btn-corner-rose"
              floatingEmoji="💌"
              icon={
                <Flower2
                  size={21}
                  color={COLORS.accent}
                  strokeWidth={1.9}
                />
              }
            />
          </View>

          {/* 4. Canto Inferior Direito (Configurações ⚙️ - Ajustes) */}
          <View style={[styles.cornerPosition, styles.cornerBottomRight]}>
            <CornerButton
              onPress={() => setSettingsModalVisible(true)}
              label="Ajustes"
              accessibilityLabel="Configurações e edição do casal"
              testID="btn-corner-settings"
              icon={
                <Settings2
                  size={20}
                  color={COLORS.textSecondary}
                  strokeWidth={1.8}
                />
              }
            />
          </View>

          {/* 5. Meio Direito (Calendário 🗓️ - Datas Especiais & Encontros) */}
          <View style={[styles.cornerPosition, styles.middleRight]}>
            <CornerButton
              onPress={() => setActiveModal('calendar')}
              label="Calendário"
              accessibilityLabel="Calendário de encontros e datas especiais do casal"
              testID="btn-corner-calendar"
              floatingEmoji="🗓️"
              icon={
                <CalendarHeart
                  size={21}
                  color={COLORS.accent}
                  strokeWidth={1.9}
                />
              }
            />
          </View>

          {/* 6. Meio Esquerdo (Presentes 🎁 - Lista de Desejos & Mimos) */}
          <View style={[styles.cornerPosition, styles.middleLeft]}>
            <CornerButton
              onPress={() => setActiveModal('gifts')}
              label="Presentes"
              accessibilityLabel="Lista de ideias de presentes e mimos do casal"
              testID="btn-corner-gifts"
              floatingEmoji="🎁"
              icon={
                <Gift
                  size={21}
                  color={COLORS.accent}
                  strokeWidth={1.9}
                />
              }
            />
          </View>

          {/* ============================================================== */}
          {/* TOPO: Nomes do Casal, Data & Pílula de Sintonia Interativa     */}
          {/* ============================================================== */}
          <View style={styles.topSection}>
            <View style={styles.monogramRow}>
              <View style={styles.monogramLine} />
              <Sparkles
                size={12}
                color={COLORS.accent}
                strokeWidth={2}
                style={{ marginHorizontal: 8 }}
              />
              <View style={styles.monogramLine} />
            </View>

            <View style={styles.namesRow}>
              <Text style={styles.partnerName}>{coupleInfo.partner1}</Text>
              <Text style={styles.ampersand}> & </Text>
              <Text style={styles.partnerName}>{coupleInfo.partner2}</Text>
            </View>

            <Text style={styles.dateSubtitle}>
              Juntos desde {formatElegantDate(coupleInfo.startDate)}
            </Text>

            {/* Pílula Interativa de Sintonia / Humor do Casal */}
            <Animated.View style={{ transform: [{ scale: moodScaleAnim }] }}>
              <TouchableOpacity
                onPress={handleCycleMood}
                activeOpacity={0.8}
                style={styles.moodPill}
                accessibilityRole="button"
                accessibilityLabel="Alternar sintonia atual do casal"
              >
                <Text style={styles.moodEmoji}>{currentMood.emoji}</Text>
                <Text style={styles.moodText}>{currentMood.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* ============================================================== */}
          {/* CENTRO EXATO DA TELA:                                          */}
          {/* 1. Mini Portrait com Botão de Carinho + Glassmorphism          */}
          {/* 2. Contagem Progressiva Exata + Alternador de Métricas         */}
          {/* ============================================================== */}
          <View style={styles.centerSection}>
            <View style={styles.portraitOuterWrapper}>
              {/* Coração Flutuante Animado ao Enviar Carinho */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.floatingHeartBubble,
                  {
                    opacity: floatingHeartOpacity,
                    transform: [
                      { translateY: floatingHeartY },
                      { scale: floatingHeartScale },
                    ],
                  },
                ]}
              >
                <Heart size={28} color="#D9536F" fill="#D9536F" />
              </Animated.View>

              {/* Quadro Mini Portrait */}
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setMediaModalVisible(true);
                }}
                activeOpacity={0.92}
                style={styles.portraitContainer}
                accessibilityRole="button"
                accessibilityLabel="Alterar foto em destaque do casal"
              >
                {featuredPhoto ? (
                  <>
                    <Image
                      source={{ uri: featuredPhoto }}
                      style={styles.portraitImage as any}
                      resizeMode="cover"
                    />
                    {coupleInfo.featuredCaption ? (
                      <View style={styles.portraitCaptionBadge}>
                        <Text style={styles.portraitCaptionText} numberOfLines={1}>
                          {coupleInfo.featuredCaption}
                        </Text>
                      </View>
                    ) : null}

                    {/* Botão Glassmorphism no canto inferior direito */}
                    <View style={styles.portraitEditBadge}>
                      <Camera size={11} color="#342848" strokeWidth={2.4} />
                      <Text style={styles.portraitEditText}>Trocar</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyPortraitContainer}>
                    <View style={styles.emptyIconCircle}>
                      <ImageIcon size={24} color={COLORS.accent} strokeWidth={1.8} />
                    </View>
                    <Text style={styles.emptyTitle}>Adicionar Foto</Text>
                    <Text style={styles.emptySubtitle}>Momento especial</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Botão Flutuante de Carinho (Canto Superior Direito do Retrato) */}
              <TouchableOpacity
                onPress={handleSendLoveTap}
                activeOpacity={0.8}
                style={styles.loveTapBadge}
                accessibilityRole="button"
                accessibilityLabel="Enviar carinho"
              >
                <Heart
                  size={12}
                  color="#D9536F"
                  fill="#D9536F"
                />
                {loveTaps > 0 ? (
                  <Text style={styles.loveTapCountText}>{loveTaps}</Text>
                ) : null}
              </TouchableOpacity>
            </View>

            {/* Contagem Progressiva Centralizada */}
            <Animated.View
              style={[
                styles.centerCounterContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.counterHeaderBadge}>
                <Text style={styles.counterHeaderBadgeText}>NOSSA JORNADA JUNTOS</Text>
              </View>

              {/* Grid dos 4 blocos de contagem solicitados */}
              <View style={styles.metricsGrid}>
                {/* Bloco 1: Anos */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricNumber}>{time.years}</Text>
                  <Text style={styles.metricLabel}>
                    {time.years === 1 ? 'ano' : 'anos'}
                  </Text>
                </View>

                {/* Bloco 2: Meses */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricNumber}>{time.months}</Text>
                  <Text style={styles.metricLabel}>
                    {time.months === 1 ? 'mês' : 'meses'}
                  </Text>
                </View>

                {/* Bloco 3: Semanas */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricNumber}>{time.weeks}</Text>
                  <Text style={styles.metricLabel}>
                    {time.weeks === 1 ? 'semana' : 'semanas'}
                  </Text>
                </View>

                {/* Bloco 4: Dias */}
                <View style={styles.metricCard}>
                  <Text style={styles.metricNumber}>{time.days}</Text>
                  <Text style={styles.metricLabel}>
                    {time.days === 1 ? 'dia' : 'dias'}
                  </Text>
                </View>
              </View>

              {/* Totalizador Interativo (Toque para alternar entre Relógio Ao Vivo, Próximo Marco e Horas) */}
              <TouchableOpacity
                onPress={handleCycleCounterMode}
                activeOpacity={0.8}
                style={styles.totalBadge}
                accessibilityRole="button"
                accessibilityLabel="Alternar visualização de tempo detalhado"
              >
                <View style={styles.liveIndicator} />
                {counterMode === 0 && (
                  <Text style={styles.totalBadgeText}>
                    {time.totalDays.toLocaleString('pt-BR')} dias • {liveClockStr}
                  </Text>
                )}
                {counterMode === 1 && (
                  <Text style={styles.totalBadgeText}>
                    {nextMilestoneStr}
                  </Text>
                )}
                {counterMode === 2 && (
                  <Text style={styles.totalBadgeText}>
                    {totalHours} horas compartilhadas
                  </Text>
                )}
                <RefreshCw
                  size={11}
                  color="#9589A6"
                  strokeWidth={2}
                  style={{ marginLeft: 7 }}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* ============================================================== */}
          {/* BASE: Citação Poética Interativa (Toque para nova frase)       */}
          {/* ============================================================== */}
          <TouchableOpacity
            onPress={handleNextQuote}
            activeOpacity={0.75}
            style={styles.bottomSection}
            accessibilityRole="button"
            accessibilityLabel="Toque para ler outra frase romântica"
          >
            <Animated.Text style={[styles.quoteFooter, { opacity: quoteFadeAnim }]}>
              {ROMANTIC_QUOTES[quoteIndex]}
            </Animated.Text>
            <Text style={styles.quoteHintText}>toque na frase para inspirar</Text>
          </TouchableOpacity>

          {/* Modal da Roleta de Encontros (Canto Superior Esquerdo) */}
          <DateNightRouletteModal
            visible={activeModal === 'roulette'}
            onClose={() => setActiveModal(null)}
          />

          {/* Modal de Viagens (Canto Superior Direito) */}
          <TravelFeedModal
            visible={activeModal === 'travels'}
            onClose={() => setActiveModal(null)}
          />

          {/* Modal de Cartas & Mensagens em Tempo Real (Canto Inferior Esquerdo 💌) */}
          <CartasModal
            visible={activeModal === 'memories'}
            onClose={() => setActiveModal(null)}
            partner1Name={coupleInfo.partner1}
            partner2Name={coupleInfo.partner2}
          />

          {/* Modal de Upload/Troca da Foto em Destaque */}
          <FeaturedMediaModal
            visible={mediaModalVisible}
            currentImage={featuredPhoto}
            currentCaption={coupleInfo.featuredCaption}
            onClose={() => setMediaModalVisible(false)}
            onSave={handleSavePhoto}
          />

          {/* Modal de Configurações (Canto Inferior Direito ⚙️) */}
          <SettingsModal
            visible={settingsModalVisible}
            coupleData={coupleInfo}
            coupleCode={coupleCode}
            onClose={() => setSettingsModalVisible(false)}
            onSave={handleSaveSettings}
            onReset={onReset}
            onUnpairCode={onUnpairCode}
            onLockApp={onLockApp}
          />

          {/* Modal do Calendário (Meio Direito 🗓️) */}
          <CalendarModal
            visible={activeModal === 'calendar'}
            onClose={() => setActiveModal(null)}
          />

          {/* Modal de Presentes (Meio Esquerdo 🎁) */}
          <GiftsModal
            visible={activeModal === 'gifts'}
            onClose={() => setActiveModal(null)}
            partner1Name={coupleInfo.partner1}
            partner2Name={coupleInfo.partner2}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  // -------------------------------------------------------------
  // Posicionamento absoluto dos 4 cantos
  // -------------------------------------------------------------
  cornerPosition: {
    position: 'absolute',
    zIndex: 20,
  },
  cornerTopLeft: {
    top: Platform.OS === 'ios' ? 78 : 88,
    left: 18,
  },
  cornerTopRight: {
    top: Platform.OS === 'ios' ? 78 : 88,
    right: 18,
  },
  cornerBottomLeft: {
    bottom: Platform.OS === 'ios' ? 16 : 22,
    left: 18,
  },
  cornerBottomRight: {
    bottom: Platform.OS === 'ios' ? 16 : 22,
    right: 18,
  },
  middleRight: {
    top: '38%',
    right: 18,
    transform: [{ translateY: -28 }],
  },
  middleLeft: {
    top: '38%',
    left: 18,
    transform: [{ translateY: -28 }],
  },

  // -------------------------------------------------------------
  // Topo: Nomes unidos, data e pílula de sintonia
  // -------------------------------------------------------------
  topSection: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 18 : 24,
    paddingHorizontal: 64,
  },
  monogramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 72,
    marginBottom: 4,
  },
  monogramLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(198, 139, 89, 0.32)',
  },
  namesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  partnerName: {
    fontSize: 29,
    fontWeight: '400',
    color: '#24202B',
    letterSpacing: -0.3,
    fontFamily:
      Platform.OS === 'ios'
        ? 'Didot'
        : Platform.OS === 'web'
        ? '"Didot", "Bodoni MT", "Playfair Display", Georgia, serif'
        : 'serif',
  },
  ampersand: {
    fontSize: 26,
    fontWeight: '300',
    color: COLORS.accent,
    fontStyle: 'italic',
    fontFamily:
      Platform.OS === 'ios'
        ? 'Didot'
        : Platform.OS === 'web'
        ? '"Didot", "Bodoni MT", "Playfair Display", Georgia, serif'
        : 'serif',
    marginHorizontal: 6,
  },
  dateSubtitle: {
    fontSize: 10.5,
    color: '#847A94',
    letterSpacing: 1.3,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    paddingVertical: 4.5,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 5,
  },
  moodEmoji: {
    fontSize: 11,
  },
  moodText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5E5370',
    letterSpacing: 0.1,
  },

  // -------------------------------------------------------------
  // Centro Exato: Widget de Mídia + Contagem
  // -------------------------------------------------------------
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 6,
  },
  portraitOuterWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  floatingHeartBubble: {
    position: 'absolute',
    top: 10,
    zIndex: 30,
  },

  // Widget Mini Portrait da Foto em Destaque (Flutuante & Refinado)
  portraitContainer: {
    width: 156,
    height: 194,
    borderRadius: 36,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.085,
    shadowRadius: 36,
    elevation: 6,
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitCaptionBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    maxWidth: 82,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any)
      : {}),
  },
  portraitCaptionText: {
    color: '#342848',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  portraitEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.88)',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any)
      : {}),
  },
  portraitEditText: {
    color: '#342848',
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loveTapBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 25,
  },
  loveTapCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D9536F',
    fontVariant: ['tabular-nums'],
  },
  emptyPortraitContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F6FA',
    padding: 12,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Container da Contagem
  centerCounterContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  counterHeaderBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 4,
    paddingHorizontal: 13,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#362248',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
      : {}),
  },
  counterHeaderBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#7E6B94',
    letterSpacing: 1.6,
  },

  // Grid dos 4 blocos de contagem compactos e uniformes
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    paddingHorizontal: 6,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#2D1B3E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 2,
  },
  metricNumber: {
    fontSize: 27,
    fontWeight: '300',
    color: '#24202C',
    letterSpacing: -0.5,
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#847D92',
    textTransform: 'lowercase',
    letterSpacing: 0.3,
  },

  // Totalizador com ponto pulsante minimalista e troca de modos
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingVertical: 6.5,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    shadowColor: '#2D1B3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
      : {}),
  },
  liveIndicator: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginRight: 8,
  },
  totalBadgeText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#463D56',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },

  // -------------------------------------------------------------
  // Base: Frases Românticas Interativas
  // -------------------------------------------------------------
  bottomSection: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 18 : 24,
    paddingHorizontal: 64,
  },
  quoteFooter: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#7E738E',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 16,
    fontFamily:
      Platform.OS === 'ios'
        ? 'Didot'
        : Platform.OS === 'web'
        ? '"Didot", "Bodoni MT", "Playfair Display", Georgia, serif'
        : 'serif',
  },
  quoteHintText: {
    fontSize: 9,
    color: '#ABA2B8',
    letterSpacing: 0.6,
    marginTop: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
