import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized Image Component
 * - Lazy loading with intersection observer
 * - WebP/AVIF format support with fallback
 * - Responsive images with srcset
 * - Loading placeholder support
 * - Error handling
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  className,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate optimized srcset for responsive images
  const generateSrcSet = (baseSrc: string): string => {
    // If it's an external URL, return as is
    if (baseSrc.startsWith('http')) {
      return '';
    }

    // Generate multiple sizes for local images
    const sizes = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
    const ext = baseSrc.split('.').pop();
    const base = baseSrc.substring(0, baseSrc.lastIndexOf('.'));
    
    return sizes
      .map(size => `${base}-${size}w.${ext} ${size}w`)
      .join(', ');
  };

  // Check WebP/AVIF support
  const supportsWebP = (): boolean => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  };

  const supportsAvif = (): boolean => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('image/avif') === 5;
  };

  // Get optimized image source
  const getOptimizedSrc = (): string => {
    if (hasError) {
      // Fallback image
      return '/placeholder.svg';
    }

    // If it's an external URL, return as is
    if (src.startsWith('http')) {
      return src;
    }

    const base = src.substring(0, src.lastIndexOf('.'));

    // Try modern formats first
    if (supportsAvif() && !src.includes('.svg')) {
      return `${base}.avif`;
    }
    if (supportsWebP() && !src.includes('.svg')) {
      return `${base}.webp`;
    }

    return src;
  };

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Placeholder styles
  const placeholderStyles = (): React.CSSProperties => {
    if (placeholder === 'blur' && blurDataURL) {
      return {
        backgroundImage: `url(${blurDataURL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {};
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        !isLoaded && 'bg-gray-100 animate-pulse',
        className
      )}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        ...placeholderStyles(),
      }}
    >
      {isInView && (
        <picture>
          {/* AVIF format */}
          {!src.includes('.svg') && supportsAvif() && (
            <source
              type="image/avif"
              srcSet={generateSrcSet(src.replace(/\.[^.]+$/, '.avif'))}
              sizes={sizes}
            />
          )}
          
          {/* WebP format */}
          {!src.includes('.svg') && supportsWebP() && (
            <source
              type="image/webp"
              srcSet={generateSrcSet(src.replace(/\.[^.]+$/, '.webp'))}
              sizes={sizes}
            />
          )}
          
          {/* Original format fallback */}
          <img
            ref={imgRef}
            src={getOptimizedSrc()}
            srcSet={generateSrcSet(src)}
            sizes={sizes}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
              className
            )}
            {...rest}
          />
        </picture>
      )}
      
      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer"
          style={{
            backgroundSize: '200% 100%',
          }}
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

// Export a preload function for critical images
export const preloadImage = (src: string): void => {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  
  // Check for WebP support and preload that instead
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  if (canvas.toDataURL('image/webp').indexOf('image/webp') === 5) {
    const webpSrc = src.replace(/\.[^.]+$/, '.webp');
    link.href = webpSrc;
  }
  
  document.head.appendChild(link);
};
