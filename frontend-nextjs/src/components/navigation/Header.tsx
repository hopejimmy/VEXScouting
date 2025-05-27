'use client';

import { Trophy, Heart, GitCompare, Home, Upload, Trash2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCompare } from '@/contexts/CompareContext';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { favorites, clearFavorites } = useFavorites();
  const { compareList, clearCompare } = useCompare();

  const hasItemsToClear = favorites.length > 0 || compareList.length > 0;

  const clearAllStorage = () => {
    clearFavorites();
    clearCompare();
    localStorage.removeItem('vex-scouting-favorites');
    localStorage.removeItem('vex-scouting-compare');
  };

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
      count: 0,
    },
    {
      icon: Heart,
      label: 'Favorites',
      path: '/favorites',
      count: favorites.length,
    },
    {
      icon: GitCompare,
      label: 'Compare',
      path: '/compare',
      count: compareList.length,
    },
    {
      icon: Upload,
      label: 'Upload',
      path: '/upload',
      count: 0,
    },
  ];

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              VEX Scouting
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push(item.path)}
                  className={`relative flex items-center space-x-2 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={`ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs ${
                        isActive 
                          ? 'bg-white/20 text-white border-white/30' 
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }`}
                    >
                      {item.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
            <div className="h-4 w-px bg-gray-200 mx-2" />
            <TooltipProvider>
              <Tooltip content={hasItemsToClear ? "Clear favorites and compare lists" : "No items to clear"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllStorage}
                  disabled={!hasItemsToClear}
                  className={`${
                    hasItemsToClear 
                      ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Tooltip>
            </TooltipProvider>
          </nav>
        </div>
      </div>
    </header>
  );
} 