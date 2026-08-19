'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, LibraryBig } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { PartImage } from '@/components/learning/PartImage';
import { Badge } from '@/components/ui/badge';
import { vexIqParts } from '@/data/parts/vexIqParts';
import { useLanguage } from '@/contexts/LanguageContext';
import { LearningLanguageToggle } from '@/components/learning/LearningLanguageToggle';

const categoryEn = {
  结构件: 'Structure',
  运动件: 'Motion',
  传动件: 'Power transmission',
  连接件: 'Connectors',
  电子件: 'Electronics',
};

export default function PartsLibraryPage() {
  const { language } = useLanguage();
  const zh = language === 'zh';

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-slate-900">
      <Header />
      <LearningLanguageToggle />
      <main>
        <section className="border-b border-blue-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Link href="/learn" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4" />{zh ? '返回学习中心' : 'Back to Learning Center'}
            </Link>
            <div className="mt-7 flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white"><LibraryBig className="h-7 w-7" /></span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? 'VEX IQ 零件图库' : 'VEX IQ Parts Library'}</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight">{zh ? '每一张图，都对应一个明确的零件' : 'One clear identity for every part'}</h1>
                <p className="mt-4 max-w-3xl leading-7 text-slate-600">
                  {zh
                    ? `当前收录样板课使用的 ${vexIqParts.length} 种零件，并统一记录 ID、中英文名称、别名与官方来源，供后续课程直接复用。`
                    : `This library currently includes the ${vexIqParts.length} parts used by the sample lesson, with reusable IDs, bilingual names, aliases, and official sources.`}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vexIqParts.map(part => (
              <article key={part.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-slate-50 p-5">
                  <PartImage partId={part.id} className="h-48 w-full" sizes="(max-width: 640px) 100vw, 360px" />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{zh ? part.name : part.nameEn}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{zh ? part.nameEn : part.name}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{zh ? part.category : categoryEn[part.category]}</Badge>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500">{zh ? '别名：' : 'Also called: '}{(zh ? part.aliases : part.aliasesEn).join(zh ? '、' : ', ')}</p>
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"><strong>{zh ? '怎么辨认：' : 'How to identify it: '}</strong>{zh ? part.identificationTip : part.identificationTipEn}</p>
                  <code className="mt-3 block rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">{part.id}</code>
                  <a href={part.source.articleUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800">
                    {zh ? '查看 VEX 官方来源' : 'View official VEX source'}<ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            {zh
              ? '图像来自 VEX Robotics 官方资料，仅用于课程中的零件识别与教学。VEX 名称、商标及原始素材权利归其权利人所有；商业发布前应再次核对品牌与素材使用许可。'
              : 'Images come from official VEX Robotics materials and are used here for part identification and teaching. VEX names, trademarks, and source assets remain the property of their respective owners; verify brand and asset permissions before commercial release.'}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
