import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { saveMediaToIndexedDB } from './webIndexedDB';

/**
 * Armazenamento Local Seguro e de Alta Performance para Mídias.
 * 
 * ARQUITETURA HÍBRIDA (NATIVO & PWA WEB):
 * - No NATIVO (iOS/Android): Não converte para Base64; copia o arquivo temporário diretamente
 *   para o diretório persistente do app (`FileSystem.documentDirectory + namovo_media/`).
 * - Na WEB / PWA: Converte URLs temporárias de `blob:` em representação persistente e
 *   garante backup no `IndexedDB` do navegador (sem limite rígido de 5MB do localStorage).
 * - Mídias externas remotas (ex: templates Unsplash `http/https`) são mantidas como links.
 */

const MEDIA_SUBDIRECTORY = 'namovo_media/';

/**
 * Garante que a pasta de mídia local existe no FileSystem nativo.
 */
async function ensureMediaDirectory(): Promise<string> {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('FileSystem.documentDirectory não disponível nesta plataforma');
  }

  const mediaDir = `${baseDir}${MEDIA_SUBDIRECTORY}`;
  const dirInfo = await FileSystem.getInfoAsync(mediaDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
  }

  return mediaDir;
}

/**
 * Converte blob URL transitório do navegador web em Data URL persistente para PWA
 * e salva no IndexedDB do navegador.
 */
async function convertBlobToPersistentDataUrl(blobUrl: string): Promise<string> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Erro ao ler blob para persistência web'));
      };
      reader.readAsDataURL(blob);
    });

    const uniqueId = `web_media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await saveMediaToIndexedDB(uniqueId, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn('[LocalMediaStorage] Falha ao converter blob na web:', err);
    return blobUrl;
  }
}

/**
 * Copia uma mídia da localização temporária para a sandbox persistente do aplicativo.
 * 
 * @param tempUri URI temporário gerado pelo ImagePicker ou Câmera
 * @returns URI permanente pronto para ser salvo no AsyncStorage
 */
export async function persistMediaFileLocally(tempUri: string): Promise<string> {
  if (!tempUri) return tempUri;

  // 1. Tratamento para ambiente Web (PWA / Mobile Safari)
  if (Platform.OS === 'web') {
    if (tempUri.startsWith('blob:')) {
      return await convertBlobToPersistentDataUrl(tempUri);
    }
    return tempUri;
  }

  // 2. Se já for um arquivo salvo dentro do diretório permanente do app, não duplica
  if (tempUri.includes(MEDIA_SUBDIRECTORY)) {
    return tempUri;
  }

  // 3. Se for URL externa de internet (ex: templates de fotos remotas)
  if (tempUri.startsWith('http://') || tempUri.startsWith('https://')) {
    return tempUri;
  }

  // 4. No nativo iOS/Android: Cópia via FileSystem.documentDirectory
  try {
    if (!FileSystem.documentDirectory) {
      return tempUri;
    }

    const targetDir = await ensureMediaDirectory();

    // Extrai a extensão do arquivo original (ex: jpg, png, mp4)
    const cleanUri = tempUri.split('?')[0];
    const parts = cleanUri.split('.');
    const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';

    // Cria nome único para o arquivo local
    const uniqueFileName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
    const permanentDestination = `${targetDir}${uniqueFileName}`;

    // Copia o arquivo mantendo qualidade e privacidade na sandbox
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentDestination,
    });

    return permanentDestination;
  } catch (error) {
    console.warn('[LocalMediaStorage] Erro ao persistir arquivo no sandbox nativo:', error);
    return tempUri;
  }
}

/**
 * Persiste uma lista de mídias de forma concorrente e segura.
 */
export async function persistMultipleMediaFilesLocally(tempUris: string[]): Promise<string[]> {
  if (!tempUris || tempUris.length === 0) return [];
  return Promise.all(tempUris.map((uri) => persistMediaFileLocally(uri)));
}
