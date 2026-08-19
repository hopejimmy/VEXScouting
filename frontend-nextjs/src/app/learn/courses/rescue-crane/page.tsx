'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Package,
  RotateCw,
  Ruler,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { LearningLanguageToggle } from '@/components/learning/LearningLanguageToggle';
import { PartImage } from '@/components/learning/PartImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getVexIqPart } from '@/data/parts/vexIqParts';
import { rescueCraneLesson } from '@/data/rescueCrane';

const focusStyles = {
  结构: 'border-blue-200 bg-blue-50 text-blue-700',
  传动: 'border-amber-200 bg-amber-50 text-amber-700',
  测试: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export default function RescueCraneLessonPage() {
  const { language } = useLanguage();
  const zh = language === 'zh';

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-slate-900">
      <Header />
      <LearningLanguageToggle />

      <main>
        <section className="overflow-hidden border-b border-amber-100 bg-[#fffaf0]">
          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <Link href="/learn" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600">
              <ArrowLeft className="h-4 w-4" />{zh ? '返回机器人课堂' : 'Back to Robotics Classroom'}
            </Link>
            <div className="mt-7 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-violet-200 bg-violet-50 text-violet-700">{zh ? '第 2 节 · 课程设计预览' : 'Lesson 2 · Design preview'}</Badge>
                  <Badge variant="outline"><Clock3 className="mr-1 h-3.5 w-3.5" />{rescueCraneLesson.duration} {zh ? '分钟' : 'min'}</Badge>
                  <Badge variant="outline">{zh ? rescueCraneLesson.prerequisite : rescueCraneLesson.prerequisiteEn}</Badge>
                </div>
                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{zh ? rescueCraneLesson.title : rescueCraneLesson.titleEn}</h1>
                <p className="mt-4 text-lg leading-8 text-slate-600">{zh ? rescueCraneLesson.subtitle : rescueCraneLesson.subtitleEn}</p>
                <div className="mt-7 space-y-3">
                  {(zh ? rescueCraneLesson.outcomes : rescueCraneLesson.outcomesEn).map(outcome => (
                    <div key={outcome} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-5 w-5 text-emerald-500" />{outcome}</div>
                  ))}
                </div>
              </div>

              <figure className="relative min-h-[340px] overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-xl sm:min-h-[420px]">
                <Image
                  src={rescueCraneLesson.hero}
                  alt={zh ? '手摇救援起重机课程概念效果图' : 'Concept image of a hand-crank rescue crane'}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="object-cover"
                />
                <figcaption className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-slate-950/82 p-4 text-white shadow-lg backdrop-blur">
                  <div className="flex items-center gap-3"><Package className="h-6 w-6 text-amber-300" /><div><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">{zh ? '要搭建的作品' : 'What you will build'}</p><p className="mt-1 text-sm font-bold">{zh ? '可以手摇升降物品的小型起重机' : 'A small hand-crank crane that lifts cargo'}</p></div></div>
                  <Badge className="border-amber-300/30 bg-amber-300 text-slate-950">{zh ? '课程概念封面 · 非装配图' : 'Lesson concept · Not assembly instructions'}</Badge>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6 lg:px-8">
          <section>
            <div className="rounded-[2rem] bg-gradient-to-r from-blue-700 to-violet-700 p-7 text-white sm:p-9">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{zh ? '今天的任务' : "Today's mission"}</p>
              <h2 className="mt-3 max-w-4xl text-2xl font-black leading-tight sm:text-3xl">{zh ? rescueCraneLesson.mission : rescueCraneLesson.missionEn}</h2>
              <p className="mt-4 max-w-3xl leading-7 text-blue-100">{zh ? '本课没有电机和电池。孩子会用手控制起重机，把注意力集中在结构稳定、轴的支撑与机械省力上。' : 'This lesson uses no motor or battery. Hand control keeps the focus on structural stability, shaft support, and mechanical advantage.'}</p>
            </div>
          </section>

          <section id="parts" className="scroll-mt-24">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '01 · 找零件' : '01 · Find the parts'}</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-3xl font-black">{zh ? '认识起重机的新工具' : 'Meet the crane parts'}</h2>
              <Link href="/learn/parts" className="text-sm font-bold text-blue-600 hover:text-blue-800">{zh ? '打开完整零件图库' : 'Open the full parts library'} →</Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rescueCraneLesson.parts.map(part => {
                const libraryPart = getVexIqPart(part.libraryPartId);
                return (
                  <Card key={part.id} className="border-slate-200 bg-white py-0">
                    <CardContent className="flex min-h-40 items-center gap-4 p-4">
                      <PartImage partId={part.libraryPartId} className="h-28 w-28 shrink-0 bg-slate-50" sizes="112px" />
                      <div>
                        <p className="font-black">{zh ? part.name : part.nameEn} × {part.count}</p>
                        <p className="mt-1 text-[11px] font-semibold text-blue-600">{zh ? libraryPart.name : libraryPart.nameEn}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">{zh ? part.note : part.noteEn}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section id="build" className="scroll-mt-24">
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950">
              <div className="flex gap-3"><Camera className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" /><div><strong>{zh ? '实物图拍摄状态' : 'Real-photo status'}</strong><p className="mt-1 text-sm leading-6">{zh ? '以下是已经设计好的 8 个搭建动作和对应拍摄要求。实物验证并拍照后，再开放“完成步骤”和学习进度，避免孩子照着错误示意图搭建。' : 'The eight build actions and shot requirements are ready. Step completion and progress will unlock only after the real build is validated and photographed.'}</p></div></div>
            </div>
            <p className="mt-9 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '02 · 搭建脚本' : '02 · Build script'}</p>
            <h2 className="mt-2 text-3xl font-black">{zh ? '每张照片只说明一个动作' : 'One action per photo'}</h2>
            <div className="mt-7 space-y-5">
              {rescueCraneLesson.steps.map((step, index) => (
                <Card key={step.id} className="overflow-hidden border-slate-200 bg-white py-0">
                  <CardContent className="grid gap-6 p-5 sm:p-7 md:grid-cols-[240px_1fr]">
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-5 text-center">
                      <Camera className="h-9 w-9 text-violet-500" />
                      <p className="mt-3 text-sm font-black text-violet-900">{zh ? `第 ${index + 1} 步实物照片` : `Step ${index + 1} real photo`}</p>
                      <p className="mt-2 text-xs leading-5 text-violet-700">{zh ? step.photoBrief : step.photoBriefEn}</p>
                      <Badge variant="outline" className="mt-4 border-violet-200 bg-white text-violet-600">{zh ? '等待拍摄' : 'Photo needed'}</Badge>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">{index + 1}</span>
                        <Badge variant="outline" className={focusStyles[step.focus]}>{zh ? step.focus : ({ 结构: 'Structure', 传动: 'Transmission', 测试: 'Testing' }[step.focus])}</Badge>
                      </div>
                      <h3 className="mt-4 text-xl font-black">{zh ? step.title : step.titleEn}</h3>
                      <p className="mt-3 leading-7 text-slate-700">{zh ? step.instruction : step.instructionEn}</p>
                      <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><span><strong>{zh ? '完成检查：' : 'Completion check: '}</strong>{zh ? step.check : step.checkEn}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="discover" className="scroll-mt-24">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '03 · 发现原理' : '03 · Discover the principle'}</p>
            <h2 className="mt-2 text-3xl font-black">{zh ? '为什么手柄长一点更省力？' : 'Why does a longer handle feel easier?'}</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {[
                [RotateCw, zh ? '卷筒' : 'Spool', zh ? '卷筒转动时收起绳索，把旋转运动变成直线升降。' : 'As the spool rotates, it winds the rope and turns rotation into linear lifting.'],
                [Wrench, zh ? '两点支撑' : 'Two-point support', zh ? '轴穿过两根平行塔柱，比较不容易倾斜和卡住。' : 'A shaft through two parallel rails is less likely to tilt or bind.'],
                [Ruler, zh ? '曲柄半径' : 'Crank radius', zh ? '握得离轴越远，同样的手力能产生更大的转动力矩，但手要走更长的路。' : 'Farther from the shaft, the same hand force creates more torque, but your hand travels farther.'],
              ].map(([Icon, title, text]) => {
                const ItemIcon = Icon as typeof RotateCw;
                return <div key={title as string} className="rounded-3xl border border-slate-200 bg-white p-6"><ItemIcon className="h-8 w-8 text-blue-600" /><h3 className="mt-4 font-black">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p></div>;
              })}
            </div>
          </section>

          <section id="challenge" className="rounded-[2rem] bg-slate-950 p-7 text-white sm:p-9">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-slate-950"><FlaskConical className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{zh ? '04 · 公平实验' : '04 · Fair test'}</p><h2 className="mt-2 text-3xl font-black">{zh ? '外侧孔 vs. 内侧孔' : 'Outer hole vs. inner hole'}</h2></div></div>
            <p className="mt-5 max-w-3xl leading-7 text-slate-300">{zh ? '使用同一个物品、同一个高度和同一个卷筒，只改变手握位置。分别记录用力感受（1–5 分）、转动圈数和控制是否平稳。先预测，再测试。' : 'Use the same cargo, height, and spool; change only the grip position. Record effort from 1–5, number of turns, and control smoothness. Predict first, then test.'}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">{(zh ? ['用力感受 1–5', '手柄转动圈数', '升降是否平稳'] : ['Effort from 1–5', 'Handle revolutions', 'Lift smoothness']).map(item => <span key={item} className="rounded-xl border border-white/15 bg-white/10 p-4 text-sm font-bold">{item}</span>)}</div>
          </section>

          <section className="grid gap-5 md:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-950"><ShieldCheck className="h-8 w-8 text-red-600" /><h2 className="mt-4 text-xl font-black">{zh ? '安全边界' : 'Safety boundaries'}</h2><p className="mt-2 leading-7">{zh ? '只吊不超过 100 克的轻质物品，不吊人或身体部位；绳索远离颈部，手指远离卷筒和轴套的夹点；测试时始终握住手柄。' : 'Lift only lightweight cargo up to 100 g—never people or body parts. Keep rope away from the neck, fingers away from pinch points, and always hold the crank during testing.'}</p></div>
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-blue-950"><BookOpen className="h-8 w-8 text-blue-600" /><h2 className="mt-4 text-xl font-black">{zh ? '下一步' : 'Next step'}</h2><p className="mt-2 text-sm leading-6">{zh ? '按拍摄清单完成实物后，将照片上传给我；我会统一背景、裁切和标注，再把本课变成可正式学习的版本。' : 'Build and photograph each shot, then upload the photos. I can clean the backgrounds, crop, annotate, and turn this preview into a publishable lesson.'}</p><Button asChild variant="outline" className="mt-5 rounded-full border-blue-300 bg-white"><Link href="/learn">{zh ? '返回课程首页' : 'Back to course home'}<ArrowRight /></Link></Button></div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
