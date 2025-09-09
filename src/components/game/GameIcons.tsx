import type { FC } from 'react';

interface IconProps {
  className?: string;
}

export const IconO: FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="12"/>
  </svg>
);

export const IconX: FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 15L85 85M85 15L15 85" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
  </svg>
);
