import thumbnails from "~/assets/course-thumbnails.json";

export function courseImage(source: string) {
  const image = thumbnails[source as keyof typeof thumbnails];
  return {
    src: image?.variants[0]?.src || source,
    srcset: image?.variants.map(({ src, width }) => `${src} ${width}w`).join(", "),
  };
}
