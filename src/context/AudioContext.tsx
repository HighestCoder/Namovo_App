import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactPlayer from 'react-player';
import {
  YouTubeSongInfo,
  saveYouTubeSongToFirestore,
  subscribeToCoupleDocument,
  getActiveCoupleCode,
} from '../services/firebase';
import { YouTubeSearchModal } from '../components/YouTubeSearchModal';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

export const STORAGE_YOUTUBE_SONG_KEY = '@namovo_youtube_song_v1';

export const DEFAULT_YOUTUBE_SONG: YouTubeSongInfo = {
  videoId: '2Vv-BfVoq4g',
  title: 'Ed Sheeran - Perfect',
  channelTitle: 'Ed Sheeran',
  thumbnailUrl: 'https://img.youtube.com/vi/2Vv-BfVoq4g/hqdefault.jpg',
};

interface AudioContextType {
  isPlaying: boolean;
  isLoading: boolean;
  currentSong: YouTubeSongInfo;
  searchModalVisible: boolean;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  selectSong: (song: YouTubeSongInfo) => Promise<void>;
  openSearchModal: () => void;
  closeSearchModal: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<YouTubeSongInfo>(DEFAULT_YOUTUBE_SONG);
  const [searchModalVisible, setSearchModalVisible] = useState<boolean>(false);
  const coupleCode = getActiveCoupleCode();

  // 1. Carrega a faixa salva em cache local ao inicializar o app
  useEffect(() => {
    let isMounted = true;
    const hydrateLocalSong = async () => {
      try {
        let cached = await AsyncStorage.getItem(STORAGE_YOUTUBE_SONG_KEY);
        if (
          !cached &&
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          window.localStorage
        ) {
          cached = window.localStorage.getItem(STORAGE_YOUTUBE_SONG_KEY);
        }

        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          if (parsed?.videoId) {
            setCurrentSong(parsed);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar música salva em cache local:', err);
      }
    };

    hydrateLocalSong();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Sincronização em tempo real (onSnapshot) com o documento Firestore compartilhado do casal
  // Quando qualquer um dos parceiros alterar a música, ambos os dispositivos tocam a mesma faixa!
  useEffect(() => {
    if (!coupleCode) return;

    const unsubscribe = subscribeToCoupleDocument(coupleCode, (docData) => {
      if (docData && docData.youtubeSong && docData.youtubeSong.videoId) {
        const remoteSong = docData.youtubeSong;
        setCurrentSong((prev) => {
          if (prev.videoId !== remoteSong.videoId) {
            // Salva no cache local para persistência instantânea
            AsyncStorage.setItem(STORAGE_YOUTUBE_SONG_KEY, JSON.stringify(remoteSong)).catch(() => {});
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(STORAGE_YOUTUBE_SONG_KEY, JSON.stringify(remoteSong));
            }
            return remoteSong;
          }
          return prev;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [coupleCode]);

  // Controles de Reprodução
  const play = useCallback(() => {
    triggerLightHaptic();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    triggerLightHaptic();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    triggerLightHaptic();
    setIsPlaying((prev) => !prev);
  }, []);

  // Seleciona uma nova música, persiste localmente e sincroniza na nuvem com o parceiro
  const selectSong = useCallback(
    async (newSong: YouTubeSongInfo) => {
      setCurrentSong(newSong);
      setIsPlaying(true);

      // Persiste no cache local (AsyncStorage + window.localStorage)
      try {
        await AsyncStorage.setItem(STORAGE_YOUTUBE_SONG_KEY, JSON.stringify(newSong));
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_YOUTUBE_SONG_KEY, JSON.stringify(newSong));
        }
      } catch (err) {
        console.warn('Erro ao salvar música localmente:', err);
      }

      // Sincroniza em tempo real no Firestore do casal
      try {
        await saveYouTubeSongToFirestore(newSong, coupleCode || undefined);
      } catch (err) {
        console.warn('Erro ao sincronizar música com Firestore:', err);
      }

      triggerSuccessHaptic();
    },
    [coupleCode]
  );

  const openSearchModal = useCallback(() => {
    triggerLightHaptic();
    setSearchModalVisible(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setSearchModalVisible(false);
  }, []);

  const videoUrl = `https://www.youtube.com/watch?v=${currentSong.videoId}`;

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        isLoading,
        currentSong,
        searchModalVisible,
        togglePlay,
        play,
        pause,
        selectSong,
        openSearchModal,
        closeSearchModal,
      }}
    >
      {children}

      {/* 
        Player de Áudio YouTube Global no Root
        Fica sempre montado na árvore da aplicação, garantindo que o áudio continue tocando
        sem interrupções quando o usuário abrir modais (Roleta, Cartas, Viagens, Ajustes, etc.)
      */}
      {Platform.OS === 'web' && (
        <View
          style={styles.hiddenPlayerContainer}
          pointerEvents="none"
          aria-hidden={true}
        >
          <ReactPlayer
            src={videoUrl}
            playing={isPlaying}
            controls={false}
            loop={true}
            playsInline={true}
            volume={0.9}
            width={160}
            height={90}
            onPlay={() => {
              setIsPlaying(true);
              setIsLoading(false);
            }}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            onError={(err: any) => {
              console.warn('Erro na reprodução do YouTube:', err);
              setIsLoading(false);
              setIsPlaying(false);
            }}
            config={{
              youtube: {
                enablejsapi: 1,
                rel: 0,
                playlist: currentSong.videoId,
                iv_load_policy: 3,
              },
            }}
          />
        </View>
      )}

      {/* Modal de Busca no YouTube */}
      <YouTubeSearchModal
        visible={searchModalVisible}
        onClose={closeSearchModal}
      />
    </AudioContext.Provider>
  );
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio deve ser utilizado dentro de um AudioProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  hiddenPlayerContainer: {
    position: 'absolute',
    bottom: -300,
    right: -300,
    width: 160,
    height: 90,
    opacity: 0.001,
    overflow: 'hidden',
    zIndex: -9999,
  },
});
