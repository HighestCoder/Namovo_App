/**
 * Armazenamento de Mídia em IndexedDB para PWA Web (iOS Safari & Chrome).
 * 
 * Por que IndexedDB na Web?
 * O `localStorage` nos navegadores móveis (especialmente Safari no iPhone) possui
 * um limite rígido de ~5MB, o que causaria QuotaExceededError ao salvar fotos de alta resolução.
 * O IndexedDB oferece armazenamento virtualmente ilimitado (centenas de MBs) no sandbox do navegador,
 * persistindo permanentemente mesmo após fechar a aba ou reabrir o PWA da tela de início.
 */

const DB_NAME = 'namovo_pwa_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_store';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste ambiente'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva uma foto ou mídia no IndexedDB do navegador.
 * @param id Identificador único da mídia
 * @param dataUrl Conteúdo da mídia em formato Data URL ou Blob
 */
export async function saveMediaToIndexedDB(id: string, dataUrl: string): Promise<string> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record = { id, dataUrl, savedAt: Date.now() };

      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve(dataUrl);
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Erro ao salvar mídia:', error);
    return dataUrl;
  }
}

/**
 * Recupera uma mídia persistida no IndexedDB.
 */
export async function getMediaFromIndexedDB(id: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        resolve(getRequest.result ? getRequest.result.dataUrl : null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Erro ao recuperar mídia:', error);
    return null;
  }
}
