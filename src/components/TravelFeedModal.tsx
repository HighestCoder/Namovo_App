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
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plane,
  MapPin,
  Calendar,
  Plus,
  X,
  Camera,
  ArrowLeft,
  Sparkles,
  Heart,
  Image as ImageIcon,
  Check,
  Link,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { Trip } from '../types';
import {
  subscribeToTrips,
  saveTripsToFirestore,
} from '../services/firebase';
import { applyDateMask, parseDateInputToISO, formatElegantDate } from '../utils/timeCalculation';
import { pickMediaFromDevice, capturePhotoFromCamera } from '../utils/mediaPicker';

interface TravelFeedModalProps {
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const PRESET_EMOJIS = ['✈️', '🌍', '🏝️', '🗺️', '🏔️', '🌆', '🚢', '🎒', '🏖️', '🥂'];

const INITIAL_TRIPS: Trip[] = [
  {
    id: 'trip-1',
    destination: 'Gramado & Serra Gaúcha',
    date: '15/07/2023',
    emoji: '🏔️',
    caption: 'Frio aconchegante, fondue de chocolate e nosso abraço mais quentinho.',
    photos: [
      'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80',
    ],
  },
  {
    id: 'trip-2',
    destination: 'Praias de Fernando de Noronha',
    date: '10/01/2024',
    emoji: '🏝️',
    caption: 'Mergulho com tartarugas, águas cristalinas e a certeza de que viajar com você é viver o paraíso.',
    photos: [
      'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
    ],
  },
];

export const TravelFeedModal: React.FC<TravelFeedModalProps> = ({ visible, onClose }) => {
  // ----- fade/slide animation -----
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ----- state -----
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showForm, setShowForm] = useState(false);

  // ----- form state -----
  const [formDestination, setFormDestination] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formEmoji, setFormEmoji] = useState('✈️');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [manualPhotoUrl, setManualPhotoUrl] = useState('');
  const [showManualLinkInput, setShowManualLinkInput] = useState(false);

  // ----- Sincronização em tempo real (onSnapshot) no Firestore -----
  useEffect(() => {
    let seeded = false;
    const unsubscribe = subscribeToTrips((remoteTrips) => {
      if (remoteTrips && remoteTrips.length > 0) {
        setTrips(remoteTrips);
      } else if (!seeded) {
        seeded = true;
        setTrips(INITIAL_TRIPS);
        saveTripsToFirestore(INITIAL_TRIPS);
      } else {
        setTrips([]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const saveTrips = useCallback(async (updated: Trip[]) => {
    await saveTripsToFirestore(updated);
  }, []);

  // ----- modal animations -----
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      fadeAnim.setValue(0);
      setShowForm(false);
      formSlideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible, fadeAnim, formSlideAnim]);

  const openForm = () => {
    setShowForm(true);
    Animated.spring(formSlideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const closeForm = () => {
    Animated.timing(formSlideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setShowForm(false);
      resetForm();
    });
  };

  const resetForm = () => {
    setFormDestination('');
    setFormDate('');
    setFormCaption('');
    setFormEmoji('✈️');
    setFormPhotos([]);
    setManualPhotoUrl('');
    setShowManualLinkInput(false);
  };

  // ----- Dispositivo: Selecionar Fotos/Vídeos da Galeria -----
  const handlePickGalleryMedia = async () => {
    const uris = await pickMediaFromDevice({ allowsMultiple: true, mediaTypes: 'all' });
    if (uris.length > 0) {
      setFormPhotos(prev => [...prev, ...uris]);
    }
  };

  // ----- Dispositivo: Capturar com Câmera -----
  const handleCaptureCameraMedia = async () => {
    const uri = await capturePhotoFromCamera();
    if (uri) {
      setFormPhotos(prev => [...prev, uri]);
    }
  };

  // ----- Fallback: Adicionar link manual de foto -----
  const handleAddManualPhoto = () => {
    if (!manualPhotoUrl.trim()) return;
    setFormPhotos(prev => [...prev, manualPhotoUrl.trim()]);
    setManualPhotoUrl('');
    setShowManualLinkInput(false);
  };

  // ----- Salvar Nova Viagem -----
  const handleSaveTrip = async () => {
    if (!formDestination.trim()) return;

    const newTrip: Trip = {
      id: Date.now().toString(),
      destination: formDestination.trim(),
      date: formDate.trim() || 'Data especial',
      caption: formCaption.trim(),
      emoji: formEmoji,
      photos: formPhotos,
    };

    const updated = [newTrip, ...trips];
    setTrips(updated);
    await saveTrips(updated);
    closeForm();
  };

  // ----- Excluir Viagem -----
  const handleDeleteTrip = async (id: string) => {
    const updated = trips.filter(t => t.id !== id);
    setTrips(updated);
    await saveTrips(updated);
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientMiddle, COLORS.gradientBottom, COLORS.gradientBottomAlt]}
        locations={[0, 0.35, 0.78, 1]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.backButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ArrowLeft size={22} color={COLORS.textPrimary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <View style={styles.headerBadge}>
                <Plane size={11} color={COLORS.accent} />
                <Text style={styles.headerBadgeText}>DIÁRIO A DOIS</Text>
              </View>
              <Text style={styles.headerTitle}>Nossas Viagens</Text>
            </View>

            {/* Botão de Adicionar Viagem */}
            <TouchableOpacity
              onPress={openForm}
              style={styles.addTripHeaderBtn}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addTripHeaderBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {/* Feed de Viagens */}
          {trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Plane size={36} color={COLORS.accent} strokeWidth={1.6} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma viagem registrada</Text>
              <Text style={styles.emptySubtitle}>
                Comece a registrar os destinos inesquecíveis que vocês já exploraram juntos pelo mundo.
              </Text>
              <TouchableOpacity
                onPress={openForm}
                style={styles.emptyAddBtn}
                activeOpacity={0.88}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.emptyAddBtnText}>Registrar Primeira Viagem</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.feedContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.feedSummary}>
                {trips.length} {trips.length === 1 ? 'destino eterno' : 'destinos eternizados'} pelo casal
              </Text>

              {trips.map(trip => (
                <View key={trip.id} style={styles.tripCard}>
                  {/* Foto de Capa com Overlay */}
                  <View style={styles.coverWrapper}>
                    {trip.photos.length > 0 ? (
                      <Image
                        source={{ uri: trip.photos[0] }}
                        style={styles.coverPhoto as any}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={[COLORS.gradientMiddle, COLORS.gradientBottomAlt]}
                        style={styles.coverPlaceholder}
                      >
                        <Text style={styles.coverPlaceholderEmoji}>{trip.emoji}</Text>
                      </LinearGradient>
                    )}

                    <LinearGradient
                      colors={['transparent', 'rgba(18, 14, 26, 0.82)']}
                      style={styles.coverGradient}
                    >
                      <View style={styles.coverInfo}>
                        <View style={styles.coverTopRow}>
                          <Text style={styles.tripEmojiBadge}>{trip.emoji}</Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteTrip(trip.id)}
                            style={styles.deleteTripBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <X size={14} color="#FFFFFF" strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.tripDestination}>{trip.destination}</Text>
                        <View style={styles.tripDateRow}>
                          <Calendar size={12} color="#E8E4EC" />
                          <Text style={styles.tripDate}>{trip.date}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Legenda e miniaturas extras */}
                  <View style={styles.tripDetails}>
                    {trip.caption ? (
                      <Text style={styles.tripCaption}>“{trip.caption}”</Text>
                    ) : null}

                    {trip.photos.length > 1 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.thumbsRow}
                      >
                        {trip.photos.slice(1).map((p, i) => (
                          <Image
                            key={i}
                            source={{ uri: p }}
                            style={styles.thumb as any}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Form Sheet para Adicionar Nova Viagem */}
          {showForm && (
            <Animated.View
              style={[
                styles.formBackdrop,
                {
                  transform: [{ translateY: formSlideAnim }],
                },
              ]}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              >
                <View style={styles.formCard}>
                  <View style={styles.formGrabber} />

                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>Registrar Nova Viagem</Text>
                    <TouchableOpacity
                      onPress={closeForm}
                      style={styles.formCloseBtn}
                    >
                      <X size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.formScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* Destino */}
                    <Text style={styles.formLabel}>Destino / Cidade</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formDestination}
                      onChangeText={setFormDestination}
                      placeholder="Ex: Paris, Rio de Janeiro, Ushuaia..."
                      placeholderTextColor={COLORS.textLight}
                    />

                    {/* Data */}
                    <Text style={styles.formLabel}>Data da viagem (DD/MM/AAAA)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formDate}
                      onChangeText={t => setFormDate(applyDateMask(t))}
                      placeholder="Ex: 15/07/2023"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="numeric"
                      maxLength={10}
                    />

                    {/* Legenda */}
                    <Text style={styles.formLabel}>Mensagem / Memória especial</Text>
                    <TextInput
                      style={[styles.formInput, styles.formTextArea]}
                      value={formCaption}
                      onChangeText={setFormCaption}
                      placeholder="O que tornou esse momento inesquecível a dois..."
                      placeholderTextColor={COLORS.textLight}
                      multiline
                      maxLength={200}
                    />

                    {/* Emoji */}
                    <Text style={styles.formLabel}>Ícone representativo</Text>
                    <View style={styles.emojiRow}>
                      {PRESET_EMOJIS.map(em => (
                        <TouchableOpacity
                          key={em}
                          onPress={() => setFormEmoji(em)}
                          style={[
                            styles.emojiOption,
                            formEmoji === em && styles.emojiOptionSelected,
                          ]}
                        >
                          <Text style={styles.emojiText}>{em}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* SELEÇÃO DE MÍDIA DO DISPOSITIVO */}
                    <Text style={styles.formLabel}>
                      <Camera size={13} color={COLORS.accent} strokeWidth={2} />
                      {'  '}Fotos & Vídeos da Viagem (Dispositivo)
                    </Text>

                    <View style={styles.mediaPickerOptionsRow}>
                      <TouchableOpacity
                        onPress={handlePickGalleryMedia}
                        style={styles.mediaPickerPrimaryBtn}
                        activeOpacity={0.85}
                      >
                        <ImageIcon size={16} color={COLORS.accent} strokeWidth={2} />
                        <Text style={styles.mediaPickerPrimaryBtnText}>Escolher da Galeria</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleCaptureCameraMedia}
                        style={styles.mediaPickerSecondaryBtn}
                        activeOpacity={0.85}
                      >
                        <Camera size={16} color={COLORS.textSecondary} strokeWidth={2} />
                        <Text style={styles.mediaPickerSecondaryBtnText}>Tirar Foto</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Fallback para link manual */}
                    <TouchableOpacity
                      onPress={() => setShowManualLinkInput(!showManualLinkInput)}
                      style={styles.linkToggleBtn}
                    >
                      <Link size={12} color={COLORS.textMuted} />
                      <Text style={styles.linkToggleBtnText}>
                        {showManualLinkInput ? 'Ocultar campo de link' : 'Ou colar URL de imagem web'}
                      </Text>
                    </TouchableOpacity>

                    {showManualLinkInput && (
                      <View style={styles.photoInputRow}>
                        <TextInput
                          style={[styles.formInput, styles.photoInput]}
                          value={manualPhotoUrl}
                          onChangeText={setManualPhotoUrl}
                          placeholder="https://..."
                          placeholderTextColor={COLORS.textLight}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={handleAddManualPhoto}
                          style={styles.photoAddBtn}
                          disabled={!manualPhotoUrl.trim()}
                        >
                          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Miniaturas de fotos adicionadas */}
                    {formPhotos.length > 0 && (
                      <View style={styles.previewSection}>
                        <Text style={styles.previewSectionTitle}>
                          Mídias selecionadas ({formPhotos.length}):
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.previewRow}
                        >
                          {formPhotos.map((p, i) => (
                            <View key={i} style={styles.previewThumbWrapper}>
                              <Image
                                source={{ uri: p }}
                                style={styles.previewThumb as any}
                                resizeMode="cover"
                              />
                              <TouchableOpacity
                                onPress={() => setFormPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                style={styles.previewThumbDelete}
                              >
                                <X size={10} color="#FFFFFF" strokeWidth={3} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Botão Salvar Viagem */}
                    <TouchableOpacity
                      onPress={handleSaveTrip}
                      style={[
                        styles.saveBtn,
                        !formDestination.trim() && styles.saveBtnDisabled,
                      ]}
                      disabled={!formDestination.trim()}
                      activeOpacity={0.85}
                    >
                      <Plane size={18} color="#FFFFFF" strokeWidth={2} style={{ marginRight: 8 }} />
                      <Text style={styles.saveBtnText}>Salvar Viagem no Álbum</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(157, 134, 196, 0.18)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
    marginBottom: 2,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  addTripHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    gap: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  addTripHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Feed
  feedContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 140,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  feedSummary: {
    fontSize: 12,
    color: '#6F568A',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
    textAlign: 'center',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.85)',
    shadowColor: '#362248',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  coverWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderEmoji: {
    fontSize: 54,
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  coverInfo: {
    gap: 4,
  },
  coverTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tripEmojiBadge: {
    fontSize: 20,
  },
  deleteTripBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripDestination: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  tripDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripDate: {
    fontSize: 12,
    color: '#EDE8F5',
    fontWeight: '500',
  },
  tripDetails: {
    padding: 16,
    gap: 12,
  },
  tripCaption: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  thumbsRow: {
    gap: 8,
    paddingTop: 4,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Form sheet
  formBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 16, 28, 0.55)',
    justifyContent: 'flex-end',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  formGrabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD9D2',
    alignSelf: 'center',
    marginBottom: 12,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  formCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5F3EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    paddingBottom: 24,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAF8',
  },
  formTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
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
    backgroundColor: '#FAFAF8',
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

  // Media picker do dispositivo
  mediaPickerOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  mediaPickerPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 12,
    paddingVertical: 11,
    gap: 6,
  },
  mediaPickerPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  mediaPickerSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 11,
    gap: 6,
  },
  mediaPickerSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  linkToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkToggleBtnText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  photoInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  photoInput: {
    flex: 1,
    fontSize: 13,
  },
  photoAddBtn: {
    backgroundColor: COLORS.accent,
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSection: {
    marginTop: 10,
    gap: 6,
  },
  previewSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  previewRow: {
    gap: 10,
    paddingVertical: 4,
  },
  previewThumbWrapper: {
    position: 'relative',
    width: 58,
    height: 58,
  },
  previewThumb: {
    width: 58,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewThumbDelete: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C85A54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 52,
    marginTop: 20,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
