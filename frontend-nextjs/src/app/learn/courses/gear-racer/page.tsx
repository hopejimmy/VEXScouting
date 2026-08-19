'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Cog,
  Gauge,
  Lightbulb,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wrench,
  Zap,
} from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PartImage } from '@/components/learning/PartImage';
import { gearRacerLesson } from '@/data/learning';
import { getVexIqPart } from '@/data/parts/vexIqParts';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { LearningLanguageToggle } from '@/components/learning/LearningLanguageToggle';

type PredictionChoice = 'faster' | 'stronger' | 'same' | null;
type ChallengeMode = 'speed' | 'power';

const focusStyles = {
  结构: 'bg-blue-50 text-blue-700 border-blue-200',
  传动: 'bg-amber-50 text-amber-700 border-amber-200',
  测试: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function StepDiagram({ index, src, alt, addedPart, language }: { index: number; src: string; alt: string; addedPart: string; language: Language }) {
  const zh = language === 'zh';
  return (
    <figure className="mx-auto w-full max-w-md">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-amber-100 bg-[#f5f2e9]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 767px) 100vw, 220px"
          className="object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-sm backdrop-blur">
          {zh ? `真实零件外观 · 第 ${index + 1} 步` : `Real-part appearance · Step ${index + 1}`}
        </span>
      </div>
      <figcaption className="mt-2 text-center text-xs font-semibold leading-5 text-slate-500">
        {zh ? '本步：' : 'This step: '}{addedPart}
      </figcaption>
    </figure>
  );
}

function GearPair({ mode, language }: { mode: ChallengeMode; language: Language }) {
  const speed = mode === 'speed';
  const zh = language === 'zh';
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl bg-slate-950 p-6 text-white">
      <div className="text-center">
        <Cog className={`${speed ? 'h-24 w-24' : 'h-12 w-12'} text-orange-400`} strokeWidth={2.4} />
        <span className="mt-2 block text-xs font-bold">{zh ? `主动 ${speed ? '36' : '12'} 齿` : `Driving ${speed ? '36T' : '12T'}`}</span>
      </div>
      <ChevronRight className="mx-3 h-6 w-6 text-slate-500" />
      <div className="text-center">
        <Cog className={`${speed ? 'h-12 w-12' : 'h-24 w-24'} text-yellow-300`} strokeWidth={2.4} />
        <span className="mt-2 block text-xs font-bold">{zh ? `从动 ${speed ? '12' : '36'} 齿` : `Driven ${speed ? '12T' : '36T'}`}</span>
      </div>
    </div>
  );
}

export default function GearRacerLessonPage() {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const {
    progress,
    percent,
    canComplete,
    togglePart,
    toggleStep,
    updateProgress,
  } = useLessonProgress(
    gearRacerLesson.id,
    gearRacerLesson.parts.length,
    gearRacerLesson.steps.length,
  );
  const [prediction, setPrediction] = useState<PredictionChoice>(null);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('speed');

  const answerPrediction = (choice: PredictionChoice) => {
    setPrediction(choice);
    updateProgress({ predictionAnswered: true });
  };

  const completeLesson = () => {
    if (!canComplete) return;
    updateProgress({ lessonCompleted: true });
    window.setTimeout(() => document.getElementById('finish')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-slate-900">
      <Header />
      <LearningLanguageToggle />

      <main>
        <section className="border-b border-amber-100 bg-[#fffaf0]">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Link href="/learn" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600">
              <ArrowLeft className="h-4 w-4" />{zh ? '返回机器人课堂' : 'Back to Robotics Classroom'}
            </Link>
            <div className="mt-6 grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700">{zh ? '第 1 节 · 入门' : 'Lesson 1 · Beginner'}</Badge>
                  <Badge variant="outline"><Clock3 className="mr-1 h-3.5 w-3.5" />{gearRacerLesson.duration} {zh ? '分钟' : 'min'}</Badge>
                  <Badge variant="outline">{zh ? gearRacerLesson.ageRange : gearRacerLesson.ageRangeEn}</Badge>
                </div>
                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{zh ? gearRacerLesson.title : gearRacerLesson.titleEn}</h1>
                <p className="mt-4 text-lg leading-8 text-slate-600">{zh ? gearRacerLesson.subtitle : gearRacerLesson.subtitleEn}</p>
                <div className="mt-7 space-y-3">
                  {(zh ? gearRacerLesson.outcomes : gearRacerLesson.outcomesEn).map(outcome => (
                    <div key={outcome} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />{outcome}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[310px] overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-xl sm:min-h-[420px]">
                <Image src={gearRacerLesson.hero} alt={zh ? '齿轮加速赛车完成效果' : 'Completed Gear-Driven Racer'} fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
          <div className="min-w-0 space-y-14">
            <section id="mission" className="scroll-mt-24">
              <div className="rounded-[2rem] bg-slate-950 p-7 text-white sm:p-9">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-400 text-slate-950"><Gauge className="h-6 w-6" /></span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{zh ? '今天的任务' : "Today's mission"}</p>
                    <h2 className="mt-2 text-2xl font-black sm:text-3xl">{zh ? '造一辆能稳定跑过 2 米的齿轮赛车' : 'Build a gear racer that can travel 2 meters reliably'}</h2>
                    <p className="mt-3 max-w-2xl leading-7 text-slate-300">{zh ? '完成基础赛车后，你会交换两个齿轮的位置，观察它究竟会变快，还是变得更有力量。' : 'After the basic racer works, swap the two gears and observe whether it becomes faster or gains more torque.'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="parts" className="scroll-mt-24">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '01 · 找零件' : '01 · Find the parts'}</p>
                  <h2 className="mt-2 text-3xl font-black">{zh ? '先把今天的工具摆上桌' : "Lay out today's parts"}</h2>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold text-slate-500">{progress.checkedParts.length}/{gearRacerLesson.parts.length} {zh ? '已找到' : 'found'}</span>
                  <Link href="/learn/parts" className="mt-1 inline-block text-xs font-bold text-blue-600 hover:text-blue-800">{zh ? '打开零件图库' : 'Open parts library'} →</Link>
                </div>
              </div>
              <p className="mt-3 leading-7 text-slate-600">{zh ? '点击每张卡片完成核对。不同套装中的梁长和轴套外形可能略有不同。' : 'Select each card as you find the part. Beam lengths and collar shapes may vary slightly between kits.'}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {gearRacerLesson.parts.map(part => {
                  const checked = progress.checkedParts.includes(part.id);
                  const libraryPart = getVexIqPart(part.libraryPartId);
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => togglePart(part.id)}
                      className={`group flex min-h-36 items-center gap-4 rounded-2xl border p-4 text-left transition ${checked ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md'}`}
                    >
                      <PartImage partId={part.libraryPartId} className="h-24 w-28 shrink-0 bg-slate-50" sizes="112px" />
                      <span className="flex-1">
                        <span className="flex items-center justify-between gap-2 font-black"><span>{zh ? part.name : part.nameEn} × {part.count}</span>{checked && <Check className="h-5 w-5 text-emerald-600" />}</span>
                        <span className="mt-1 block text-[11px] font-semibold text-blue-600">{zh ? libraryPart.name : libraryPart.nameEn}</span>
                        <span className="mt-1.5 block text-xs leading-5 text-slate-500">{zh ? part.note : part.noteEn}</span>
                        <span className="mt-1.5 block text-[11px] leading-4 text-amber-700">{zh ? '辨认提示：' : 'Identification tip: '}{zh ? libraryPart.identificationTip : libraryPart.identificationTipEn}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section id="build" className="scroll-mt-24">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '02 · 开始搭建' : '02 · Start building'}</p>
                <h2 className="mt-2 text-3xl font-black">{zh ? '一次只完成一个动作' : 'Complete one action at a time'}</h2>
                <p className="mt-3 leading-7 text-slate-600">{zh ? '每一步做完后先执行检查，再点“这一步完成了”。搭建图使用真实 VEX IQ 零件外观帮助辨认；安装孔位与方向仍要配合步骤文字和完成检查。' : 'After each step, perform the check before marking it complete. Build images help identify real VEX IQ part shapes; use the written instructions and checks for hole positions and orientation.'}</p>
              </div>
              <div className="mt-8 space-y-5">
                {gearRacerLesson.steps.map((step, index) => {
                  const completed = progress.completedSteps.includes(step.id);
                  return (
                    <Card key={step.id} className={`overflow-hidden py-0 transition ${completed ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
                      <CardContent className="grid gap-6 p-5 sm:p-7 md:grid-cols-[220px_1fr]">
                        <StepDiagram
                          index={index}
                          src={step.image.src}
                          alt={zh ? step.image.alt : step.image.altEn}
                          addedPart={zh ? step.image.addedPart : step.image.addedPartEn}
                          language={language}
                        />
                        <div className="flex min-w-0 flex-col">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">{index + 1}</span>
                            <Badge variant="outline" className={focusStyles[step.focus]}>{zh ? step.focus : ({ 结构: 'Structure', 传动: 'Transmission', 测试: 'Testing' }[step.focus])}</Badge>
                          </div>
                          <h3 className="mt-4 text-xl font-black">{zh ? step.title : step.titleEn}</h3>
                          <p className="mt-3 leading-7 text-slate-700">{zh ? step.instruction : step.instructionEn}</p>
                          {step.id === 'roll-test' && (
                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
                              <strong className="block">{zh ? '正确供电与控制链路' : 'Correct power and control chain'}</strong>
                              <div className="mt-2 flex flex-wrap items-center gap-2 font-bold">
                                <span className="rounded-full bg-white px-3 py-1">Battery</span>
                                <ArrowRight className="h-4 w-4" />
                                <span className="rounded-full bg-white px-3 py-1">Brain</span>
                                <ArrowRight className="h-4 w-4" />
                                <span className="rounded-full bg-white px-3 py-1">Smart Cable</span>
                                <ArrowRight className="h-4 w-4" />
                                <span className="rounded-full bg-white px-3 py-1">{zh ? '智能电机' : 'Smart Motor'}</span>
                              </div>
                            </div>
                          )}
                          {step.id === 'powered-test' && (
                            <div className="mt-4 flex gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm leading-6 text-violet-950">
                              <Zap className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                              <span><strong>{zh ? '最小测试程序：' : 'Minimum test program: '}</strong>{zh ? '当开始 → 设置电机速度为 20% → 电机正转 1 圈 → 停止电机。' : 'When started → set motor velocity to 20% → spin forward for 1 turn → stop motor.'}</span>
                            </div>
                          )}
                          <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                            <span><strong>{zh ? '完成检查：' : 'Completion check: '}</strong>{zh ? step.check : step.checkEn}</span>
                          </div>
                          <Button
                            type="button"
                            variant={completed ? 'outline' : 'default'}
                            onClick={() => toggleStep(step.id)}
                            className={`mt-5 self-start rounded-full ${completed ? 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            {completed ? <><CheckCircle2 />{zh ? '这一步已完成' : 'Step complete'}</> : <><Circle />{zh ? '这一步完成了' : 'Mark step complete'}</>}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <span><strong>{zh ? '安全提醒：' : 'Safety reminder: '}</strong>{zh ? '第一次通电测试时，先把车轮抬离桌面并使用低速。长发、衣袖和手指要远离转动的齿轮与车轮。' : 'For the first powered test, lift the wheels off the table and use low speed. Keep hair, sleeves, and fingers away from moving gears and wheels.'}</span>
              </div>
            </section>

            <section id="discover" className="scroll-mt-24">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '03 · 发现原理' : '03 · Discover the principle'}</p>
              <h2 className="mt-2 text-3xl font-black">{zh ? '大齿轮带动小齿轮，会发生什么？' : 'What happens when a large gear drives a small gear?'}</h2>
              <div className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                <GearPair mode="speed" language={language} />
                <Card className="border-slate-200 bg-white py-0">
                  <CardContent className="p-6">
                    <p className="font-black">{zh ? '先预测，再看答案' : 'Predict before revealing the answer'}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{zh ? '36 齿主动齿轮转一圈，带动 12 齿从动齿轮。小齿轮会怎样？' : 'A 36-tooth driving gear turns once and drives a 12-tooth gear. What will the small gear do?'}</p>
                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      {[
                        ['faster', zh ? '转得更快' : 'Spin faster'],
                        ['stronger', zh ? '更有力量' : 'Gain torque'],
                        ['same', zh ? '完全不变' : 'Stay the same'],
                      ].map(([value, label]) => (
                        <Button key={value} type="button" variant={prediction === value ? 'default' : 'outline'} onClick={() => answerPrediction(value as PredictionChoice)} className={prediction === value ? 'bg-blue-600' : ''}>{label}</Button>
                      ))}
                    </div>
                    {prediction && (
                      <div className={`mt-5 rounded-xl p-4 text-sm leading-6 ${prediction === 'faster' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
                        <strong>{prediction === 'faster' ? (zh ? '预测正确！' : 'Correct prediction!') : (zh ? '很好的尝试，再观察齿数。' : 'Good try—look at the tooth counts again.')}</strong>
                        <p className="mt-1">{zh ? '36 ÷ 12 = 3，所以小齿轮理论上会转得约 3 倍快，但输出力量会减小。现实中摩擦和结构松动会损失一部分速度。' : '36 ÷ 12 = 3, so the small gear theoretically spins about three times faster, but with less output torque. Friction and looseness reduce the real speed.'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  [zh ? '主动齿轮' : 'Driving gear', zh ? '直接接收电机动力的齿轮。' : 'The gear that receives power directly from the motor.'],
                  [zh ? '从动齿轮' : 'Driven gear', zh ? '被另一个齿轮带动的齿轮。' : 'The gear turned by another gear.'],
                  [zh ? '传动比' : 'Gear ratio', zh ? '两个齿轮齿数的比例，决定速度与力量的变化。' : 'The ratio of gear tooth counts that changes speed and torque.'],
                ].map(([term, definition]) => (
                  <div key={term} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="font-black text-blue-700">{term}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{definition}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="challenge" className="scroll-mt-24">
              <div className="rounded-[2rem] bg-gradient-to-br from-blue-700 to-violet-700 p-7 text-white sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">{zh ? '04 · 改造挑战' : '04 · Modification challenge'}</p>
                    <h2 className="mt-2 text-3xl font-black">{zh ? '速度版，还是大力版？' : 'Speed build or torque build?'}</h2>
                    <p className="mt-3 max-w-2xl leading-7 text-blue-100">{zh ? '选择一种传动方式，预测表现，然后在相同距离上测试。只改变齿轮位置，其他条件保持不变。' : 'Choose a gear arrangement, predict its behavior, and test it over the same distance. Change only the gear positions.'}</p>
                  </div>
                  {progress.challengeCompleted && <Badge className="border-emerald-300 bg-emerald-400 text-emerald-950"><CheckCircle2 className="mr-1 h-4 w-4" />{zh ? '挑战已记录' : 'Challenge recorded'}</Badge>}
                </div>

                <div className="mt-7 grid gap-5 lg:grid-cols-2">
                  {(['speed', 'power'] as ChallengeMode[]).map(mode => {
                    const isSpeed = mode === 'speed';
                    const selected = challengeMode === mode;
                    return (
                      <button key={mode} type="button" onClick={() => setChallengeMode(mode)} className={`rounded-3xl border p-4 text-left transition ${selected ? 'border-cyan-300 bg-white/15 ring-2 ring-cyan-300' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}>
                        <GearPair mode={mode} language={language} />
                        <div className="p-3">
                          <p className="flex items-center gap-2 text-lg font-black">{isSpeed ? <Zap className="text-amber-300" /> : <Wrench className="text-amber-300" />}{isSpeed ? (zh ? '速度版' : 'Speed build') : (zh ? '大力版' : 'Torque build')}</p>
                          <p className="mt-2 text-sm leading-6 text-blue-100">{isSpeed ? (zh ? '大齿轮带小齿轮：车轮更快，适合轻车和平整路面。' : 'Large gear drives small gear: faster wheels for a light robot on a flat surface.') : (zh ? '小齿轮带大齿轮：车轮更慢，但更适合推重物或爬缓坡。' : 'Small gear drives large gear: slower wheels, but better for pushing loads or climbing gentle slopes.')}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-2xl bg-white/10 p-5">
                  <p className="font-black">{zh ? '测试记录' : 'Test record'}</p>
                  <ol className="mt-3 grid gap-2 text-sm leading-6 text-blue-50 sm:grid-cols-3">
                    <li>{zh ? '1. 在地面标出相同的 2 米距离' : '1. Mark the same 2-meter distance'}</li>
                    <li>{zh ? '2. 两种配置分别测试 3 次' : '2. Test each setup three times'}</li>
                    <li>{zh ? '3. 比较时间、直线稳定性和声音' : '3. Compare time, straightness, and sound'}</li>
                  </ol>
                  <Button type="button" onClick={() => updateProgress({ challengeCompleted: true })} className="mt-5 rounded-full bg-amber-400 text-slate-950 hover:bg-amber-300">
                    <PackageCheck />{zh ? '我已经完成对比测试' : 'I completed the comparison test'}
                  </Button>
                </div>
              </div>
            </section>

            <section id="finish" className="scroll-mt-24">
              <Card className={`overflow-hidden border-0 py-0 ${progress.lessonCompleted ? 'bg-amber-50' : 'bg-white shadow-sm'}`}>
                <CardContent className="p-8 text-center sm:p-12">
                  <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${progress.lessonCompleted ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-400'}`}>
                    <Trophy className="h-10 w-10" />
                  </div>
                  <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-amber-600">{zh ? '课程徽章' : 'Lesson badge'}</p>
                  <h2 className="mt-2 text-3xl font-black">{zh ? '齿轮探索者' : 'Gear Explorer'}</h2>
                  <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
                    {progress.lessonCompleted
                      ? (zh ? '你已经完成赛车搭建、原理预测和改造挑战。下一次看到齿轮时，试着先判断谁是主动齿轮。' : 'You completed the racer, principle prediction, and modification challenge. Next time you see gears, identify the driving gear first.')
                      : (zh ? '完成全部零件核对、搭建步骤、原理预测和改造挑战后即可获得。' : 'Complete the parts check, build steps, prediction, and modification challenge to earn this badge.')}
                  </p>
                  <Button type="button" size="lg" disabled={!canComplete || progress.lessonCompleted} onClick={completeLesson} className="mt-7 rounded-full bg-slate-950 px-8 hover:bg-slate-800">
                    {progress.lessonCompleted ? <><CheckCircle2 />{zh ? '课程已完成' : 'Lesson complete'}</> : <><Sparkles />{zh ? '完成课程' : 'Complete lesson'}</>}
                  </Button>
                  {!canComplete && !progress.lessonCompleted && <p className="mt-3 text-xs text-slate-500">{zh ? '还需要完成上方未勾选的学习环节' : 'Complete the unchecked activities above first'}</p>}
                  {progress.lessonCompleted && (
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      <Button asChild variant="outline" className="rounded-full bg-white"><Link href="/learn"><ArrowLeft />{zh ? '返回学习中心' : 'Back to Learning Center'}</Link></Button>
                      <Button type="button" variant="ghost" className="rounded-full" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><RotateCcw />{zh ? '重新查看' : 'Review again'}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-black">{zh ? '课程进度' : 'Lesson progress'}</span>
                <span className="text-sm font-black text-blue-600">{percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all" style={{ width: `${percent}%` }} />
              </div>
              <nav className="mt-6 space-y-1 text-sm">
                {[
                  ['mission', zh ? '今天的任务' : "Today's mission", true],
                  ['parts', zh ? '01 · 找零件' : '01 · Find parts', progress.checkedParts.length === gearRacerLesson.parts.length],
                  ['build', zh ? '02 · 开始搭建' : '02 · Build', progress.completedSteps.length === gearRacerLesson.steps.length],
                  ['discover', zh ? '03 · 发现原理' : '03 · Discover', progress.predictionAnswered],
                  ['challenge', zh ? '04 · 改造挑战' : '04 · Challenge', progress.challengeCompleted],
                  ['finish', zh ? '完成与徽章' : 'Finish & badge', progress.lessonCompleted],
                ].map(([id, label, done]) => (
                  <a key={id as string} href={`#${id}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600">
                    <span>{label as string}</span>
                    {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                  </a>
                ))}
              </nav>
              <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-900">
                <strong>{zh ? '给家长和老师：' : 'For parents and teachers: '}</strong>{zh ? '不要直接替孩子修好。先问“是哪一个部分没有像预期那样运动？”' : 'Do not fix it for the child right away. First ask, “Which part did not move as you expected?”'}
              </div>
              <Button asChild variant="ghost" className="mt-3 w-full rounded-full text-slate-500"><Link href="/learn">{zh ? '退出课程' : 'Exit lesson'}<ArrowRight /></Link></Button>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
