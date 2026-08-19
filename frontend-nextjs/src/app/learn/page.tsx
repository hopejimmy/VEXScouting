'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Camera, CheckCircle2, Clock3, Cog, LockKeyhole, Sparkles, Trophy } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { gearRacerLesson, learningPaths } from '@/data/learning';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import { LearningLanguageToggle } from '@/components/learning/LearningLanguageToggle';
import { rescueCraneLesson } from '@/data/rescueCrane';

export default function LearningCenterPage() {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const { progress, percent, isLoaded } = useLessonProgress(
    gearRacerLesson.id,
    gearRacerLesson.parts.length,
    gearRacerLesson.steps.length,
  );

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-slate-900">
      <Header />
      <LearningLanguageToggle />

      <main>
        <section className="relative overflow-hidden border-b border-amber-100 bg-[#fffaf0]">
          <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="absolute right-10 top-6 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
            <div className="z-10">
              <Badge className="mb-5 border-amber-200 bg-amber-100 px-3 py-1 text-amber-800">
                <Sparkles className="mr-1 h-3.5 w-3.5" /> {zh ? '项目式机器人课堂' : 'Project-Based Robotics'}
              </Badge>
              <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {zh ? '先动手造出来，' : 'Build it first. '}
                <span className="text-blue-600">{zh ? '再发现为什么。' : 'Then discover why.'}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                {zh
                  ? '每节课从一个会动、能用的有趣作品开始。孩子在搭建、测试和改造中，自然理解零件、机械结构与程序逻辑。'
                  : 'Every lesson begins with something fun that moves or works. By building, testing, and improving it, children naturally understand parts, mechanisms, and code.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-full bg-blue-600 px-6 hover:bg-blue-700">
                  <Link href="/learn/courses/gear-racer">
                    {percent > 0 ? (zh ? '继续样板课' : 'Continue sample lesson') : (zh ? '开始第一节课' : 'Start the first lesson')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-slate-300 bg-white/70 px-6">
                  <Link href="#path">{zh ? '查看学习路线' : 'View learning path'}</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{zh ? '8–12 岁' : 'Ages 8–12'}</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{zh ? '无需机械基础' : 'No mechanics experience needed'}</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{zh ? '进度自动保存' : 'Progress saves automatically'}</span>
              </div>
            </div>

            <div className="relative min-h-[330px] overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_80px_-30px_rgba(30,64,175,0.35)] sm:min-h-[440px]">
              <Image
                src={gearRacerLesson.hero}
                alt={zh ? '由梁、车轮和齿轮搭建的教育机器人赛车' : 'An educational robot racer built with beams, wheels, and gears'}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/80 bg-white/85 p-4 shadow-lg backdrop-blur">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{zh ? '当前样板课' : 'Current sample lesson'}</p>
                  <p className="mt-1 font-bold text-slate-900">{zh ? gearRacerLesson.title : gearRacerLesson.titleEn}</p>
                </div>
                <div className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">{gearRacerLesson.duration} {zh ? '分钟' : 'min'}</div>
              </div>
            </div>
          </div>
        </section>

        <section id="path" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '学习路线' : 'Learning path'}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{zh ? '从第一根轴，到第一台机器人' : 'From your first shaft to your first robot'}</h2>
            <p className="mt-4 leading-7 text-slate-600">{zh ? '三个阶段逐步开放。每个新知识都会先出现在作品里，然后才被命名和解释。' : 'Three stages unlock progressively. Every new idea appears in a build before it is named and explained.'}</p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {learningPaths.map(path => (
              <Card key={path.id} className={`relative overflow-hidden border-0 py-0 shadow-sm ${path.status === 'available' ? 'bg-white' : 'bg-slate-100/70'}`}>
                <div className={`h-2 bg-gradient-to-r ${path.accent}`} />
                <CardContent className="p-7">
                  <div className="flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-white">{path.order}</span>
                    {path.status === 'available' ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{zh ? '可以开始' : 'Available'}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500"><LockKeyhole className="mr-1 h-3 w-3" />{zh ? '即将推出' : 'Coming soon'}</Badge>
                    )}
                  </div>
                  <h3 className="mt-7 text-2xl font-black">{zh ? path.title : path.titleEn}</h3>
                  <p className="mt-3 min-h-20 leading-7 text-slate-600">{zh ? path.description : path.descriptionEn}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <BookOpen className="h-4 w-4" />{zh ? `规划 ${path.lessonCount} 节项目课` : `${path.lessonCount} project lessons planned`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="lessons" className="border-y border-slate-200 bg-white/70">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '项目课程' : 'Project lessons'}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{zh ? '每一课，都从一个任务开始' : 'Every lesson starts with a mission'}</h2>
            <div className="mt-9 grid gap-6 lg:grid-cols-2">
              <Card className="overflow-hidden border-blue-100 bg-white py-0 shadow-sm">
                <CardContent className="grid gap-0 p-0 sm:grid-cols-[220px_1fr]">
                  <div className="relative min-h-56 sm:min-h-full"><Image src={gearRacerLesson.hero} alt={zh ? '齿轮加速赛车' : 'Gear-Driven Racer'} fill sizes="220px" className="object-cover" /></div>
                  <div className="flex flex-col p-6">
                    <div className="flex flex-wrap gap-2"><Badge>{zh ? '第 1 课' : 'Lesson 1'}</Badge><Badge variant="outline" className="border-emerald-200 text-emerald-700">{zh ? '可以开始' : 'Available'}</Badge></div>
                    <h3 className="mt-4 text-2xl font-black">{zh ? gearRacerLesson.title : gearRacerLesson.titleEn}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{zh ? gearRacerLesson.subtitle : gearRacerLesson.subtitleEn}</p>
                    <Button asChild className="mt-5 self-start rounded-full bg-blue-600 hover:bg-blue-700"><Link href="/learn/courses/gear-racer">{percent > 0 ? (zh ? '继续学习' : 'Continue') : (zh ? '开始课程' : 'Start lesson')}<ArrowRight /></Link></Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-violet-100 bg-white py-0 shadow-sm">
                <CardContent className="grid gap-0 p-0 sm:grid-cols-[220px_1fr]">
                  <div className="relative min-h-56 overflow-hidden bg-slate-950">
                    <Image src={rescueCraneLesson.hero} alt={zh ? '手摇救援起重机课程概念图' : 'Hand-crank rescue crane lesson concept'} fill sizes="220px" className="object-cover" />
                    <span className="absolute bottom-3 left-3 z-50 flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur"><Camera className="h-3.5 w-3.5" />{zh ? '课程概念封面' : 'Lesson concept'}</span>
                  </div>
                  <div className="flex flex-col p-6">
                    <div className="flex flex-wrap gap-2"><Badge className="bg-violet-600">{zh ? '第 2 课' : 'Lesson 2'}</Badge><Badge variant="outline" className="border-violet-200 text-violet-700">{zh ? '设计预览' : 'Design preview'}</Badge></div>
                    <h3 className="mt-4 text-2xl font-black">{zh ? rescueCraneLesson.title : rescueCraneLesson.titleEn}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{zh ? rescueCraneLesson.subtitle : rescueCraneLesson.subtitleEn}</p>
                    <Button asChild variant="outline" className="mt-5 self-start rounded-full border-violet-300 text-violet-700 hover:bg-violet-50"><Link href="/learn/courses/rescue-crane">{zh ? '查看课程设计' : 'View lesson design'}<ArrowRight /></Link></Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="progress" className="border-y border-blue-100 bg-blue-50/70">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{zh ? '我的学习' : 'My learning'}</p>
              <h2 className="mt-3 text-3xl font-black">{zh ? '从这里继续' : 'Continue from here'}</h2>
              <p className="mt-3 leading-7 text-slate-600">{zh ? '样板课不需要登录。完成记录只保存在这个浏览器中。' : 'No sign-in is needed for the sample lesson. Progress is stored only in this browser.'}</p>
            </div>
            <Card className="border-blue-100 bg-white py-0 shadow-sm">
              <CardContent className="p-6 sm:p-7">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="relative h-28 w-full overflow-hidden rounded-2xl sm:w-44">
                    <Image src={gearRacerLesson.hero} alt={zh ? '齿轮加速赛车课程' : 'Gear-Driven Racer lesson'} fill sizes="176px" className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{zh ? '第 1 节' : 'Lesson 1'}</Badge>
                      <span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{gearRacerLesson.duration} {zh ? '分钟' : 'min'}</span>
                    </div>
                    <h3 className="mt-2 text-xl font-black">{zh ? gearRacerLesson.title : gearRacerLesson.titleEn}</h3>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all" style={{ width: `${isLoaded ? percent : 0}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>{progress.lessonCompleted ? (zh ? '已获得齿轮探索者徽章' : 'Gear Explorer badge earned') : percent > 0 ? (zh ? '学习进行中' : 'In progress') : (zh ? '尚未开始' : 'Not started')}</span>
                      <span>{isLoaded ? percent : 0}%</span>
                    </div>
                  </div>
                  <Button asChild className="rounded-full bg-slate-950 hover:bg-slate-800">
                    <Link href="/learn/courses/gear-racer">{percent > 0 ? (zh ? '继续' : 'Continue') : (zh ? '开始' : 'Start')}<ArrowRight /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [Cog, zh ? '先做作品' : 'Build first', zh ? '每节课先完成一个会动或能用的结构，让问题自然出现。' : 'Begin each lesson with a working structure so the questions arise naturally.'],
              [Sparkles, zh ? '边试边懂' : 'Learn by testing', zh ? '用预测、对比和故障排查，把抽象原理变成看得见的变化。' : 'Turn abstract ideas into visible changes through prediction, comparison, and troubleshooting.'],
              [Trophy, zh ? '完成挑战' : 'Complete a challenge', zh ? '不照抄唯一答案，通过自己的改造证明已经真正理解。' : 'Go beyond copying one answer and prove your understanding through your own modification.'],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof Cog;
              return (
                <div key={title as string} className="rounded-3xl border border-slate-200 bg-white p-7">
                  <FeatureIcon className="h-8 w-8 text-blue-600" />
                  <h3 className="mt-5 text-lg font-black">{title as string}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{description as string}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
