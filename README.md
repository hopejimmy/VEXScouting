# VEX Scouting Platform

A professional, modern web application for scouting and analyzing VEX Robotics teams worldwide. Built with Next.js 14, TypeScript, and Tailwind CSS for a beautiful, responsive user experience with comprehensive admin panel and role-based authentication.

![VEX Scouting Platform](https://img.shields.io/badge/VEX-Scouting-blue?style=for-the-badge&logo=robot)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![Express.js](https://img.shields.io/badge/Express.js-4-green?style=flat-square&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)
![JWT](https://img.shields.io/badge/JWT-Authentication-orange?style=flat-square&logo=jsonwebtokens)

## ✨ Features

### 🔐 **Authentication & User Management**
- **JWT-based authentication** with secure login/logout functionality
- **Role-based access control** (Admin, Guest roles with extensible permission system)
- **Secure password requirements** with validation (minimum 6 characters, uppercase, number, special character)
- **Session management** with configurable token expiration
- **Protected routes** with permission-based access control
- **Demo credentials** for quick testing (admin/Admin123!)

### 👑 **Comprehensive Admin Panel**
- **User Management Dashboard**:
  - Create, edit, and manage user accounts
  - Role assignment and user activation/deactivation
  - Search and filter users by username, email, or role
  - User activity tracking (creation date, last login)
  - Bulk user operations and secure password management

- **Role & Permissions Management**:
  - Create and manage custom roles with granular permissions
  - Permission system organized by categories (Admin, Data, Teams)
  - Visual permission assignment with expandable role cards
  - Pre-configured roles: Administrator, Coach, Scout
  - Real-time permission updates and validation

- **System Settings**:
  - General settings (site name, admin email, maintenance mode)
  - API configuration (RobotEvents API token, season settings)
  - Security settings (JWT expiration, session timeout)
  - System maintenance toggles and configuration

- **Database Status & Monitoring**:
  - Real-time database health monitoring
  - Performance metrics (query times, connections, uptime)
  - Table statistics and maintenance tools
  - Backup status and optimization controls

### 🔍 **Team Search & Discovery**
- **Real-time search** by team number or name with intelligent debouncing
- **Competition type filtering** by VEX IQ, VRC, and VEXU with color-coded badges
- **Comprehensive team data** including skills scores, rankings, and performance metrics
- **Beautiful team cards** with gradient avatars and detailed information
- **Responsive grid layout** optimized for all screen sizes
- **Match type indicators** with consistent color coding across the application

### 🏆 **Season Selector**
- **Interactive dropdown** to select different VRC seasons
- **Season-specific team events** showing past and upcoming competitions
- **Seamless integration** with the RobotEvents API
- **Graceful loading states** and error handling
- **Persistent season selection** throughout user session

### 🥇 **Team Awards Display**
- **Automatic awards fetching** for each competition event
- **Visual award badges** with appropriate icons (trophies, medals, stars)
- **Smart award categorization** by type and importance
- **Award hover tooltips** showing full award names
- **Optimized loading** with skeleton states for awards
- **Graceful fallbacks** when awards data is unavailable

### ❤️ **Enhanced Favorites System**
- **Add/remove teams** to your personal favorites list with competition type awareness
- **Competition type filtering** on the favorites page with live count updates
- **Color-coded match type badges** (Green: VEX IQ, Blue: VRC, Purple: VEXU)
- **Persistent storage** using localStorage
- **Beautiful dedicated favorites page** with empty states and filtered result handling
- **Quick access** from navigation with live counters
- **Bulk operations** including "Clear All" functionality
- **Skills breakdown display** with autonomous/driver performance metrics

### 📊 **Advanced Team Comparison**
- **Side-by-side comparison** of up to 4 teams with competition type filtering
- **Competition type awareness** in comparison tables with match type headers
- **Detailed metrics table** highlighting best performers across competitions
- **Visual indicators** for top performance in each category
- **Interactive comparison cards** with remove/favorite actions and match type badges
- **Performance analytics** including rank, scores, and skills breakdown
- **Filter-aware comparison** showing counts of filtered vs total teams

### 📤 **Secure Data Upload** (Admin Only)
- **Protected upload system** requiring admin authentication
- **CSV file processing** with automatic validation and error handling
- **Competition type detection** and categorization
- **Bulk data operations** with transaction safety
- **Upload progress tracking** and detailed feedback
- **Data integrity validation** ensuring database consistency

### 🎯 **Competition Type Management**
- **Multi-competition support** for VEX IQ, VRC, and VEXU programs
- **Consistent color coding** throughout the application:
  - **VEX IQ**: Green badges (`bg-green-100 text-green-700`)
  - **VRC**: Blue badges (`bg-blue-100 text-blue-700`)
  - **VEXU**: Purple badges (`bg-purple-100 text-purple-700`)
- **Smart filtering** with proper SQL query optimization
- **Database integration** with matchtype column support
- **API endpoint enhancements** for program-aware operations

### 🎨 **Modern UI/UX**
- **Glass morphism design** with backdrop blur effects
- **Gradient backgrounds** and smooth animations
- **Professional color scheme** with blue/purple gradients
- **Framer Motion animations** for smooth transitions
- **Mobile-first responsive design**
- **Intuitive navigation** with active state indicators
- **Search state persistence** when navigating between pages
- **Hydration-safe components** preventing layout shifts

### 🔧 **Technical Excellence**
- **TypeScript** for type safety and better development experience
- **React Query** for efficient data fetching and caching with 5-minute stale time
- **Context API** for state management across favorites and compare features
- **localStorage persistence** for favorites and comparisons
- **SSR/CSR hydration safety** preventing layout shifts
- **Error boundaries** and loading states
- **Debounced search** with 1-second delay for optimal performance
- **URL parameter synchronization** for shareable search states

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL 15+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VEXScouting
   ```

2. **Set up PostgreSQL**
   ```bash
   # Create the database
   createdb vexscouting

   # Or using psql
   psql -U postgres
   CREATE DATABASE vexscouting;
   ```

3. **Configure environment variables**
   Create a `.env` file in the project root:
   ```env
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=vexscouting
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   ROBOTEVENTS_API_KEY=your_robotevents_api_key
   CURRENT_SEASON_ID=190
   ```

4. **Install dependencies**
   ```bash
   # Backend dependencies
   npm install

   # Frontend dependencies
   cd frontend-nextjs
   npm install
   ```

5. **Start the backend server**
   ```bash
   # From project root
   node src/api/server.js
   ```
   Server will run on `http://localhost:3000`

6. **Start the frontend development server**
   ```bash
   # From frontend-nextjs directory
   npm run dev
   ```
   Frontend will run on `http://localhost:3001`

7. **Open your browser**
   Navigate to `http://localhost:3001` to start using the application!

## 📁 Project Structure

```
VEXScouting/
├── src/
│   ├── api/
│   │   └── server.js              # Express.js backend server with PostgreSQL
│   └── utils/                     # Database utilities
│       ├── csvParser.ts           # CSV processing utilities
│       └── fileUtils.ts           # File handling utilities
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
│   │   │   ├── team/              # Team-related components
│   │   │   │   ├── EventsSection.tsx  # Team events with season selector
│   │   │   │   ├── EventsError.tsx    # Error handling component
│   │   │   │   └── EventsSkeleton.tsx # Loading state component
│   │   │   ├── navigation/        # Header and navigation
│   │   │   └── providers/         # React Query provider
│   │   ├── contexts/              # React contexts
│   │   │   ├── FavoritesContext.tsx
│   │   │   └── CompareContext.tsx
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useSeasons.ts      # Hook for fetching VRC seasons
│   │   │   └── useTeamEvents.ts   # Hook for fetching team events by season
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
- **[PostgreSQL](https://www.postgresql.org/)** - Powerful, open-source database
- **[node-postgres](https://node-postgres.com/)** - PostgreSQL client for Node.js
- **[RobotEvents API](https://www.robotevents.com/api/v2)** - VEX Robotics event data

## 🎯 Usage Guide

### 1. **Authentication & Access**
- **Login**: Click "Sign In" in the header to access the login modal
- **Demo Credentials**: Use `admin` / `Admin123!` for full admin access
- **Admin Panel**: Once logged in as admin, access via the "Admin Panel" navigation item
- **Role-Based Access**: Different features available based on user role (Admin vs Guest)
- **Session Management**: Automatic token refresh and secure logout

### 2. **Admin Panel Management**
- **User Management**: Create, edit, and manage user accounts with role assignment
- **Role & Permissions**: Configure granular permissions organized by categories
- **System Settings**: Manage site configuration, API settings, and security options
- **Database Monitoring**: View real-time database health and performance metrics
- **Maintenance Tools**: Access database optimization and cleanup functions

### 3. **Searching for Teams**
- Use the search bar on the home page
- Type team numbers (e.g., "1234A") or team names
- **Filter by competition type** using the dropdown (All Types, VEX IQ, VRC, VEXU)
- Results appear instantly with **color-coded match type badges**
- **Search state persists** when navigating to team details and back
- **URL parameters** allow sharing filtered search results

### 4. **Managing Favorites**
- Click the **heart icon** on any team card to add/remove favorites
- Access your favorites via the navigation menu
- **Filter favorites by competition type** for focused analysis
- View **live counter badges** showing total and filtered counts
- **Skills breakdown display** with autonomous and driver performance
- Use "Clear All" to remove all favorites at once
- **Empty state handling** for both no favorites and no filtered results

### 5. **Comparing Teams**
- Click the **compare icon** on team cards (up to 4 teams)
- Navigate to the Compare page to see side-by-side analysis
- **Filter comparison list by competition type** for fair comparisons
- View **detailed metrics table** with match type headers and badges
- **Performance highlights** show best performers in each category
- Remove teams individually or clear all comparisons
- **Competition-aware comparison** ensures like-for-like analysis

### 6. **Team Details**
- Click on any team card to view detailed information
- See comprehensive skills breakdown and performance data
- View team events for different VRC seasons using the season selector
- **Return to previous search state** using the back button with preserved filters
- Navigate back using the back button

### 7. **Season Selection**
- Use the dropdown in the team events section to select different VRC seasons
- View past and upcoming events specific to the selected season
- Events display venue, location, dates, and division information
- System defaults to the current VRC season ("High Stakes")

### 8. **Data Upload** (Admin Only)
- Navigate to the upload page (requires admin authentication)
- Select a CSV file containing VEX team data
- File should include columns for:
  - Team Number
  - Team Name
  - Organization
  - Event Region
  - Country / Region
  - **Match Type** (VEXIQ, VRC, VEXU)
  - Rank
  - Score
  - Autonomous Coding Skills
  - Driver Skills
  - Highest Autonomous Coding Skills
  - Highest Driver Skills
- Progress bar shows upload status
- Data is automatically processed and added to the database
- **Automatic competition type detection** and categorization
- Automatic validation ensures data integrity
- Existing teams are updated with new information
- Success/error messages provide feedback

## 🔧 API Endpoints

The backend provides the following REST API endpoints:

### Public Endpoints
- `GET /api/search?q={query}&matchType={type}` - Search teams by number or name with optional competition type filter
- `GET /api/teams?matchType={type}` - Get all teams with optional competition type filter
- `GET /api/teams/{teamNumber}` - Get detailed team information
- `GET /api/teams/{teamNumber}/events?season={seasonId}` - Get team events for a specific season
- `GET /api/teams/{teamNumber}/events/{eventId}/awards` - Get awards for a team at a specific event
- `GET /api/seasons` - Get list of VRC seasons
- `GET /api/programs` - Get list of VEX competition programs (VEX IQ, VRC, VEXU)
- `GET /api/health` - Health check endpoint

### Authentication Endpoints
- `POST /api/auth/login` - User login with username/password
- `GET /api/auth/verify` - Verify JWT token and get current user info
- `POST /api/auth/logout` - User logout (client-side token removal)

### Protected Endpoints (Require Authentication)
- `POST /api/upload` - Upload CSV data (Admin only)

### Admin Endpoints (Require Admin Role)
- `GET /api/admin/users` - Get all users with role information
- `POST /api/admin/users` - Create new user account
- `PUT /api/admin/users/{id}` - Update user account
- `DELETE /api/admin/users/{id}` - Deactivate user account
- `GET /api/admin/roles` - Get all roles with permissions
- `GET /api/admin/permissions` - Get all available permissions
- `PUT /api/admin/roles/{id}/permissions` - Update role permissions

## 🗄️ Database Management

### Database Schema
The application uses PostgreSQL with the following enhanced schema:

#### Skills Standings Table
```sql
CREATE TABLE skills_standings (
    teamNumber TEXT PRIMARY KEY,
    teamName TEXT,
    organization TEXT,
    eventRegion TEXT,
    countryRegion TEXT,
    matchtype TEXT DEFAULT 'VRC',  -- Competition type: VEXIQ, VRC, VEXU
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
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient filtering by competition type
CREATE INDEX idx_skills_standings_matchtype ON skills_standings(matchtype);
```

#### Authentication Tables
```sql
-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions junction table
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);
```

### Default Setup
The application automatically creates:
- **Default Roles**: Admin (full access), Guest (limited access)
- **Default Permissions**: Organized by categories (Admin, Data, Teams)
- **Default Admin User**: Username `admin`, Password `Admin123!`
- **Permission Assignments**: Admin role gets all permissions, Guest role gets basic access

### Environment Variables
The following environment variables must be configured:

```env
# Database Configuration
POSTGRES_HOST=localhost      # PostgreSQL host
POSTGRES_PORT=5432          # PostgreSQL port  
POSTGRES_DB=vexscouting     # Database name
POSTGRES_USER=postgres      # Database user
POSTGRES_PASSWORD=password  # Database password

# Server Configuration
PORT=3000                   # API server port

# Authentication (Required)
JWT_SECRET=your-secret-key  # JWT signing secret (required for auth)
JWT_EXPIRES_IN=7d          # Token expiration (default: 7 days)

# Admin Account Setup
ADMIN_USERNAME=admin        # Default admin username
ADMIN_PASSWORD=Admin123!    # Default admin password
ADMIN_EMAIL=admin@vexscouting.com  # Default admin email

# External APIs
ROBOTEVENTS_API_TOKEN=key   # RobotEvents API token for production
CURRENT_SEASON_ID=190       # Default VRC season ID
```

## 🎨 Design System

### Colors
- **Primary**: Blue to Purple gradient (`from-blue-600 to-purple-600`)
- **Competition Type Badges**:
  - **VEX IQ**: Green (`bg-green-100 text-green-700 border-green-200`)
  - **VRC**: Blue (`bg-blue-100 text-blue-700 border-blue-200`)
  - **VEXU**: Purple (`bg-purple-100 text-purple-700 border-purple-200`)
- **Secondary**: Light blue (`blue-100`, `blue-700`)
- **Accent**: Red for favorites (`red-500`), Green for success (`green-600`)
- **Admin Panel**: Color-coded headers (Blue, Purple, Green, Orange)
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Headings**: Bold, gradient text for impact
- **Body**: Clean, readable sans-serif
- **Hierarchy**: Clear size and weight distinctions
- **Badge Text**: Consistent sizing and weight for competition types

### Components
- **Cards**: Glass morphism with backdrop blur and competition type indicators
- **Buttons**: Gradient primary, ghost secondary with proper hover states
- **Badges**: Colored backgrounds with proper contrast and competition type styling
- **Admin Interface**: Professional dashboard styling with consistent spacing
- **Forms**: Clean form layouts with validation feedback
- **Modals**: Centered overlays with backdrop blur
- **Animations**: Smooth, purposeful motion with stagger effects
- **Dropdowns**: Clean, accessible select components for filtering
- **Filter Controls**: Consistent styling across all pages

## 🧹 Project Maintenance

This project has been cleaned and optimized for development:

### ✅ **What's Included**
- **Modern Next.js frontend** with TypeScript and Tailwind CSS
- **Express.js backend** with PostgreSQL database and JWT authentication
- **Comprehensive admin panel** with user and role management
- **RobotEvents API integration** for team events and seasons
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
# Backend (Production)
DATABASE_URL=postgres://user:pass@host:port/db  # PostgreSQL connection string
JWT_SECRET=your-production-secret-key           # Strong secret for JWT signing
ROBOTEVENTS_API_TOKEN=your-api-token           # RobotEvents API key
CURRENT_SEASON_ID=190                          # Default VRC season ID

# Frontend (Production)
NEXT_PUBLIC_API_URL=https://your-api-url.com   # Backend API URL
```

## 🔧 Troubleshooting

### Common Issues

#### Authentication Issues
```bash
# Check JWT secret is set
echo $JWT_SECRET

# Verify token in browser localStorage
# Open browser dev tools > Application > Local Storage

# Clear authentication state
localStorage.removeItem('auth_token')
```

#### Admin Access Issues
- **Default credentials**: `admin` / `Admin123!`
- **Check user role**: Must be assigned 'admin' role
- **Verify permissions**: Admin role needs proper permissions
- **Database initialization**: Ensure database has been properly initialized

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
# Check database connection
psql -U postgres -d vexscouting -c "SELECT NOW();"

# Reinitialize database tables
# Tables are automatically created on server startup

# Check table structure
psql -U postgres -d vexscouting -c "\dt"
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
- Make sure your RobotEvents API token is correctly configured
- Check JWT token is being sent in Authorization header

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
- **RobotEvents API** for providing comprehensive event data
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