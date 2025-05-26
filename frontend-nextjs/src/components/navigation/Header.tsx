'use client';

import { Trophy, Heart, GitCompare, Home } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCompare } from '@/contexts/CompareContext';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { favorites } = useFavorites();
  const { compareList } = useCompare();

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
          </nav>
        </div>
      </div>
    </header>
  );
} 