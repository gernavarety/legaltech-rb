"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadZoneDark } from "@/components/upload-zone-dark";
import { uploadContract, pollTaskStatus } from "@/lib/api";

type Phase = "idle" | "uploading" | "analyzing" | "done" | "error";

export default function AnalyzePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(file: File) {
    try {
      setPhase("uploading");
      setProgress(10);
      setStatusMsg("Загружаем договор...");

      const { task_id } = await uploadContract(file, null);

      setPhase("analyzing");
      setProgress(30);
      setStatusMsg("AI анализирует договор по нормам ГК РБ...");

      await pollTaskStatus(task_id, null, (status) => {
        if (status.status === "processing") {
          setProgress((p) => Math.min(p + 10, 85));
          setStatusMsg("Выявляем риски и нарушения...");
        }
      });

      setProgress(100);
      setPhase("done");
      router.push(`/result/${task_id}`);
    } catch (err: unknown) {
      setPhase("error");
      const msg = err instanceof Error ? err.message : "Ошибка при анализе";
      setErrorMsg(msg);
    }
  }

  const isProcessing = phase === "uploading" || phase === "analyzing";

  return (
    <div className="min-h-screen bg-[#0A0C14] flex flex-col">
      {/* Hero */}
      <div className="pt-16 pb-10 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00E5CC]/20 bg-[#00E5CC]/[0.06] mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00E5CC] animate-pulse" />
          <span className="text-[#00E5CC] text-xs font-medium tracking-widest uppercase">
            AI-анализ договора
          </span>
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold text-white mb-4"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Проверьте договор за&nbsp;60 секунд
        </h1>
        <p className="text-white/45 text-lg max-w-md mx-auto">
          Загрузите PDF или DOCX. AI проверит по&nbsp;ГК&nbsp;РБ, ТК&nbsp;РБ, ХПК&nbsp;РБ
          и выдаст отчёт с рисками и ссылками на статьи.
        </p>
      </div>

      {/* Зона загрузки */}
      <div className="flex-1 px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl border p-6 md:p-8"
            style={{ background: "#0F1422", borderColor: "rgba(255,255,255,0.07)" }}
          >
            {phase === "error" ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
                  ⚠️
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Ошибка анализа</h3>
                <p className="text-white/45 text-sm mb-6">{errorMsg}</p>
                <button
                  onClick={() => setPhase("idle")}
                  className="px-6 py-2.5 rounded-xl bg-[#00E5CC] text-[#0A0C14] text-sm font-semibold hover:bg-[#00CDB8] transition-colors"
                >
                  Попробовать снова
                </button>
              </div>
            ) : isProcessing ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-[#00E5CC]/10 border border-[#00E5CC]/20 flex items-center justify-center mx-auto mb-5">
                  <div className="w-6 h-6 border-2 border-[#00E5CC] border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  {phase === "uploading" ? "Загружаем файл..." : "Анализируем..."}
                </h3>
                <p className="text-white/40 text-sm mb-6">{statusMsg}</p>
                {/* Прогресс-бар */}
                <div className="w-full max-w-sm mx-auto bg-white/[0.06] rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: "#00E5CC" }}
                  />
                </div>
                <p className="text-white/25 text-xs mt-3">
                  Обычно занимает 30–90 секунд
                </p>
              </div>
            ) : (
              <>
                <UploadZoneDark onFileSelect={handleFile} disabled={isProcessing} />
                <div className="mt-5 pt-5 border-t border-white/[0.06]">
                  <div className="flex flex-wrap gap-3 justify-center text-xs text-white/30">
                    <span>✓ PDF и DOCX до 10 МБ</span>
                    <span>✓ Данные не передаются третьим лицам</span>
                    <span>✓ Результат через 60 сек</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Что входит в анализ */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: "🔍", label: "Выявление рисков", sub: "Критических, средних, рекомендаций" },
              { icon: "📋", label: "Ссылки на нормы", sub: "ГК РБ, ТК РБ, ХПК РБ, КоАП" },
              { icon: "📄", label: "DOCX-отчёт", sub: "Скачать результаты анализа" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl p-4 border" style={{ background: "#0F1422", borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="text-white text-xs font-medium mb-1">{f.label}</div>
                <div className="text-white/30 text-xs">{f.sub}</div>
              </div>
            ))}
          </div>

          <p className="text-center mt-6 text-white/20 text-xs">
            Результаты носят информационный характер и не заменяют консультацию юриста.{" "}
            <Link href="/pricing" className="text-[#00E5CC]/60 hover:text-[#00E5CC]">
              Тарифы →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
