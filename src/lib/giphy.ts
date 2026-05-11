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
    previewUrl: item.images.fixed_height_small.url,
    embedUrl: item.images.fixed_height.url,
    width: parseInt(item.images.fixed_height.width, 10) || 0,
    height: parseInt(item.images.fixed_height.height, 10) || 0,
  }
}

export async function searchGifs(
  query: string,
  limit = 24,
): Promise<GiphyGif[]> {
  if (!API_KEY) return []
  const q = query.trim()
  const url = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13&lang=es&bundle=messaging_non_clips`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=${limit}&rating=pg-13&bundle=messaging_non_clips`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Giphy ${res.status}`)
  const json = (await res.json()) as GiphyApiResponse
  return (json.data ?? []).map(mapGif)
}
