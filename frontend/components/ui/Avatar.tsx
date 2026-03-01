import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const showFallback = !src || imageError;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ${sizeStyles[size]} ${className}`}
    >
      {!showFallback ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="font-medium text-gray-600 dark:text-gray-300">
          {fallback || alt.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};
