# VEX Scouting Platform

A professional, modern web application for scouting and analyzing VEX Robotics teams worldwide. Built with Next.js 14, TypeScript, and Tailwind CSS for a beautiful, responsive user experience.

![VEX Scouting Platform](https://img.shields.io/badge/VEX-Scouting-blue?style=for-the-badge&logo=robot)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![Express.js](https://img.shields.io/badge/Express.js-4-green?style=flat-square&logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-blue?style=flat-square&logo=sqlite)

## ✨ Features

### 🔍 **Team Search & Discovery**
- **Real-time search** by team number or name
- **Comprehensive team data** including skills scores, rankings, and performance metrics
- **Beautiful team cards** with gradient avatars and detailed information
- **Responsive grid layout** optimized for all screen sizes

### ❤️ **Favorites System**
- **Add/remove teams** to your personal favorites list
- **Persistent storage** using localStorage
- **Dedicated favorites page** with beautiful empty states
- **Quick access** from navigation with live counters
- **Bulk operations** including "Clear All" functionality

### 📊 **Team Comparison**
- **Side-by-side comparison** of up to 4 teams
- **Detailed metrics table** highlighting best performers
- **Visual indicators** for top performance in each category
- **Interactive comparison cards** with remove/favorite actions
- **Performance analytics** including rank, scores, and skills breakdown

### 🎨 **Modern UI/UX**
- **Glass morphism design** with backdrop blur effects
- **Gradient backgrounds** and smooth animations
- **Professional color scheme** with blue/purple gradients
- **Framer Motion animations** for smooth transitions
- **Mobile-first responsive design**
- **Intuitive navigation** with active state indicators

### 🔧 **Technical Excellence**
- **TypeScript** for type safety and better development experience
- **React Query** for efficient data fetching and caching
- **Context API** for state management
- **localStorage persistence** for favorites and comparisons
- **SSR/CSR hydration safety** preventing layout shifts
- **Error boundaries** and loading states

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VEXScouting
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   npm install

   # Frontend dependencies
   cd frontend-nextjs
   npm install
   ```

3. **Start the backend server**
   ```bash
   # From project root
   node src/api/server.js
   ```
   Server will run on `http://localhost:3000`

4. **Start the frontend development server**
   ```bash
   # From frontend-nextjs directory
   npm run dev
   ```
   Frontend will run on `http://localhost:3001`

5. **Open your browser**
   Navigate to `http://localhost:3001` to start using the application!

## 📁 Project Structure

```
VEXScouting/
├── src/
│   ├── api/
│   │   ├── server.js              # Express.js backend server
│   │   └── server.ts              # TypeScript version (for development)
│   └── utils/                     # Database utilities
│       ├── setupDatabase.js       # Database initialization script
│       ├── skillsParser.ts        # CSV data parser
│       ├── csvParser.ts           # CSV processing utilities
│       ├── fileUtils.ts           # File handling utilities
│       └── dbTest.ts              # Database testing utilities
├── data/
│   └── skills.db                  # SQLite database with team data
├── public/
│   └── data/                      # CSV source files for database
│       ├── skills-standings (1).csv
│       └── teams_20250526115921.csv
├── frontend-nextjs/               # Modern Next.js frontend
│   ├── src/
│   │   ├── app/                   # Next.js 14 app directory
│   │   │   ├── page.tsx           # Home page with search
│   │   │   ├── favorites/         # Favorites page
│   │   │   ├── compare/           # Team comparison page
│   │   │   ├── team/[teamNumber]/ # Individual team details
│   │   │   └── layout.tsx         # Root layout with providers
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   ├── navigation/        # Header and navigation
│   │   │   └── providers/         # React Query provider
│   │   ├── contexts/              # React contexts
│   │   │   ├── FavoritesContext.tsx
│   │   │   └── CompareContext.tsx
│   │   └── types/                 # TypeScript type definitions
│   ├── package.json               # Frontend dependencies
│   ├── tailwind.config.js         # Tailwind CSS configuration
│   └── next.config.js             # Next.js configuration
├── package.json                   # Backend dependencies
├── .gitignore                     # Git ignore rules
└── README.md                      # Project documentation
```

## 🛠️ Tech Stack

### Frontend
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible UI components
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[React Query](https://tanstack.com/query)** - Data fetching and caching
- **[Lucide React](https://lucide.dev/)** - Beautiful icons

### Backend
- **[Express.js](https://expressjs.com/)** - Web application framework
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[SQLite](https://www.sqlite.org/)** - Lightweight database for team data
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** - Fast SQLite driver

## 🎯 Usage Guide

### 1. **Searching for Teams**
- Use the search bar on the home page
- Type team numbers (e.g., "1234A") or team names
- Results appear instantly with team details

### 2. **Managing Favorites**
- Click the **heart icon** on any team card to add/remove favorites
- Access your favorites via the navigation menu
- View the counter badge showing total favorites
- Use "Clear All" to remove all favorites at once

### 3. **Comparing Teams**
- Click the **compare icon** on team cards (up to 4 teams)
- Navigate to the Compare page to see side-by-side analysis
- View detailed metrics table with performance highlights
- Remove teams individually or clear all comparisons

### 4. **Team Details**
- Click on any team card to view detailed information
- See comprehensive skills breakdown and performance data
- Navigate back using the back button

## 🔧 API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/teams/search?q={query}` - Search teams by number or name
- `GET /api/teams/top?limit={number}` - Get top-ranked teams
- `GET /api/teams/{teamNumber}` - Get detailed team information
- `GET /api/health` - Health check endpoint

## 🗄️ Database Management

### Database Setup
The application uses SQLite for data storage with the following structure:

```sql
CREATE TABLE skills_standings (
    rank INTEGER,
    score INTEGER,
    autonomousSkills INTEGER,
    driverSkills INTEGER,
    highestAutonomousSkills INTEGER,
    highestDriverSkills INTEGER,
    highestAutonomousTimestamp TEXT,
    highestDriverTimestamp TEXT,
    highestAutonomousStopTime INTEGER,
    highestDriverStopTime INTEGER,
    teamNumber TEXT PRIMARY KEY,
    teamName TEXT,
    organization TEXT,
    eventRegion TEXT,
    country TEXT
)
```

### Data Import
To update the database with new VEX data:

1. **Place CSV file** in `public/data/` directory
2. **Update the path** in `src/utils/setupDatabase.js`
3. **Run the setup script**:
   ```bash
   node src/utils/setupDatabase.js
   ```

### Utilities Available
- **`setupDatabase.js`** - Initialize/update database from CSV
- **`skillsParser.ts`** - Parse VEX skills data
- **`csvParser.ts`** - Generic CSV processing
- **`fileUtils.ts`** - File handling utilities
- **`dbTest.ts`** - Database testing and validation

## 🎨 Design System

### Colors
- **Primary**: Blue to Purple gradient (`from-blue-600 to-purple-600`)
- **Secondary**: Light blue (`blue-100`, `blue-700`)
- **Accent**: Red for favorites (`red-500`), Green for success (`green-600`)
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Headings**: Bold, gradient text for impact
- **Body**: Clean, readable sans-serif
- **Hierarchy**: Clear size and weight distinctions

### Components
- **Cards**: Glass morphism with backdrop blur
- **Buttons**: Gradient primary, ghost secondary
- **Badges**: Colored backgrounds with proper contrast
- **Animations**: Smooth, purposeful motion

## 🧹 Project Maintenance

This project has been cleaned and optimized for development:

### ✅ **What's Included**
- **Modern Next.js frontend** with TypeScript and Tailwind CSS
- **Express.js backend** with SQLite database
- **Database utilities** for data management
- **Comprehensive documentation** and setup guides

### 🗑️ **What Was Removed**
- **Legacy Mantine frontend** (replaced with Next.js)
- **Duplicate configuration files** (Vite, TypeScript configs)
- **Unused dependencies** and build artifacts
- **Conflicting port configurations**

### 🔧 **Port Configuration**
- **Backend API**: `http://localhost:3000`
- **Frontend Dev Server**: `http://localhost:3001`
- **No port conflicts** - both services run simultaneously

## 🚀 Deployment

### Frontend (Vercel - Recommended)
```bash
cd frontend-nextjs
npm run build
# Deploy to Vercel or your preferred platform
```

### Backend (Node.js hosting)
```bash
# Deploy server.js to your Node.js hosting provider
# Ensure port 3000 is available or configure PORT environment variable
```

### Environment Variables
```bash
# Backend
PORT=3000                    # Server port (optional, defaults to 3000)

# Frontend (for production)
NEXT_PUBLIC_API_URL=your-api-url  # Backend API URL
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use (EADDRINUSE)
```bash
# Find processes using the port
lsof -ti:3001  # or 3000 for backend

# Kill the processes
kill -9 <PID>

# Or use a different port
npm run dev -- -p 3002
```

#### Database Issues
```bash
# Verify database exists
ls -la data/skills.db

# Reinitialize database
node src/utils/setupDatabase.js

# Test database connection
node src/utils/dbTest.ts
```

#### Frontend Build Issues
```bash
# Clear Next.js cache
cd frontend-nextjs
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Restart development server
npm run dev
```

#### API Connection Issues
- Ensure backend is running on port 3000
- Check `http://localhost:3000/api/health` for backend status
- Verify no CORS issues in browser console

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **VEX Robotics** for inspiring competitive robotics
- **shadcn/ui** for beautiful, accessible components
- **Tailwind CSS** for the utility-first approach
- **Next.js team** for the amazing React framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs

---

<div align="center">
  <strong>Built with ❤️ for the VEX Robotics community</strong>
</div>
