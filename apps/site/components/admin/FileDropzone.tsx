"use client";

import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadFileAction } from "@/app/(admin)/admin/upload-action";

interface FileDropzoneProps {
  name: string;
  accept?: string;
  multiple?: boolean;
  defaultValue?: string | undefined;
  defaultValues?: string[];
  label?: string;
  onUrlsChange?: (urls: string[]) => void;
}

export function FileDropzone({
  name,
  accept = "image/*",
  multiple = false,
  defaultValue,
  defaultValues,
  label = "Upload file",
  onUrlsChange,
}: FileDropzoneProps) {
  const [urls, setUrls] = useState<string[]>(
    multiple
      ? defaultValues?.filter(Boolean) ?? []
      : defaultValue
        ? [defaultValue]
        : []
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onUrlsChange?.(urls);
  }, [onUrlsChange, urls]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setUploading(true);

      try {
        const newUrls: string[] = [];
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);
          const result = await uploadFileAction(formData);
          if ("error" in result) {
            setError(result.error);
            break;
          }
          newUrls.push(result.url);
        }

        if (newUrls.length > 0) {
          setUrls((prev) => (multiple ? [...prev, ...newUrls] : newUrls));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [multiple]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const removeUrl = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="payload-dropzone-wrap">
      {urls.length > 0 && (
        <div className="payload-dropzone-previews">
          {urls.map((url, i) => (
            <div key={url + i} className="payload-dropzone-thumb">
              {url.match(/\.(png|jpe?g|webp|gif|svg)/i) ? (
                <img src={url} alt="" />
              ) : (
                <div className="payload-dropzone-thumb-file">
                  <ImageIcon size={20} />
                </div>
              )}
              <button
                className="payload-dropzone-thumb-remove"
                onClick={() => removeUrl(i)}
                title="Remove"
                type="button"
              >
                <X size={12} />
              </button>
              <input type="hidden" name={multiple ? name : name} value={url} />
            </div>
          ))}
        </div>
      )}

      {(!multiple && urls.length === 0) || multiple ? (
        <div
          className={`payload-dropzone ${dragActive ? "payload-dropzone--active" : ""} ${uploading ? "payload-dropzone--uploading" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleInputChange}
            style={{ display: "none" }}
          />
          <div className="payload-dropzone-content">
            <Upload size={24} />
            <span>{uploading ? "Uploading..." : label}</span>
          </div>
        </div>
      ) : null}

      {error && <div className="payload-alert payload-alert--danger" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
