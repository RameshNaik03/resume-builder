import { useEffect, useRef, useState } from "react";
import { ImagePlus, Info, Trash2, Upload } from "lucide-react";
import toast from "../../utils/toast";
import api from "../../api/axios";
import getErrorMessage from "../../utils/getErrorMessage";
import cropImage from "../../utils/cropImage";
import ConfirmModal from "../ConfirmModal";
import PhotoCropModal from "./PhotoCropModal";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
// The original can be big (phone photos often are): only the cropped version is uploaded,
// and that's resized to at most 800 × 800 px
const MAX_ORIGINAL_MB = 15;

// Optional profile photo (Personal info section): pick or drop an image, crop it to a square,
// then it's uploaded straight away. The photo is saved by its own API route, not by autosave.
//   photoUrl      - the current photo ("" if none)
//   onPhotoChange - receives the new URL ("" after removing)
export default function PhotoUpload({ resumeId, photoUrl, onPhotoChange }) {
  const inputRef = useRef(null);
  const [cropSrc, setCropSrc] = useState(null); // Object URL of the picked image, while cropping
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Free the picked image's memory when the crop dialog closes
  useEffect(() => () => cropSrc && URL.revokeObjectURL(cropSrc), [cropSrc]);

  const pickFile = (file) => {
    setError("");
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP image. (iPhone HEIC photos: export or share them as JPG first.)");
      return;
    }
    if (file.size > MAX_ORIGINAL_MB * 1024 * 1024) {
      setError(`This image is larger than ${MAX_ORIGINAL_MB} MB. Please choose a smaller one.`);
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  };

  const saveCrop = async (area) => {
    setUploading(true);
    try {
      const blob = await cropImage(cropSrc, area);
      const form = new FormData();
      form.append("photo", blob, "photo.jpg");
      const { data } = await api.post(`/resumes/${resumeId}/photo`, form);
      onPhotoChange(data.photoUrl);
      setCropSrc(null);
      toast.success(photoUrl ? "Photo replaced" : "Photo added");
    } catch (uploadError) {
      // Keep the crop dialog open so the user can try again
      toast.error(uploadError.response ? getErrorMessage(uploadError) : uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setRemoving(true);
    try {
      await api.delete(`/resumes/${resumeId}/photo`);
      onPhotoChange("");
      setConfirmRemove(false);
      toast.success("Photo removed");
    } catch (removeError) {
      toast.error(getErrorMessage(removeError));
    } finally {
      setRemoving(false);
    }
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED.join(",")}
      className="hidden"
      onChange={(event) => {
        pickFile(event.target.files[0]);
        event.target.value = ""; // Allow picking the same file again
      }}
    />
  );

  return (
    <div>
      <p className="label">
        Photo <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
      </p>

      {photoUrl ? (
        <div className="flex items-center gap-4">
          <img src={photoUrl} alt="Your resume photo" className="size-20 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current.click()} className="btn-secondary">
              <Upload className="size-4" aria-hidden="true" />
              Replace
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="btn-secondary text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            pickFile(event.dataTransfer.files[0]);
          }}
          className={`flex w-full items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 text-left transition ${
            isDragging
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
              : "border-slate-300 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
          }`}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <ImagePlus className="size-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-medium text-slate-900 dark:text-white">Add a photo</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Click or drop an image here · JPG, PNG or WebP · you can crop it next
            </span>
          </span>
        </button>
      )}
      {fileInput}

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300" role="alert">
          {error}
        </p>
      )}

      <p className="mt-3 flex gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        Photos are common in Germany and Europe, but often left out in the US and UK to help with ATS and fair hiring.
      </p>

      {cropSrc && <PhotoCropModal src={cropSrc} onCancel={() => setCropSrc(null)} onSave={saveCrop} saving={uploading} />}

      <ConfirmModal
        open={confirmRemove}
        title="Remove photo?"
        message="Your photo will be deleted from this resume. You can add a new one anytime."
        confirmText="Remove"
        onConfirm={removePhoto}
        onCancel={() => setConfirmRemove(false)}
        loading={removing}
      />
    </div>
  );
}
