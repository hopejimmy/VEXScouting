'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Team } from '@/types/skills';

interface FavoritesContextType {
  favorites: Team[];
  addToFavorites: (team: Team) => void;
  removeFromFavorites: (teamNumber: string) => void;
  isFavorite: (teamNumber: string) => boolean;
  clearFavorites: () => void;
}

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
      if (prev.some(fav => fav.teamNumber === team.teamNumber)) {
        return prev; // Already in favorites
      }
      return [...prev, team];
    });
  };

  const removeFromFavorites = (teamNumber: string) => {
    setFavorites(prev => prev.filter(team => team.teamNumber !== teamNumber));
  };

  const isFavorite = (teamNumber: string) => {
    return favorites.some(team => team.teamNumber === teamNumber);
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