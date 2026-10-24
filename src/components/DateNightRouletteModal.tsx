import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  Dimensions,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Shuffle,
  Plus,
  X,
  MapPin,
  Camera,
  Star,
  Image as ImageIcon,
  Sparkles,
  Check,
  Link,
  Heart,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { RouletteLocation } from '../types';
import {
  subscribeToRouletteLocations,
  saveRouletteLocationsToFirestore,
} from '../services/firebase';
import { pickMediaFromDevice, capturePhotoFromCamera } from '../utils/mediaPicker';

interface DateNightRouletteModalProps {
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const PRESET_EMOJIS = ['🍕', '🎬', '🌿', '🎡', '🍷', '🎭', '🏖️', '🌃', '🧁', '⛵'];

const CONFETTI_COLORS = [
  '#C68B59', '#D89E6E', '#9D86C4', '#6E5D87',
  '#E8B4B8', '#A8D8A8', '#FFD700', '#FF69B4',
  '#87CEEB', '#DDA0DD', '#98FB98', '#F0E68C',
];

const NUM_CONFETTI = 30;

// Locais iniciais com fotos inspiradoras para a roleta já funcionar com efeito de confete
const INITIAL_LOCATIONS: RouletteLocation[] = [
  {
    id: 'loc-1',
    name: 'Jantar Italiano à Luz de Velas',
    emoji: '🍷',
    photoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    visitedAt: '12/06/2023',
  },
  {
    id: 'loc-2',
    name: 'Piquenique no Parque ao Entardecer',
    emoji: '🌿',
    photoUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
    visitedAt: '24/09/2023',
  },
  {
    id: 'loc-3',
    name: 'Cinema VIP com Pipoca & Chocolate',
    emoji: '🎬',
  },
  {
    id: 'loc-4',
    name: 'Noite de Pizza Artesanal & Risadas',
    emoji: '🍕',
  },
  {
    id: 'loc-5',
    name: 'Caminhada & Sorvete à Beira-Mar',
    emoji: '🏖️',
    photoUrl: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=600&q=80',
    visitedAt: '03/01/2024',
  },
  {
    id: 'loc-6',
    name: 'Cozinhar Nova Receita Juntos em Casa',
    emoji: '🍝',
  },
];

export const DateNightRouletteModal: React.FC<DateNightRouletteModalProps> = ({
  visible,
  onClose,
}) => {
  // ----- slide / fade animation -----
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ----- locations state -----
  const [locations, setLocations] = useState<RouletteLocation[]>([]);

  // ----- add-form state -----
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🍕');
  const [selectedMediaUri, setSelectedMediaUri] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  // ----- roulette state -----
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [winner, setWinner] = useState<RouletteLocation | null>(null);
  const [showCelebratoryPopUp, setShowCelebratoryPopUp] = useState(false);

  // ----- confetti -----
  const confettiAnims = useRef<Array<{ y: Animated.Value; opacity: Animated.Value }>>(
    Array.from({ length: NUM_CONFETTI }, () => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;
  const confettiX = useRef<number[]>(
    Array.from({ length: NUM_CONFETTI }, () => Math.random() * SCREEN_WIDTH)
  ).current;
  const confettiColors = useRef<string[]>(
    Array.from({ length: NUM_CONFETTI }, () => CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)])
  ).current;

  // ----- Sincronização em tempo real (onSnapshot) no Firestore -----
  useEffect(() => {
    let seeded = false;
    const unsubscribe = subscribeToRouletteLocations((remoteLocations) => {
      if (remoteLocations && remoteLocations.length > 0) {
        setLocations(remoteLocations);
      } else if (!seeded) {
        seeded = true;
        setLocations(INITIAL_LOCATIONS);
        saveRouletteLocationsToFirestore(INITIAL_LOCATIONS);
      } else {
        setLocations([]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const saveLocations = useCallback(async (updated: RouletteLocation[]) => {
    await saveRouletteLocationsToFirestore(updated);
  }, []);

  // ----- modal open / close animation -----
  useEffect(() => {
    if (visible) {
      setWinner(null);
      setSpinning(false);
      setDisplayName('');
      setShowCelebratoryPopUp(false);
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
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => onClose());
  };

  // ----- Dispositivo: Escolher Mídia da Galeria -----
  const handlePickDeviceMedia = async () => {
    const uris = await pickMediaFromDevice({ allowsMultiple: false, mediaTypes: 'all' });
    if (uris.length > 0) {
      setSelectedMediaUri(uris[0]);
    }
  };

  // ----- Dispositivo: Tirar Foto com a Câmera -----
  const handleCaptureCamera = async () => {
    const uri = await capturePhotoFromCamera();
    if (uri) {
      setSelectedMediaUri(uri);
    }
  };

  // ----- add location -----
  const handleAddLocation = async () => {
    if (!newName.trim()) return;

    const finalPhoto = selectedMediaUri || manualUrl.trim() || undefined;

    const newLoc: RouletteLocation = {
      id: Date.now().toString(),
      name: newName.trim(),
      emoji: newEmoji,
      photoUrl: finalPhoto,
      visitedAt: finalPhoto ? 'Visitado pelo casal' : undefined,
    };

    const updated = [...locations, newLoc];
    setLocations(updated);
    await saveLocations(updated);

    // Reset formulário
    setNewName('');
    setNewEmoji('🍕');
    setSelectedMediaUri(null);
    setManualUrl('');
    setShowUrlFallback(false);
    setShowAddForm(false);
  };

  // ----- delete location -----
  const handleDelete = async (id: string) => {
    const updated = locations.filter(l => l.id !== id);
    setLocations(updated);
    await saveLocations(updated);
    if (winner?.id === id) {
      setWinner(null);
      setShowCelebratoryPopUp(false);
    }
  };

  // ----- confetti animation -----
  const fireConfetti = () => {
    confettiAnims.forEach(anim => {
      anim.y.setValue(0);
      anim.opacity.setValue(1);
    });

    const animations = confettiAnims.map(anim => {
      const dropDuration = 1800 + Math.random() * 800;
      return Animated.parallel([
        Animated.timing(anim.y, {
          toValue: SCREEN_HEIGHT * 0.75,
          duration: dropDuration,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: dropDuration,
          delay: dropDuration * 0.5,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]);
    });

    Animated.parallel(animations).start();
  };

  // ----- spin roulette -----
  const handleSpin = () => {
    if (locations.length === 0 || spinning) return;

    setSpinning(true);
    setWinner(null);
    setShowCelebratoryPopUp(false);

    const totalDuration = 2500;
    const intervalStart = 80;
    const intervalEnd = 350;
    let elapsed = 0;
    let currentInterval = intervalStart;

    const tick = () => {
      const randomLoc = locations[Math.floor(Math.random() * locations.length)];
      setDisplayName(`${randomLoc.emoji} ${randomLoc.name}`);
      elapsed += currentInterval;
      currentInterval = intervalStart + ((intervalEnd - intervalStart) * elapsed) / totalDuration;

      if (elapsed < totalDuration) {
        setTimeout(tick, currentInterval);
      } else {
        // Sorteio final
        const picked = locations[Math.floor(Math.random() * locations.length)];
        setDisplayName(`${picked.emoji} ${picked.name}`);
        setWinner(picked);
        setSpinning(false);

        // Se o local tem foto registrada do casal, dispara o confete e abre o pop-up comemorativo!
        if (picked.photoUrl) {
          setShowCelebratoryPopUp(true);
          setTimeout(() => fireConfetti(), 100);
        }
      }
    };

    setTimeout(tick, currentInterval);
  };

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
          <TouchableWithoutFeedback>
            <Animated.View
              style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}
            >
              {/* Grabber */}
              <View style={styles.grabber} />

              {/* Close button */}
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
              </TouchableOpacity>

              {/* Title */}
              <View style={styles.titleRow}>
                <Star size={20} color={COLORS.accent} strokeWidth={1.8} />
                <Text style={styles.title}>Roleta de Encontros</Text>
              </View>
              <Text style={styles.subtitle}>
                Não sabem onde ir hoje? Deixem o destino decidir o próximo capítulo de vocês!
              </Text>

              {/* Confetti particles */}
              {confettiAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  pointerEvents="none"
                  style={[
                    styles.confettiParticle,
                    {
                      backgroundColor: confettiColors[i],
                      left: confettiX[i],
                      opacity: anim.opacity,
                      transform: [{ translateY: anim.y }],
                    },
                  ]}
                />
              ))}

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.innerWrapper}>
                    {/* ---- Locais salvos ---- */}
                    <View style={styles.locationsHeader}>
                      <Text style={styles.sectionTitle}>
                        Locais Cadastrados ({locations.length})
                      </Text>
                      <Text style={styles.locationsSubtitle}>
                        Locais com foto ativam a celebração com confetes!
                      </Text>
                    </View>

                    {locations.length === 0 ? (
                      <View style={styles.emptyState}>
                        <MapPin size={32} color={COLORS.accent} strokeWidth={1.5} />
                        <Text style={styles.emptyTitle}>Nenhum local cadastrado</Text>
                        <Text style={styles.emptyText}>
                          Adicione seus restaurantes favoritos, parques ou ideias de encontro abaixo.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.chipsContainer}>
                        {locations.map(loc => (
                          <View key={loc.id} style={styles.chip}>
                            {loc.photoUrl ? (
                              <Image
                                source={{ uri: loc.photoUrl }}
                                style={styles.chipPhoto as any}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={styles.chipEmoji}>{loc.emoji}</Text>
                            )}
                            <Text style={styles.chipName} numberOfLines={1}>
                              {loc.name}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDelete(loc.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.chipDelete}
                            >
                              <X size={12} color={COLORS.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* ---- Formulário de Adicionar Local com Seletor do Dispositivo ---- */}
                    {showAddForm ? (
                      <View style={styles.addForm}>
                        <Text style={styles.formTitle}>Novo Local de Encontro</Text>

                        <Text style={styles.formLabel}>Nome do local ou ideia</Text>
                        <TextInput
                          style={styles.textInput}
                          value={newName}
                          onChangeText={setNewName}
                          placeholder="Ex: Rooftop Bar, Praia Secreta..."
                          placeholderTextColor={COLORS.textLight}
                          autoFocus
                          returnKeyType="done"
                        />

                        <Text style={styles.formLabel}>Escolha um ícone</Text>
                        <View style={styles.emojiRow}>
                          {PRESET_EMOJIS.map(em => (
                            <TouchableOpacity
                              key={em}
                              onPress={() => setNewEmoji(em)}
                              style={[
                                styles.emojiOption,
                                newEmoji === em && styles.emojiOptionSelected,
                              ]}
                            >
                              <Text style={styles.emojiText}>{em}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* SELETOR DE MÍDIA DO DISPOSITIVO (Substitui campo de texto de URL) */}
                        <Text style={styles.formLabel}>
                          <Camera size={13} color={COLORS.accent} strokeWidth={2} />
                          {'  '}Foto da Visita do Casal (Galeria / Câmera)
                        </Text>

                        {selectedMediaUri ? (
                          <View style={styles.mediaSelectedCard}>
                            <Image
                              source={{ uri: selectedMediaUri }}
                              style={styles.mediaPreviewThumb}
                              resizeMode="cover"
                            />
                            <View style={styles.mediaSelectedInfo}>
                              <View style={styles.mediaBadge}>
                                <Check size={11} color="#FFFFFF" strokeWidth={3} />
                                <Text style={styles.mediaBadgeText}>Mídia do Aparelho</Text>
                              </View>
                              <Text style={styles.mediaSelectedHint}>Foto pronta para o confete!</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => setSelectedMediaUri(null)}
                              style={styles.removeMediaBtn}
                            >
                              <X size={14} color="#FFFFFF" strokeWidth={2.4} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.pickerButtonsRow}>
                            <TouchableOpacity
                              onPress={handlePickDeviceMedia}
                              activeOpacity={0.85}
                              style={styles.pickerBtnPrimary}
                            >
                              <ImageIcon size={16} color={COLORS.accent} strokeWidth={2} />
                              <Text style={styles.pickerBtnPrimaryText}>Escolher da Galeria</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={handleCaptureCamera}
                              activeOpacity={0.85}
                              style={styles.pickerBtnSecondary}
                            >
                              <Camera size={16} color={COLORS.textSecondary} strokeWidth={2} />
                              <Text style={styles.pickerBtnSecondaryText}>Tirar Foto</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Fallback opcional para link se desejar */}
                        {!selectedMediaUri && (
                          <View style={{ marginTop: 8 }}>
                            <TouchableOpacity
                              onPress={() => setShowUrlFallback(!showUrlFallback)}
                              style={styles.linkFallbackToggle}
                            >
                              <Link size={12} color={COLORS.textMuted} />
                              <Text style={styles.linkFallbackToggleText}>
                                {showUrlFallback ? 'Ocultar campo de link' : 'Ou colar link de imagem da web'}
                              </Text>
                            </TouchableOpacity>
                            {showUrlFallback && (
                              <TextInput
                                style={[styles.textInput, { marginTop: 6, fontSize: 13 }]}
                                value={manualUrl}
                                onChangeText={setManualUrl}
                                placeholder="https://..."
                                placeholderTextColor={COLORS.textLight}
                                autoCapitalize="none"
                              />
                            )}
                          </View>
                        )}

                        <View style={styles.formActions}>
                          <TouchableOpacity
                            onPress={() => {
                              setShowAddForm(false);
                              setSelectedMediaUri(null);
                            }}
                            style={styles.cancelBtn}
                          >
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleAddLocation}
                            style={[styles.saveBtn, !newName.trim() && styles.saveBtnDisabled]}
                            disabled={!newName.trim()}
                          >
                            <Text style={styles.saveBtnText}>Salvar Local</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setShowAddForm(true)}
                        style={styles.addButton}
                        activeOpacity={0.8}
                      >
                        <Plus size={16} color={COLORS.accent} strokeWidth={2.4} />
                        <Text style={styles.addButtonText}>Adicionar Novo Local</Text>
                      </TouchableOpacity>
                    )}

                    {/* ---- Display da Roleta ---- */}
                    <View style={styles.rouletteSection}>
                      {(spinning || winner) ? (
                        <View style={styles.rouletteDisplay}>
                          <Text style={styles.rouletteDisplayText} numberOfLines={1}>
                            {displayName}
                          </Text>
                        </View>
                      ) : null}

                      {/* Botão Principal de Girar */}
                      <TouchableOpacity
                        onPress={handleSpin}
                        disabled={locations.length === 0 || spinning}
                        style={[
                          styles.spinButton,
                          (locations.length === 0 || spinning) && styles.spinButtonDisabled,
                        ]}
                        activeOpacity={0.85}
                      >
                        <Shuffle size={20} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={styles.spinButtonText}>
                          {spinning ? 'Girando o Destino...' : 'Girar Roleta 🎰'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* ---- Pop-up / Card Celebratório de Encontro Sorteado ---- */}
                    {winner && !spinning && (
                      <View style={styles.winnerCard}>
                        {winner.photoUrl ? (
                          <View style={styles.winnerPhotoWrapper}>
                            <Image
                              source={{ uri: winner.photoUrl }}
                              style={styles.winnerPhoto as any}
                              resizeMode="cover"
                            />
                            <View style={styles.celebrationBadge}>
                              <Sparkles size={12} color="#FFFFFF" strokeWidth={2.5} />
                              <Text style={styles.celebrationBadgeText}>MOMENTO DO CASAL</Text>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.winnerEmojiBig}>{winner.emoji}</Text>
                        )}

                        <Text style={styles.winnerLabel}>🎉 Próximo Encontro Escolhido:</Text>
                        <Text style={styles.winnerName}>{winner.name}</Text>
                        <Text style={styles.winnerSubtext}>
                          {winner.photoUrl
                            ? 'Vocês já viveram momentos inesquecíveis aqui! Que tal reviver hoje?'
                            : 'Uma nova lembrança pronta para ser criada a dois!'}
                        </Text>

                        <TouchableOpacity
                          onPress={() => setWinner(null)}
                          style={styles.dismissWinnerBtn}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.dismissWinnerBtnText}>Combinado! ❤️</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </Animated.View>
          </TouchableWithoutFeedback>
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
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    maxHeight: '88%',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
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
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  innerWrapper: {
    width: '100%',
  },

  // ---- Locais salvos ----
  locationsHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  locationsSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  // ---- Chips ----
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSubtle,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    maxWidth: 180,
  },
  chipPhoto: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  chipDelete: {
    padding: 2,
  },

  // ---- Add form ----
  addForm: {
    backgroundColor: '#FAF9F7',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.3)',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentDark,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiOptionSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  emojiText: {
    fontSize: 18,
  },

  // Picker de Mídia do Dispositivo
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  pickerBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  pickerBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  pickerBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  pickerBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mediaSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    gap: 10,
  },
  mediaPreviewThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  mediaSelectedInfo: {
    flex: 1,
  },
  mediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  mediaSelectedHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  removeMediaBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkFallbackToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  linkFallbackToggleText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#EFECE6',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
    backgroundColor: COLORS.accentSoft,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // ---- Roulette ----
  rouletteSection: {
    alignItems: 'center',
    gap: 14,
  },
  rouletteDisplay: {
    width: '100%',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder,
    alignItems: 'center',
  },
  rouletteDisplayText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accentDark,
    letterSpacing: -0.3,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 36,
    gap: 10,
    width: '100%',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ---- Winner Card & Celebratory Pop-up ----
  winnerCard: {
    width: '100%',
    backgroundColor: '#FAFAF8',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder,
    gap: 8,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  winnerPhotoWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  winnerPhoto: {
    width: 140,
    height: 140,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  celebrationBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  celebrationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  winnerEmojiBig: {
    fontSize: 52,
    marginBottom: 4,
  },
  winnerLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  winnerName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  winnerSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  dismissWinnerBtn: {
    marginTop: 10,
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  dismissWinnerBtnText: {
    color: COLORS.accentDark,
    fontSize: 13,
    fontWeight: '700',
  },

  // ---- Confetti ----
  confettiParticle: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
