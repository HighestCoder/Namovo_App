/**
 * Serviço de Integração com a YouTube Data API v3
 * Executa buscas em tempo real e extração de links diretos do YouTube.
 */

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

/**
 * Chave de acesso da YouTube Data API v3 carregada via variável de ambiente Expo.
 *
 * COMO CONFIGURAR LOCALMENTE:
 * 1. Crie um arquivo chamado `.env` na raiz do projeto (este arquivo é ignorado pelo Git).
 * 2. Adicione a linha contendo a sua chave do Google Cloud:
 *    EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSy...
 * 3. Habilite a biblioteca "YouTube Data API v3" no Google Cloud Console:
 *    https://console.cloud.google.com/apis/library/youtube.googleapis.com
 * 4. Reinicie o Metro Bundler com `npx expo start -c` para recarregar as variáveis.
 */
export const YOUTUBE_API_KEY =
  process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

/**
 * Extrai o Video ID a partir de uma URL ou string de 11 caracteres do YouTube.
 */
export const extractYouTubeVideoId = (input: string): string | null => {
  if (!input) return null;
  const trimmed = input.trim();

  // ID direto de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex abrangente para URLs do YouTube (youtu.be, youtube.com/watch, embed, etc.)
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
};

/**
 * Decodifica entidades HTML em títulos retornados pela YouTube API (ex: &amp; -> &)
 */
export const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
};

/**
 * Realiza uma busca real via HTTP fetch na YouTube Data API v3
 * Não utiliza arrays estáticos ou dados mockados.
 */
export const searchYouTubeVideos = async (
  query: string
): Promise<YouTubeSearchResult[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return [];
  }

  // 1. Suporte a Link Direto ou Video ID inserido pelo usuário
  const directId = extractYouTubeVideoId(cleanQuery);
  if (directId) {
    if (YOUTUBE_API_KEY) {
      try {
        const videoEndpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(
          directId
        )}&key=${YOUTUBE_API_KEY}`;
        const vRes = await fetch(videoEndpoint);
        if (vRes.ok) {
          const vData = await vRes.json();
          const item = vData?.items?.[0];
          if (item) {
            return [
              {
                videoId: directId,
                title: decodeHtmlEntities(item.snippet?.title || 'Vídeo do YouTube'),
                channelTitle: decodeHtmlEntities(
                  item.snippet?.channelTitle || 'YouTube'
                ),
                thumbnailUrl:
                  item.snippet?.thumbnails?.medium?.url ||
                  item.snippet?.thumbnails?.high?.url ||
                  item.snippet?.thumbnails?.default?.url ||
                  `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
              },
            ];
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar vídeo direto na YouTube Data API:', err);
      }
    }
    return [
      {
        videoId: directId,
        title: 'Vídeo do YouTube (Link Direto)',
        channelTitle: 'YouTube',
        thumbnailUrl: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
      },
    ];
  }

  // 2. Validação obrigatória da chave da API para buscas textuais
  if (!YOUTUBE_API_KEY) {
    throw new Error(
      'Chave da YouTube Data API não configurada. Adicione EXPO_PUBLIC_YOUTUBE_API_KEY no arquivo .env.'
    );
  }

  // 3. Execução da requisição HTTP à YouTube Data API v3
  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(
    cleanQuery
  )}&key=${YOUTUBE_API_KEY}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMsg =
      errorData?.error?.message ||
      `Erro na requisição (${response.status}: ${response.statusText})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.items)) {
    return [];
  }

  // 4. Mapeia a resposta JSON com segurança extraindo id.videoId, snippet e thumbnails
  return data.items
    .filter((item: any) => item?.id?.videoId)
    .map((item: any) => ({
      videoId: item.id.videoId,
      title: decodeHtmlEntities(item.snippet?.title || 'Sem título'),
      channelTitle: decodeHtmlEntities(
        item.snippet?.channelTitle || 'Canal Desconhecido'
      ),
      thumbnailUrl:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        `https://img.youtube.com/vi/${item.id.videoId}/hqdefault.jpg`,
    }));
};
