import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import {
  STORAGE_MUSIC_URI_KEY,
  STORAGE_MUSIC_TITLE_KEY,
} from '../constants/storage';
import {
  DEFAULT_MUSIC_TITLE,
  getDefaultMusicUri,
} from '../constants/defaultMusic';
import { saveMediaToIndexedDB, getMediaFromIndexedDB } from '../utils/webIndexedDB';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../utils/haptics';

interface AudioContextType {
  isPlaying: boolean;
  songTitle: string;
  songUri: string | null;
  isLoading: boolean;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  uploadSong: () => Promise<boolean>;
  resetToDefault: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [songTitle, setSongTitle] = useState<string>(DEFAULT_MUSIC_TITLE);
  const [songUri, setSongUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Instância de áudio nativo (HTMLAudioElement na Web ou Audio.Sound no Nativo)
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const nativeSoundRef = useRef<Audio.Sound | null>(null);

  // Limpa instâncias de áudio ao desmontar
  const cleanupAudioInstance = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.src = '';
        webAudioRef.current = null;
      }
    } else {
      if (nativeSoundRef.current) {
        try {
          await nativeSoundRef.current.stopAsync();
          await nativeSoundRef.current.unloadAsync();
        } catch (_) {}
        nativeSoundRef.current = null;
      }
    }
  }, []);

  // 1. Carrega a preferência de música salva do AsyncStorage / IndexedDB ao montar
  // NOTA: Em estrito respeito às políticas do iOS Safari e navegadores modernos, NÃO força autoplay no boot.
  useEffect(() => {
    let isMounted = true;

    const loadSavedMusic = async () => {
      try {
        let storedUri = await AsyncStorage.getItem(STORAGE_MUSIC_URI_KEY);
        let storedTitle = await AsyncStorage.getItem(STORAGE_MUSIC_TITLE_KEY);

        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          if (!storedUri) storedUri = window.localStorage.getItem(STORAGE_MUSIC_URI_KEY);
          if (!storedTitle) storedTitle = window.localStorage.getItem(STORAGE_MUSIC_TITLE_KEY);
        }

        let resolvedUri: string | null = null;

        if (storedUri) {
          if (storedUri.startsWith('indexeddb:')) {
            const dbId = storedUri.replace('indexeddb:', '');
            const dataUrl = await getMediaFromIndexedDB(dbId);
            resolvedUri = dataUrl;
          } else {
            resolvedUri = storedUri;
          }
        }

        if (!resolvedUri) {
          resolvedUri = getDefaultMusicUri();
        }

        if (isMounted) {
          setSongUri(resolvedUri);
          if (storedTitle) {
            setSongTitle(storedTitle);
          } else {
            setSongTitle(DEFAULT_MUSIC_TITLE);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar música salva:', err);
        if (isMounted) {
          setSongUri(getDefaultMusicUri());
          setSongTitle(DEFAULT_MUSIC_TITLE);
        }
      }
    };

    loadSavedMusic();

    return () => {
      isMounted = false;
      cleanupAudioInstance();
    };
  }, [cleanupAudioInstance]);

  // Configuração de modo de áudio no nativo
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch((e) => console.warn('Erro ao configurar AudioMode:', e));
    }
  }, []);

  // Toca uma faixa de áudio específica de forma segura em ambas as plataformas
  const playTrack = useCallback(async (targetUri: string) => {
    if (!targetUri) return;
    setIsLoading(true);

    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return;

        // Cria ou atualiza o elemento HTML5 Audio
        if (!webAudioRef.current) {
          const audio = new window.Audio(targetUri);
          audio.loop = true;
          audio.preload = 'auto';

          audio.onended = () => {
            // Se loop estiver desabilitado por algum motivo
            setIsPlaying(false);
          };

          audio.onpause = () => {
            setIsPlaying(false);
          };

          audio.onplay = () => {
            setIsPlaying(true);
          };

          audio.onerror = (e) => {
            console.warn('Erro no elemento de áudio web:', e);
            setIsPlaying(false);
          };

          webAudioRef.current = audio;
        } else {
          if (webAudioRef.current.src !== targetUri) {
            webAudioRef.current.src = targetUri;
            webAudioRef.current.loop = true;
          }
        }

        await webAudioRef.current.play();
        setIsPlaying(true);
      } else {
        // Nativo: expo-av
        if (nativeSoundRef.current) {
          const status = await nativeSoundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await nativeSoundRef.current.playAsync();
            setIsPlaying(true);
            setIsLoading(false);
            return;
          } else {
            await cleanupAudioInstance();
          }
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: targetUri },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );

        nativeSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
          } else if (status.error) {
            console.warn('Erro na reprodução nativa:', status.error);
            setIsPlaying(false);
          }
        });

        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Falha ao iniciar reprodução:', err);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [cleanupAudioInstance]);

  // Pausa a reprodução
  const pause = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (webAudioRef.current) {
          webAudioRef.current.pause();
        }
      } else {
        if (nativeSoundRef.current) {
          await nativeSoundRef.current.pauseAsync();
        }
      }
      setIsPlaying(false);
    } catch (err) {
      console.warn('Erro ao pausar música:', err);
    }
  }, []);

  // Inicia ou retoma a reprodução da faixa atual
  const play = useCallback(async () => {
    const target = songUri || getDefaultMusicUri();
    await playTrack(target);
  }, [songUri, playTrack]);

  // Alterna entre Play e Pause
  const togglePlay = useCallback(async () => {
    triggerLightHaptic();
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  // Upload de música personalizada do usuário (MP3 / Áudio) via expo-document-picker
  const uploadSong = useCallback(async (): Promise<boolean> => {
    triggerLightHaptic();
    setIsLoading(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsLoading(false);
        return false;
      }

      const asset = result.assets[0];
      const rawName = asset.name || 'Nossa Música';
      // Limpa a extensão do arquivo para uma exibição estética e compacta na pílula
      const cleanTitle = rawName.replace(/\.[^/.]+$/, '').trim() || 'Nossa Música';

      let persistentUri = asset.uri;

      if (Platform.OS === 'web') {
        // No ambiente Web, converte o arquivo para Data URL e salva em IndexedDB
        // para garantir persistência total mesmo após fechar o navegador
        if (asset.file) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo de áudio'));
            reader.readAsDataURL(asset.file as File);
          });
          await saveMediaToIndexedDB('namovo_custom_music', dataUrl);
          persistentUri = dataUrl;
        } else if (asset.uri.startsWith('blob:')) {
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Erro ao converter blob'));
            reader.readAsDataURL(blob);
          });
          await saveMediaToIndexedDB('namovo_custom_music', dataUrl);
          persistentUri = dataUrl;
        }

        // Salva ponteiro seguro no AsyncStorage/localStorage sem estourar cota de 5MB
        const storagePointer = persistentUri.startsWith('data:')
          ? 'indexeddb:namovo_custom_music'
          : persistentUri;

        await AsyncStorage.setItem(STORAGE_MUSIC_URI_KEY, storagePointer);
        await AsyncStorage.setItem(STORAGE_MUSIC_TITLE_KEY, cleanTitle);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_MUSIC_URI_KEY, storagePointer);
          window.localStorage.setItem(STORAGE_MUSIC_TITLE_KEY, cleanTitle);
        }
      } else {
        // No ambiente Nativo (iOS / Android), copia para FileSystem.documentDirectory permanente
        const baseDir = FileSystem.documentDirectory;
        if (baseDir) {
          const ext = asset.name?.includes('.') ? asset.name.split('.').pop() : 'mp3';
          const targetPath = `${baseDir}namovo_music_${Date.now()}.${ext}`;
          await FileSystem.copyAsync({
            from: asset.uri,
            to: targetPath,
          });
          persistentUri = targetPath;
        }

        await AsyncStorage.setItem(STORAGE_MUSIC_URI_KEY, persistentUri);
        await AsyncStorage.setItem(STORAGE_MUSIC_TITLE_KEY, cleanTitle);
      }

      setSongUri(persistentUri);
      setSongTitle(cleanTitle);

      // Limpa a faixa anterior e inicia a nova faixa imediatamente
      await cleanupAudioInstance();
      await playTrack(persistentUri);

      triggerSuccessHaptic();
      return true;
    } catch (err) {
      console.warn('Erro ao carregar arquivo de áudio:', err);
      triggerErrorHaptic();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [cleanupAudioInstance, playTrack]);

  // Redefine para a melodia clássica padrão
  const resetToDefault = useCallback(async () => {
    triggerLightHaptic();
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem(STORAGE_MUSIC_URI_KEY);
      await AsyncStorage.removeItem(STORAGE_MUSIC_TITLE_KEY);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_MUSIC_URI_KEY);
        window.localStorage.removeItem(STORAGE_MUSIC_TITLE_KEY);
      }

      const defaultUri = getDefaultMusicUri();
      setSongUri(defaultUri);
      setSongTitle(DEFAULT_MUSIC_TITLE);

      await cleanupAudioInstance();
      if (isPlaying) {
        await playTrack(defaultUri);
      }
      triggerSuccessHaptic();
    } catch (err) {
      console.warn('Erro ao redefinir música:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, cleanupAudioInstance, playTrack]);

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        songTitle,
        songUri,
        isLoading,
        togglePlay,
        play,
        pause,
        uploadSong,
        resetToDefault,
      }}
    >
      {children}
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
