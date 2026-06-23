"use client"

/**
 * Динамическая форма генерации юридического документа.
 * Рендерит поля из fields_schema шаблона.
 * Поддерживаемые типы: text | textarea | number | date | select | boolean
 * Валидация через react-hook-form с динамической Zod-схемой.
 */

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, FileText, AlertCircle } from "lucide-react"

export interface FieldSchema {
  key: string
  label: string
  type: "text" | "textarea" | "number" | "date" | "select" | "boolean"
  placeholder?: string
  required: boolean
  hint?: string
  options?: string[]
}

interface DocumentFormProps {
  fields: FieldSchema[]
  templateName: string
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  isLoading?: boolean
}

// Динамически строит Zod-схему из массива полей
function buildZodSchema(fields: FieldSchema[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {}

  for (const field of fields) {
    let schema: z.ZodTypeAny

    switch (field.type) {
      case "number":
        schema = z.coerce.number({ invalid_type_error: "Введите число" })
        if (field.required) {
          schema = schema
        } else {
          schema = z.union([z.coerce.number(), z.literal("")]).optional()
        }
        break
      case "boolean":
        schema = z.boolean()
        break
      case "date":
        schema = z.string()
        if (field.required) {
          schema = (schema as z.ZodString).min(1, "Укажите дату")
        }
        break
      case "select":
        const opts = (field.options ?? []) as [string, ...string[]]
        if (field.required) {
          schema = z.enum(opts, { required_error: "Выберите значение" })
        } else {
          schema = z.enum(opts).optional()
        }
        break
      default: // text | textarea
        schema = z.string()
        if (field.required) {
          schema = (schema as z.ZodString).min(1, "Обязательное поле")
        }
    }

    if (!field.required && field.type !== "boolean") {
      shape[field.key] = schema.optional()
    } else {
      shape[field.key] = schema
    }
  }

  return z.object(shape)
}

export function DocumentForm({ fields, templateName, onSubmit, isLoading }: DocumentFormProps) {
  const schema = buildZodSchema(fields)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce((acc, f) => {
      if (f.type === "boolean") acc[f.key] = false
      else acc[f.key] = ""
      return acc
    }, {} as Record<string, unknown>),
  })

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setSubmitError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Ошибка при создании документа")
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <label
            htmlFor={field.key}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {field.label}
            {field.required && (
              <span className="ml-1 text-red-500" aria-hidden>*</span>
            )}
          </label>

          <FieldInput field={field} register={register} control={control} />

          {field.hint && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{field.hint}</p>
          )}

          {errors[field.key] && (
            <p className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {String((errors[field.key] as { message?: string })?.message ?? "Ошибка")}
            </p>
          )}
        </div>
      ))}

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {submitError}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Создаём документ...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Создать документ — {templateName}
          </>
        )}
      </button>
    </form>
  )
}

// ─────────────────────────────────────────────────────
// Рендеринг конкретного поля по типу
// ─────────────────────────────────────────────────────

interface FieldInputProps {
  field: FieldSchema
  register: ReturnType<typeof useForm>["register"]
  control: ReturnType<typeof useForm>["control"]
}

function FieldInput({ field, register, control }: FieldInputProps) {
  const baseInput = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400"

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          id={field.key}
          {...register(field.key)}
          placeholder={field.placeholder}
          rows={3}
          className={`${baseInput} resize-y`}
        />
      )

    case "number":
      return (
        <input
          id={field.key}
          type="number"
          step="any"
          {...register(field.key)}
          placeholder={field.placeholder}
          className={baseInput}
        />
      )

    case "date":
      return (
        <input
          id={field.key}
          type="date"
          {...register(field.key)}
          className={baseInput}
        />
      )

    case "select":
      return (
        <select
          id={field.key}
          {...register(field.key)}
          className={`${baseInput} cursor-pointer`}
        >
          <option value="">— выберите —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )

    case "boolean":
      return (
        <Controller
          name={field.key}
          control={control}
          render={({ field: f }) => (
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={!!f.value}
                onClick={() => f.onChange(!f.value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  f.value
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    f.value ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                {f.value ? "Да" : "Нет"}
              </span>
            </div>
          )}
        />
      )

    default: // text
      return (
        <input
          id={field.key}
          type="text"
          {...register(field.key)}
          placeholder={field.placeholder}
          className={baseInput}
        />
      )
  }
}
