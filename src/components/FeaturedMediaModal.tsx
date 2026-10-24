import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { X, Camera, Image as ImageIcon, Sparkles, Check, Link, UploadCloud } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { pickMediaFromDevice, capturePhotoFromCamera } from '../utils/mediaPicker';

interface FeaturedMediaModalProps {
  visible: boolean;
  currentImage?: string;
  currentCaption?: string;
  onClose: () => void;
  onSave: (imageUrl: string, caption?: string) => void;
}

// Belas fotos de casais com estética sofisticada e elegante (Unsplash curated)
export const CURATED_COUPLE_PHOTOS = [
  {
    id: '1',
    title: 'Pôr do Sol Dourado',
    url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '2',
    title: 'Abraço Romântico',
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '3',
    title: 'Passeio a Dois',
    url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '4',
    title: 'Café & Conversas',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '5',
    title: 'Mãos Dadas',
    url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
  },
];

export const DEFAULT_FEATURED_IMAGE = CURATED_COUPLE_PHOTOS[0].url;

export const FeaturedMediaModal: React.FC<FeaturedMediaModalProps> = ({
  visible,
  currentImage = DEFAULT_FEATURED_IMAGE,
  currentCaption = 'Nosso Momento em Destaque',
  onClose,
  onSave,
}) => {
  const [selectedImage, setSelectedImage] = useState(currentImage);
  const [caption, setCaption] = useState(currentCaption);
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setSelectedImage(currentImage);
      setCaption(currentCaption);
      setUploadSuccess(false);
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
  }, [visible, currentImage, currentCaption, fadeAnim, slideAnim]);

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

  const handlePickFromGallery = async () => {
    const uris = await pickMediaFromDevice({ allowsMultiple: false, aspect: [16, 9] });
    if (uris.length > 0) {
      setSelectedImage(uris[0]);
      setUploadSuccess(true);
    }
  };

  const handleCaptureFromCamera = async () => {
    const uri = await capturePhotoFromCamera();
    if (uri) {
      setSelectedImage(uri);
      setUploadSuccess(true);
    }
  };

  const handleApplyPreset = (url: string) => {
    setSelectedImage(url);
    setUploadSuccess(true);
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    setSelectedImage(trimmed);
    setUploadSuccess(true);
    setShowUrlInput(false);
  };

  const handleConfirmSave = () => {
    onSave(selectedImage, caption.trim() || 'Nosso Momento em Destaque');
    handleClose();
  };

  if (!visible) return null;

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
              style={[
                styles.modalCard,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.grabber} />

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
                  <Text style={styles.badgeText}>FOTO DO CASAL</Text>
                </View>
                <Text style={styles.title}>Momento em Destaque</Text>
                <Text style={styles.subtitle}>
                  Escolha uma foto da galeria do seu aparelho ou tire uma nova para o coração do app.
                </Text>
              </View>

              {/* Preview da Foto Selecionada */}
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage as any}
                  resizeMode="cover"
                />
                <View style={styles.previewOverlayBadge}>
                  <Camera size={13} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.previewOverlayText}>Pré-visualização</Text>
                </View>
              </View>

              {/* Edição do Título/Legenda do Momento */}
              <View style={styles.captionInputBox}>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Nome do momento (ex: Nosso Momento em Destaque)"
                  placeholderTextColor={COLORS.textLight}
                  style={[styles.captionInput, Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)]}
                  maxLength={40}
                />
              </View>

              {/* Botões Principais de Upload do Dispositivo (Galeria e Câmera) */}
              <View style={styles.deviceActionsRow}>
                <TouchableOpacity
                  onPress={handlePickFromGallery}
                  activeOpacity={0.85}
                  style={styles.galleryButton}
                >
                  <ImageIcon size={17} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.galleryButtonText}>Escolher da Galeria</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCaptureFromCamera}
                  activeOpacity={0.85}
                  style={styles.cameraButton}
                >
                  <Camera size={17} color={COLORS.accentDark} strokeWidth={2.2} />
                  <Text style={styles.cameraButtonText}>Tirar Foto</Text>
                </TouchableOpacity>
              </View>

              {/* Opção secundária: Inserir Link */}
              <TouchableOpacity
                onPress={() => setShowUrlInput(!showUrlInput)}
                activeOpacity={0.7}
                style={styles.linkToggleBtn}
              >
                <Link size={14} color={COLORS.textSecondary} strokeWidth={2} />
                <Text style={styles.linkToggleText}>
                  {showUrlInput ? 'Ocultar inserção por link' : 'Ou colar URL de imagem da web'}
                </Text>
              </TouchableOpacity>

              {/* Campo para colar URL personalizada se desejado */}
              {showUrlInput ? (
                <View style={styles.urlInputBox}>
                  <TextInput
                    value={customUrl}
                    onChangeText={setCustomUrl}
                    placeholder="Cole o link da imagem (https://...)"
                    placeholderTextColor={COLORS.textLight}
                    style={[styles.urlInput, Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={handleApplyCustomUrl}
                    style={styles.urlApplyBtn}
                  >
                    <Text style={styles.urlApplyBtnText}>Aplicar</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Carrossel de Fotos Pré-selecionadas Inspiradoras */}
              <Text style={styles.sectionLabel}>Ou selecione um modelo comemorativo:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsList}
              >
                {CURATED_COUPLE_PHOTOS.map((photo) => {
                  const isSelected = selectedImage === photo.url;
                  return (
                    <TouchableOpacity
                      key={photo.id}
                      onPress={() => handleApplyPreset(photo.url)}
                      activeOpacity={0.8}
                      style={[
                        styles.presetCard,
                        isSelected && styles.presetCardSelected,
                      ]}
                    >
                      <Image
                        source={{ uri: photo.url }}
                        style={styles.presetThumb as any}
                        resizeMode="cover"
                      />
                      {isSelected ? (
                        <View style={styles.presetSelectedBadge}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Botão de Confirmação */}
              <TouchableOpacity
                onPress={handleConfirmSave}
                activeOpacity={0.88}
                style={styles.saveButton}
              >
                <Check size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>Confirmar e Salvar Momento</Text>
              </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    maxHeight: '90%',
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
    marginBottom: 14,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  previewContainer: {
    width: '100%',
    height: 145,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.9)',
    marginBottom: 12,
    backgroundColor: '#F7F4FA',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(35, 30, 45, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 6,
  },
  previewOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  captionInputBox: {
    backgroundColor: '#FAFAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 42,
    justifyContent: 'center',
    marginBottom: 14,
  },
  captionInput: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  deviceActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  galleryButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    height: 46,
    gap: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  galleryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 14,
    height: 46,
    gap: 8,
  },
  cameraButtonText: {
    color: COLORS.accentDark,
    fontSize: 13,
    fontWeight: '600',
  },
  linkToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  linkToggleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  urlInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 42,
  },
  urlInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  urlApplyBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  urlApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsList: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
    marginBottom: 16,
  },
  presetCard: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  presetCardSelected: {
    borderColor: COLORS.accent,
    transform: [{ scale: 1.05 }],
  },
  presetThumb: {
    width: '100%',
    height: '100%',
  },
  presetSelectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
});
