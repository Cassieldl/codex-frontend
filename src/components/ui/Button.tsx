import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  type?: 'button' | 'submit' | 'reset'
}

// Nenhuma variante usa --color-accent (laranja) como fundo — decisão U5.
// Hover é sempre sombra (--shadow-hover), nunca mudança de cor de fundo.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white border border-primary hover:shadow-hover disabled:bg-surface-disabled disabled:text-muted disabled:border-border',
  secondary:
    'bg-white text-ink border border-border hover:shadow-hover hover:border-primary-light disabled:bg-surface-disabled disabled:text-muted',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3 text-sm gap-2.5',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled = false,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      // `isLoading` também desabilita de fato, não só para o leitor de tela: com apenas
      // `aria-disabled`, o botão seguia clicável e um duplo clique disparava dois PUT com o mesmo
      // If-Match — o segundo voltava 409 e a tela dizia "outra pessoa salvou", que era mentira.
      disabled={disabled || isLoading}
      aria-disabled={isLoading || disabled}
      className={clsx(
        'inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-light)] disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && (
          <span className="inline-flex" aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}
      {children}
      {!isLoading && rightIcon && (
        <span className="inline-flex" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  )
}
