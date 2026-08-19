'use client';

import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePathname } from 'next/navigation';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { language } = useLanguage();
  const pathname = usePathname();
  const zh = pathname.startsWith('/learn') && language === 'zh';

  return (
    <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                VEX Scouting
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {zh
                ? '面向 VEX 机器人竞赛的专业数据与学习平台。追踪队伍表现、分析竞赛数据，并通过项目课程学习机器人。'
                : 'Professional scouting and learning platform for VEX Robotics. Track team performance, analyze competition data, and learn robotics through projects.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">{zh ? '平台' : 'Platform'}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="/favorites" className="hover:text-blue-600 transition-colors">
                  {zh ? '收藏' : 'Favorites'}
                </a>
              </li>
              <li>
                <a href="/compare" className="hover:text-blue-600 transition-colors">
                  {zh ? '队伍对比' : 'Compare Teams'}
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-blue-600 transition-colors">
                  {zh ? '队伍搜索' : 'Team Search'}
                </a>
              </li>
            </ul>
          </div>

          {/* Programs Supported */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">{zh ? '支持的竞赛' : 'Competitions'}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>VRC (V5 Robotics Competition)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>VEXIQ (IQ Robotics Competition)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>VEXU (University Competition)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <p>
            © {currentYear} VEX Scouting. {zh ? '保留所有权利。' : 'All rights reserved.'}
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-xs text-gray-500">
              {zh ? '数据由 RobotEvents API 提供' : 'Powered by RobotEvents API'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
