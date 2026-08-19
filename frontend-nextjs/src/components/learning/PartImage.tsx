import Image from 'next/image';
import { getVexIqPart, type VexIqPartId } from '@/data/parts/vexIqParts';
import { useLanguage } from '@/contexts/LanguageContext';

interface PartImageProps {
  partId: VexIqPartId;
  className?: string;
  sizes?: string;
}

export function PartImage({ partId, className = '', sizes = '128px' }: PartImageProps) {
  const part = getVexIqPart(partId);
  const { language } = useLanguage();

  return (
    <span className={`relative block overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      <Image src={part.image.src} alt={part.image.alt} fill sizes={sizes} className="object-contain p-2" />
      <span className="absolute bottom-1.5 left-1.5 rounded-full border border-white/80 bg-slate-950/75 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
        {part.image.kind === 'photo'
          ? (language === 'zh' ? '实物照片' : 'Real photo')
          : (language === 'zh' ? '官方 3D 图' : 'Official 3D')}
      </span>
    </span>
  );
}
