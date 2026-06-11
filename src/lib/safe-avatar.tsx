import { useState } from 'react';
import { getDiceBearAvatar } from './validators';

interface SafeAvatarProps {
  src?: string;
  name: string;
  className?: string;
  alt?: string;
}

/**
 * Avatar component with DiceBear fallback when the image fails to load.
 * Uses the person's name as alt text for screen readers (was previously empty).
 */
export function SafeAvatar({ src, name, className, alt }: SafeAvatarProps) {
  const [errored, setErrored] = useState(false);
  const fallback = getDiceBearAvatar(name);
  const finalSrc = !src || errored ? fallback : src;
  return (
    <img
      src={finalSrc}
      alt={alt ?? name}
      className={className}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}
