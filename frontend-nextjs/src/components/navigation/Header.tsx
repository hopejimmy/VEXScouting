'use client';

import Image from 'next/image';
import { Heart, GitCompare, Home, Upload, Trash2, User, LogOut, Settings, LogIn } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCompare } from '@/contexts/CompareContext';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/auth/LoginModal';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { favorites, clearFavorites } = useFavorites();
  const { compareList, clearCompare } = useCompare();
  const { user, isAuthenticated, logout, hasPermission } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const hasItemsToClear = favorites.length > 0 || compareList.length > 0;

  const clearAllStorage = () => {
    clearFavorites();
    clearCompare();
    localStorage.removeItem('vex-scouting-favorites');
    localStorage.removeItem('vex-scouting-compare');
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
      count: 0,
      permission: null, // Always visible
    },
    {
      icon: Heart,
      label: 'Favorites',
      path: '/favorites',
      count: favorites.length,
      permission: null, // Always visible - no login required
    },
    {
      icon: GitCompare,
      label: 'Compare',
      path: '/compare',
      count: compareList.length,
      permission: null, // Always visible - no login required
    },
    {
      icon: Upload,
      label: 'Upload',
      path: '/upload',
      count: 0,
      permission: 'upload:create',
    },
    {
      icon: Settings,
      label: 'Admin',
      path: '/admin',
      count: 0,
      permission: 'admin:access',
    },
  ];

  // Filter navigation items based on permissions
  const visibleNavItems = navItems.filter(item => {
    if (!item.permission) return true; // Always show items without permission requirements
    if (!isAuthenticated) return false; // Hide protected items if not authenticated
    return hasPermission(item.permission); // Show if user has permission
  });

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => router.push('/')}
            >
              <Image
                src="/icon.svg"
                alt="VEX Scouting logo"
                width={32}
                height={32}
                className="h-8 w-8"
                priority
              />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                VEX Scouting
              </h1>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-2">
              {visibleNavItems.map((item) => {
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
              
              {/* Clear Storage Button */}
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

              {/* Authentication Section */}
              <div className="h-4 w-px bg-gray-200 mx-2" />
              {isAuthenticated ? (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user?.username}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {user?.role}
                    </span>
                  </Button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />

      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </>
  );
} 