import React from 'react';

export const PEMKAB_LOGO_URL = 'https://lh3.googleusercontent.com/d/13yDyw7PMGhR2jEdXngjCseJtnRhd4eP5';
export const PGRI_LOGO_URL = 'https://lh3.googleusercontent.com/d/108U4lxE-NSOpI9tr8VahupSz69xFcfkj';

interface LogoHeaderProps {
  children?: React.ReactNode;
  /** Tailwind size classes for both logos */
  logoClassName?: string;
  className?: string;
}

/**
 * Official header: Logo Pemkab Wonogiri on the LEFT, Logo PGRI on the RIGHT.
 * Always side by side (never stacked), on every screen size.
 */
export const LogoHeader: React.FC<LogoHeaderProps> = ({
  children,
  logoClassName = 'w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16',
  className = ''
}) => {
  return (
    <div className={`w-full flex flex-row flex-nowrap items-center justify-between gap-2 sm:gap-4 ${className}`}>
      <img
        src={PEMKAB_LOGO_URL}
        alt="Logo Pemkab Wonogiri"
        title="Pemerintah Kabupaten Wonogiri"
        referrerPolicy="no-referrer"
        className={`${logoClassName} shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]`}
      />
      <div className="min-w-0 flex-1 text-center">{children}</div>
      <img
        src={PGRI_LOGO_URL}
        alt="Logo PGRI"
        title="PGRI Cabang Jatiroto, Wonogiri"
        referrerPolicy="no-referrer"
        className={`${logoClassName} shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]`}
      />
    </div>
  );
};
