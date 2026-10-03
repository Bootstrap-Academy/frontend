# Course card images

The catalog supplies original image URLs. Managed originals live on the public
Academy static host at `https://static.bootstrap.academy/thumbnails/`. That host
serves JPEG files; no image resizing API or existing WebP variants are assumed.

Cards use checked-in WebP variants at 400 and 800 pixels wide, selected by
`srcset` and `sizes`. The files keep the complete original image and use quality 80. Their filenames contain the original's SHA256 prefix. Unknown URLs and failed
variant loads fall back to the catalog's original image. Original URLs in course
definitions and other consumers keep working.

To regenerate after updating a managed original, install libwebp's `cwebp` and run:

```sh
node scripts/build-course-thumbnails.mjs
```

`CWEBP` can select an explicit encoder binary. For new sources, pass a JSON array
of all desired original URLs as the first argument. The manifest records each
source URL, SHA256 and byte count. Downloads are temporary and removed when the
generator exits. Normal app builds use only checked-in files and make no requests
to the image host. Remove obsolete variants only after checking that no manifest
entry references them.

The course list initially renders twelve cards and offers further groups of
twelve. The result counter covers all matches. Filtering resets the visible group
without discarding any result. The first three card images load immediately;
other images use the browser's native lazy loading. Image dimensions and the
existing fixed card image height reserve their layout space.
