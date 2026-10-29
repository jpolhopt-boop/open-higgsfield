/* The platform's image models cannot return real transparency: asked for a
   transparent PNG they paint a grey-and-white checkerboard into the pixels. So
   the cut-out is made here, in the browser, on the finished picture.

   @imgly/background-removal (ISNet, runs locally via WebAssembly) is loaded from
   a CDN the first time it is needed rather than bundled, and fetches its model
   (tens of MB) then too. Nothing about the image leaves the browser. The package
   is AGPL-3.0; it is used unmodified. */

const LIBRARY = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";

type RemoveBackground = (image: Blob, config?: { output?: { format?: string } }) => Promise<Blob>;

let loading: Promise<RemoveBackground> | null = null;

function load(): Promise<RemoveBackground> {
  loading ??= (
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ LIBRARY) as Promise<{
      removeBackground: RemoveBackground;
    }>
  )
    .then((module) => module.removeBackground)
    .catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}

/** A PNG of the same picture with the background made transparent. */
export async function cutOut(image: Blob): Promise<Blob> {
  const removeBackground = await load();
  return removeBackground(image, { output: { format: "image/png" } });
}
