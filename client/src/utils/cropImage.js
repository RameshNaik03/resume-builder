// Cuts the chosen square out of an image and returns it as a JPEG Blob.
//   src  - the image (an object URL from the file the user picked)
//   area - { x, y, width, height } in the image's own pixels (from react-easy-crop)
// The result is at most 800 × 800 px, which keeps uploads small (well under the 2 MB limit)
// and is plenty sharp for a resume photo.

const MAX_SIZE = 800;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image couldn't be opened. Please try a different file."));
    image.src = src;
  });

// canvas.toDataURL is synchronous, so (unlike canvas.toBlob, which may wait for the browser
// to be idle) it always finishes straight away. The data URL is then turned into a Blob.
const toBlob = (canvas, quality) => {
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const bytes = atob(dataUrl.split(",")[1]);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type: "image/jpeg" });
};

export default async function cropImage(src, area) {
  const image = await loadImage(src);
  const size = Math.min(MAX_SIZE, Math.round(area.width)); // Never enlarge a small image

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff"; // JPEG has no transparency: transparent PNG areas become white
  context.fillRect(0, 0, size, size);
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);

  // Lower the quality a little if the photo is unusually detailed
  let blob = toBlob(canvas, 0.9);
  if (blob.size > MAX_UPLOAD_BYTES) blob = toBlob(canvas, 0.75);
  return blob;
}
