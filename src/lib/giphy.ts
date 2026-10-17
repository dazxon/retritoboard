const API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined

export const GIPHY_ENABLED = !!API_KEY

export type GiphyGif = {
  id: string
  title: string
  previewUrl: string
  embedUrl: string
  width: number
  height: number
}

type GiphyImage = {
  url: string
  webp?: string
  width: string
  height: string
}

type GiphyApiItem = {
  id: string
  title: string
  images: {
    fixed_height: GiphyImage
    fixed_height_small: GiphyImage
  }
}

type GiphyApiResponse = {
  data?: GiphyApiItem[]
  meta?: { status: number; msg: string }
}

function mapGif(item: GiphyApiItem): GiphyGif {
  return {
    id: item.id,
    title: item.title,
    // webp pesa bastante menos que el .gif y Safari/iPad lo anima igual
    previewUrl:
      item.images.fixed_height_small.webp || item.images.fixed_height_small.url,
    embedUrl: item.images.fixed_height.webp || item.images.fixed_height.url,
    width: parseInt(item.images.fixed_height.width, 10) || 0,
    height: parseInt(item.images.fixed_height.height, 10) || 0,
  }
}

export class GiphyError extends Error {
  status: number
  constructor(status: number) {
    super(
      status === 429
        ? 'GIPHY está limitando las búsquedas. Probá de nuevo en un rato.'
        : 'No se pudieron cargar los GIFs.',
    )
    this.status = status
  }
}

// Cache en memoria por query: la key de GIPHY tiene cupo por hora y reabrir el
// picker o repetir una búsqueda no debería gastar requests.
const cache = new Map<string, GiphyGif[]>()

export async function searchGifs(
  query: string,
  limit = 24,
): Promise<GiphyGif[]> {
  if (!API_KEY) return []
  const q = query.trim()
  const cacheKey = `${q.toLowerCase()}|${limit}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const url = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13&lang=es&bundle=messaging_non_clips`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=${limit}&rating=pg-13&bundle=messaging_non_clips`

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new GiphyError(0)
  }
  if (!res.ok) throw new GiphyError(res.status)
  const json = (await res.json()) as GiphyApiResponse
  const gifs = (json.data ?? []).map(mapGif)
  cache.set(cacheKey, gifs)
  return gifs
}
