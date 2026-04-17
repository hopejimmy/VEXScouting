'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Team } from '@/types/skills';

interface FavoritesContextType {
  favorites: Team[];
  addToFavorites: (team: Team) => void;
  removeFromFavorites: (teamNumber: string, matchType: string) => void;
  isFavorite: (teamNumber: string, matchType: string) => boolean;
  clearFavorites: () => void;
}

// Favorites are keyed by (teamNumber, matchType) because the same team number
// can exist as separate registrations across programs (e.g. "252A" in both VRC
// and VEXIQ). Keying by teamNumber alone caused the second program's favorite
// to be silently rejected and the heart UI to lie.
const favKey = (teamNumber: string, matchType: string) => `${teamNumber}::${matchType}`;

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Team[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedFavorites = localStorage.getItem('vex-scouting-favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('vex-scouting-favorites', JSON.stringify(favorites));
    }
  }, [favorites, mounted]);

  const addToFavorites = (team: Team) => {
    setFavorites(prev => {
      const key = favKey(team.teamNumber, team.matchType);
      if (prev.some(fav => favKey(fav.teamNumber, fav.matchType) === key)) {
        return prev; // Already in favorites for this matchType
      }
      return [...prev, team];
    });
  };

  const removeFromFavorites = (teamNumber: string, matchType: string) => {
    const key = favKey(teamNumber, matchType);
    setFavorites(prev => prev.filter(team => favKey(team.teamNumber, team.matchType) !== key));
  };

  const isFavorite = (teamNumber: string, matchType: string) => {
    const key = favKey(teamNumber, matchType);
    return favorites.some(team => favKey(team.teamNumber, team.matchType) === key);
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const value = {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
} 