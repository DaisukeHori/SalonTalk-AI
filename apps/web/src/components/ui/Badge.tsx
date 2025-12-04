/**
 * Badge Component
 * バッジコンポーネント
 */
import { forwardRef } from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const variantStyles: Record<string, string> = {
  default: 'bg-indigo-600 text-white',
  secondary: 'bg-gray-100 text-gray-800',
  destructive: 'bg-red-600 text-white',
  outline: 'border border-gray-200 text-gray-800',
};

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
