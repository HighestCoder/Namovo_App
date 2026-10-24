/**
 * Faixa padrão romântica inicial do aplicativo Namovo
 */
import { Image } from 'react-native';

export const DEFAULT_MUSIC_TITLE = 'Nossa Música';

export const getDefaultMusicUri = (): string => {
  try {
    const asset = Image.resolveAssetSource(require('../../assets/audio/default_music.wav'));
    return asset?.uri || '';
  } catch (err) {
    console.warn('Erro ao resolver asset de música padrão:', err);
    return '';
  }
};
