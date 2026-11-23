import React from 'react';

export const OBBY_LOGO_ASSET = '/assets/aistudio/InShot_20261118_131125775_8a02e7eb.png';

export const OBBY_SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/obby_tech?utm_source=qr&avpt=azQ0dm01aGJ3aXE1',
  facebook: 'https://www.facebook.com/obby_tech',
  tiktok: 'https://www.tiktok.com/@obby_tech?_r=1&_t=ZS-9BaWxPUrJ81',
  youtube: 'https://youtube.com/@obby_tech?si=-I1FSYEC98bnatIl',
};

interface ObbyTechLogoEmblemProps {
  customLogoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ObbyTechLogoEmblem: React.FC<ObbyTechLogoEmblemProps> = ({
  customLogoUrl,
  size = 'md',
  className = '',
}) => {
  const sizeClass =
    size === 'xs'
      ? 'w-7 h-7'
      : size === 'sm'
      ? 'w-9 h-9'
      : size === 'lg'
      ? 'w-16 h-16'
      : 'w-12 h-12';

  return (
    <img
      src={customLogoUrl || OBBY_LOGO_ASSET}
      alt="obby tech"
      className={`${sizeClass} rounded-full object-cover shadow-xs shrink-0 bg-[#0C0826] ${className}`}
    />
  );
};

interface ObbyTechWordmarkProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showSolutions?: boolean;
  className?: string;
}

export const ObbyTechWordmark: React.FC<ObbyTechWordmarkProps> = ({
  variant = 'light',
  size = 'md',
  showSolutions = false,
  className = '',
}) => {
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#0C0826]';
  const fontSizeClass =
    size === 'sm'
      ? 'text-[17px] sm:text-[19px]'
      : size === 'lg'
      ? 'text-[28px] sm:text-[32px]'
      : 'text-[22px] sm:text-[24px]';

  const arcSizeClass =
    size === 'sm'
      ? 'w-[12px] h-[5px] -top-[2px]'
      : size === 'lg'
      ? 'w-[19px] h-[7px] -top-[3px]'
      : 'w-[15px] h-[6px] -top-[2.5px]';

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 font-obby-brand font-bold tracking-[-0.02em] leading-none select-none ${fontSizeClass} ${textColor} ${className}`}
    >
      <span className="inline-flex items-baseline">
        <span>obby&nbsp;t</span>
        {/* Signature cyan-to-green 'e' */}
        <span
          className="inline-block bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(180deg, #29C5F6 0%, #24D164 100%)',
          }}
        >
          e
        </span>
        {/* Signature 'c' with curved cyan arc above and subtle green curve */}
        <span className="relative inline-block">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 10"
            className={`absolute left-1/2 -translate-x-1/2 pointer-events-none ${arcSizeClass}`}
            fill="none"
          >
            <path
              d="M3 2.5C7.5 8 16.5 8 21 2.5"
              stroke="#29C5F6"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage:
                variant === 'dark'
                  ? 'linear-gradient(155deg, #24D164 0%, #FFFFFF 58%)'
                  : 'linear-gradient(155deg, #24D164 0%, #0C0826 58%)',
            }}
          >
            c
          </span>
        </span>
        <span>h</span>
      </span>

      {showSolutions && (
        <span
          className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-md ${
            variant === 'dark'
              ? 'bg-white/10 text-[#29C5F6]'
              : 'bg-[#0C0826] text-[#29C5F6]'
          }`}
        >
          SOLUTIONS
        </span>
      )}
    </span>
  );
};
