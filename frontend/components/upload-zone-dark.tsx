"use client";

import { useState, useCallback, useRef } from "react";
import { formatFileSize } from "@/lib/utils";

interface Props {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE_MB = 10;

export function UploadZoneDark({ onFileSelect, disabled = false }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx"].includes(ext))
      return "Неподдерживаемый формат. Разрешены: PDF, DOCX";
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `Файл слишком большой. Максимум ${MAX_SIZE_MB} МБ`;
    if (file.size < 100) return "Файл пустой или повреждён";
    return null;
  }

  const handle = useCallback(
    (file: File) => {
      setError(null);
      const err = validate(file);
      if (err) { setError(err); return; }
      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handle(file);
    },
    [disabled, handle]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handle(file);
    },
    [handle]
  );

  const openPicker = () => { if (!disabled) inputRef.current?.click(); };

  const borderColor = isDragging
    ? "#00E5CC"
    : error
    ? "rgba(239,68,68,0.5)"
    : selectedFile
    ? "rgba(0,229,204,0.4)"
    : "rgba(255,255,255,0.1)";

  const bgColor = isDragging
    ? "rgba(0,229,204,0.04)"
    : error
    ? "rgba(239,68,68,0.04)"
    : selectedFile
    ? "rgba(0,229,204,0.03)"
    : "transparent";

  return (
    <div className="w-full">
      <div
        onClick={openPicker}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="relative flex flex-col items-center justify-center w-full min-h-[240px] rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer"
        style={{ borderColor, background: bgColor, opacity: disabled ? 0.5 : 1 }}
      >
        {selectedFile && !error ? (
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-[#00E5CC]/10 border border-[#00E5CC]/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#00E5CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[#00E5CC] font-semibold text-base mb-1">Файл готов к анализу</p>
            <p className="text-white/70 text-sm">{selectedFile.name}</p>
            <p className="text-white/35 text-xs mt-1">{formatFileSize(selectedFile.size)}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setError(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="mt-4 text-xs text-white/30 hover:text-white/60 underline transition-colors"
            >
              Выбрать другой файл
            </button>
          </div>
        ) : error ? (
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-400 font-medium text-sm">{error}</p>
            <p className="text-white/30 text-xs mt-2">Нажмите, чтобы выбрать другой файл</p>
          </div>
        ) : (
          <div className="text-center p-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all"
              style={{
                background: isDragging ? "rgba(0,229,204,0.12)" : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <svg
                className="w-8 h-8 transition-colors"
                style={{ color: isDragging ? "#00E5CC" : "rgba(255,255,255,0.25)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-white/75 font-semibold text-base mb-1.5">
              {isDragging ? "Отпустите файл здесь" : "Перетащите договор сюда"}
            </p>
            <p className="text-white/35 text-sm mb-5">
              или{" "}
              <span className="text-[#00E5CC]/80">нажмите для выбора файла</span>
            </p>
            <div className="flex items-center justify-center gap-2">
              {["📄 PDF", "📝 DOCX", `⬆️ до ${MAX_SIZE_MB} МБ`].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg text-xs text-white/40"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={onInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
