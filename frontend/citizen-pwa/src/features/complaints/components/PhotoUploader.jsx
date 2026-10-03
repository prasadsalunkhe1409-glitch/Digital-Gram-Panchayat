import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ImageUp, X } from 'lucide-react';
import { MAX_COMPLAINT_PHOTOS, MAX_UPLOAD_SIZE_BYTES } from '@dgp/shared';
import toast from 'react-hot-toast';

/**
 * Two distinct image sources: Capture Photo (opens the rear camera on mobile via
 * `capture="environment"`) and Upload Photo (gallery / file picker, multi-select). On desktop
 * the camera input degrades to a normal file picker. Both paths share the same count/size/type
 * validation; the server re-checks. Multiple images remain supported (up to the max).
 */
export function PhotoUploader({ files, onChange }) {
  const { t } = useTranslation();
  const [previews, setPreviews] = useState([]);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const handleAdd = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    const next = [...files];
    for (const file of picked) {
      if (next.length >= MAX_COMPLAINT_PHOTOS) {
        toast.error(t('complaint.form.maxPhotos', { count: MAX_COMPLAINT_PHOTOS }));
        break;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(t('complaint.form.imageOnly'));
        continue;
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        toast.error(t('complaint.form.imageTooLarge'));
        continue;
      }
      next.push(file);
    }
    onChange(next);
  };

  const removeAt = (idx) => onChange(files.filter((_, i) => i !== idx));
  const atMax = files.length >= MAX_COMPLAINT_PHOTOS;

  return (
    <div className="space-y-2">
      {/* A heading, not a <label> — the file inputs are hidden and driven by their own buttons. */}
      <p className="block text-label text-foreground">
        {t('complaint.form.photos')} ({files.length}/{MAX_COMPLAINT_PHOTOS})
      </p>

      {previews.length ? (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, idx) => (
            <div
              key={src}
              className="relative h-20 w-20 overflow-hidden rounded-md border border-border"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute right-0.5 top-0.5 rounded-full bg-card p-1 text-foreground shadow-sm transition-colors duration-150 hover:bg-accent"
                aria-label={t('complaint.form.removePhoto')}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Hidden inputs: one forces the camera, one opens the gallery/file picker. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleAdd}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAdd}
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={atMax}
          onClick={() => cameraRef.current?.click()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-label text-foreground min-h-11 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Camera className="h-4 w-4" />
          {t('complaint.form.capturePhoto')}
        </button>
        <button
          type="button"
          disabled={atMax}
          onClick={() => galleryRef.current?.click()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-label text-foreground min-h-11 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ImageUp className="h-4 w-4" />
          {t('complaint.form.uploadPhoto')}
        </button>
      </div>
    </div>
  );
}
