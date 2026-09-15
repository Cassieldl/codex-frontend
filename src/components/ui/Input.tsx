import clsx from 'clsx'
import { CircleAlert } from 'lucide-react'
import { useId, type InputHTMLAttributes } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  error?: string
  required?: boolean
  id?: string
}

export function Input({
  label,
  hint,
  error,
  required = false,
  id,
  className,
  ...props
}: InputProps) {
  const idGerado = useId()
  const inputId = id ?? idGerado
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={inputId} className="text-xs font-normal text-ink lg:text-sm">
        {required && (
          <span aria-hidden="true" className="text-error-texto">
            *{' '}
          </span>
        )}
        {label}
        {required && <span className="sr-only"> (obrigatório)</span>}
      </label>

      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className={clsx(
          'h-9 rounded-[var(--radius-input)] border px-3 text-sm text-ink placeholder:text-ink/40',
          'focus:outline-none focus:border-[1.5px] focus:border-primary-medium',
          error ? 'border-error' : 'border-border',
          className,
        )}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink/50">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="flex items-center gap-1 text-xs text-error-texto">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
