interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

/* Unsplash resizes on its own CDN, so each photo is requested at the width the browser picks. */
export default function imageLoader({ src, width, quality }: LoaderArgs) {
  if (!src.startsWith("https://images.unsplash.com/")) return src;
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 72));
  return url.toString();
}
