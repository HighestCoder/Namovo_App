import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  persistMediaFileLocally,
  persistMultipleMediaFilesLocally,
} from './localMediaStorage';

export { persistMediaFileLocally, persistMultipleMediaFilesLocally };

export interface PickMediaOptions {
  allowsMultiple?: boolean;
  mediaTypes?: 'images' | 'videos' | 'all';
  aspect?: [number, number];
  quality?: number;
}

/**
 * Abre a galeria de mídia do dispositivo para selecionar fotos ou vídeos.
 * 
 * ARQUITETURA ROBUSTA:
 * As mídias selecionadas NÃO são convertidas para Base64 e nem salvas com
 * URIs temporários voláteis. Elas são copiadas imediatamente para a
 * pasta persistente do app (`FileSystem.documentDirectory`) mantendo 100% da
 * qualidade original e protegidas em sandbox.
 */
export async function pickMediaFromDevice(
  options: PickMediaOptions = {}
): Promise<string[]> {
  try {
    // No iOS e Android, solicita permissão para acessar a galeria
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Acesso à Galeria',
          'Precisamos de permissão para acessar suas fotos e vídeos para salvar suas memórias no app.'
        );
        return [];
      }
    }

    // Configuração dos tipos de mídia
    let pickerMediaTypes: ImagePicker.MediaTypeOptions = ImagePicker.MediaTypeOptions.Images;
    if (options.mediaTypes === 'videos') {
      pickerMediaTypes = ImagePicker.MediaTypeOptions.Videos;
    } else if (options.mediaTypes === 'all') {
      pickerMediaTypes = ImagePicker.MediaTypeOptions.All;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: pickerMediaTypes,
      allowsEditing: !options.allowsMultiple && !!options.aspect,
      aspect: options.aspect,
      quality: options.quality ?? 1.0, // Preserva qualidade máxima sem compressão excessiva
      allowsMultipleSelection: options.allowsMultiple ?? false,
      selectionLimit: options.allowsMultiple ? 10 : 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const tempUris = result.assets.map((asset) => asset.uri);
      // Persiste os arquivos no FileSystem.documentDirectory do app
      return await persistMultipleMediaFilesLocally(tempUris);
    }

    return [];
  } catch (error) {
    console.warn('Erro ao abrir seletor de mídia:', error);
    Alert.alert('Erro', 'Não foi possível carregar a mídia selecionada do dispositivo.');
    return [];
  }
}

/**
 * Abre a câmera do dispositivo para tirar uma foto na hora.
 * A foto é salva diretamente no diretório persistente do aplicativo.
 */
export async function capturePhotoFromCamera(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Acesso à Câmera',
          'Precisamos de permissão para usar a câmera para registrar momentos especiais.'
        );
        return null;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1.0,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const tempUri = result.assets[0].uri;
      // Persiste a foto tirada no FileSystem.documentDirectory do app
      return await persistMediaFileLocally(tempUri);
    }

    return null;
  } catch (error) {
    console.warn('Erro ao abrir câmera:', error);
    return null;
  }
}
