import { useId, useState } from "react";
import Cropper from "react-easy-crop";
import Modal from "../Modal";

// Lets the user crop a photo to a square before it's uploaded.
// Drag to move the photo, scroll / pinch or use the slider to zoom.
//   src      - the picked image (object URL)
//   onSave   - receives the cropped area in image pixels: { x, y, width, height }
//   saving   - true while the cropped photo is uploading
export default function PhotoCropModal({ src, onCancel, onSave, saving = false }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const zoomId = useId();

  return (
    <Modal onClose={() => !saving && onCancel()} labelledBy="crop-photo-title" className="max-w-lg overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 id="crop-photo-title" className="text-lg font-semibold text-slate-900 dark:text-white">
          Crop your photo
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Drag to position your face in the middle. Zoom in so it fills most of the square.
        </p>
      </div>

      <div className="relative h-80 bg-slate-900">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
        />
      </div>

      <div className="px-5 py-4">
        <label htmlFor={zoomId} className="label">
          Zoom
        </label>
        <input
          id={zoomId}
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="w-full accent-indigo-600"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={saving} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => area && onSave(area)} disabled={!area || saving} className="btn-primary">
            {saving ? "Uploading..." : "Save photo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
