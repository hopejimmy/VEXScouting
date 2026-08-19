'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface LessonProgressData {
  checkedParts: string[];
  completedSteps: string[];
  predictionAnswered: boolean;
  challengeCompleted: boolean;
  lessonCompleted: boolean;
  updatedAt: string | null;
}

const defaultProgress: LessonProgressData = {
  checkedParts: [],
  completedSteps: [],
  predictionAnswered: false,
  challengeCompleted: false,
  lessonCompleted: false,
  updatedAt: null,
};

export const lessonProgressKey = (lessonId: string) => `vex-learning-progress:${lessonId}`;

export function useLessonProgress(lessonId: string, partCount: number, stepCount: number) {
  const [progress, setProgress] = useState<LessonProgressData>(defaultProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(lessonProgressKey(lessonId));
      if (stored) {
        setProgress({ ...defaultProgress, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.warn('Could not load lesson progress:', error);
    } finally {
      setIsLoaded(true);
    }
  }, [lessonId]);

  const updateProgress = useCallback((update: Partial<LessonProgressData>) => {
    setProgress(current => {
      const next = { ...current, ...update, updatedAt: new Date().toISOString() };
      localStorage.setItem(lessonProgressKey(lessonId), JSON.stringify(next));
      return next;
    });
  }, [lessonId]);

  const togglePart = useCallback((partId: string) => {
    const checkedParts = progress.checkedParts.includes(partId)
      ? progress.checkedParts.filter(id => id !== partId)
      : [...progress.checkedParts, partId];
    updateProgress({ checkedParts });
  }, [progress.checkedParts, updateProgress]);

  const toggleStep = useCallback((stepId: string) => {
    const completedSteps = progress.completedSteps.includes(stepId)
      ? progress.completedSteps.filter(id => id !== stepId)
      : [...progress.completedSteps, stepId];
    updateProgress({ completedSteps });
  }, [progress.completedSteps, updateProgress]);

  const percent = useMemo(() => {
    const total = partCount + stepCount + 3;
    const done = progress.checkedParts.length
      + progress.completedSteps.length
      + Number(progress.predictionAnswered)
      + Number(progress.challengeCompleted)
      + Number(progress.lessonCompleted);
    return Math.round((done / total) * 100);
  }, [partCount, progress, stepCount]);

  const canComplete = progress.checkedParts.length === partCount
    && progress.completedSteps.length === stepCount
    && progress.predictionAnswered
    && progress.challengeCompleted;

  return {
    progress,
    percent,
    isLoaded,
    canComplete,
    togglePart,
    toggleStep,
    updateProgress,
  };
}

