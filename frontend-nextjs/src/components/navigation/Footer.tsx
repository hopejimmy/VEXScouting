import { Trophy } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

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
              Professional scouting platform for VEX Robotics competitions. 
              Track team performance, analyze competition data, and gain competitive insights.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Platform</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a href="/favorites" className="hover:text-blue-600 transition-colors">
                  Favorites
                </a>
              </li>
              <li>
                <a href="/compare" className="hover:text-blue-600 transition-colors">
                  Compare Teams
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-blue-600 transition-colors">
                  Team Search
                </a>
              </li>
            </ul>
          </div>

          {/* Programs Supported */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Competitions</h3>
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
            © {currentYear} VEX Scouting. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-xs text-gray-500">
              Powered by RobotEvents API
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
