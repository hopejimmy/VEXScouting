'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Team } from '@/types/skills';

interface CompareContextType {
  compareList: Team[];
  addToCompare: (team: Team) => void;
  removeFromCompare: (teamNumber: string) => void;
  isInCompare: (teamNumber: string) => boolean;
  clearCompare: () => void;
  canAddToCompare: boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const MAX_COMPARE_TEAMS = 4; // Maximum teams that can be compared at once

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<Team[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load compare list from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedCompareList = localStorage.getItem('vex-scouting-compare');
    if (savedCompareList) {
      try {
        setCompareList(JSON.parse(savedCompareList));
      } catch (error) {
        console.error('Error loading compare list:', error);
      }
    }
  }, []);

  // Save compare list to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('vex-scouting-compare', JSON.stringify(compareList));
    }
  }, [compareList, mounted]);

  const addToCompare = (team: Team) => {
    setCompareList(prev => {
      if (prev.some(compareTeam => compareTeam.teamNumber === team.teamNumber)) {
        return prev; // Already in compare list
      }
      if (prev.length >= MAX_COMPARE_TEAMS) {
        return prev; // Max teams reached
      }
      return [...prev, team];
    });
  };

  const removeFromCompare = (teamNumber: string) => {
    setCompareList(prev => prev.filter(team => team.teamNumber !== teamNumber));
  };

  const isInCompare = (teamNumber: string) => {
    return compareList.some(team => team.teamNumber === teamNumber);
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  const canAddToCompare = compareList.length < MAX_COMPARE_TEAMS;

  const value = {
    compareList,
    addToCompare,
    removeFromCompare,
    isInCompare,
    clearCompare,
    canAddToCompare,
  };

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
} 