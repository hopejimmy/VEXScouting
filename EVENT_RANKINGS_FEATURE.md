# 🏆 Event Rankings Feature Documentation

## Overview

The Event Rankings feature allows users to view world skills rankings for all teams competing in a specific event. This provides quick insights into the competitive landscape of an event.

---

## ✨ Features

### **For Users:**
- ✅ Click any event card to view rankings
- ✅ See all teams ranked by world skills performance
- ✅ Sort by multiple criteria (rank, score, skills)
- ✅ Export rankings to CSV for analysis
- ✅ Visual indicators for top performers (🥇🥈🥉)
- ✅ Highlights specific teams
- ✅ Shows coverage statistics

### **For Developers:**
- ✅ Efficient implementation (1 API call + 1 DB query)
- ✅ Fast response time (~1-2 seconds)
- ✅ No complex calculations
- ✅ Uses existing skills_standings data
- ✅ Fully typed with TypeScript
- ✅ Responsive design

---

## 🎯 User Flow

```
1. User views team detail page
   ↓
2. User sees list of events team participated in
   ↓
3. User clicks on an event card
   ↓
4. Confirmation dialog appears:
   "Would you like to see the world skills rankings 
    for all teams competing in [Event Name]?"
   ↓
5. User clicks "OK"
   ↓
6. Event Rankings page loads
   ↓
7. User sees:
   - Event name and statistics
   - Ranked table of all teams
   - Sortable columns
   - Export option
   ↓
8. User clicks "Back to Team Details" to return
```

---

## 🔧 Technical Implementation

### **Backend Endpoint**

```
GET /api/events/:eventId/rankings?matchType=VRC
```

**Process:**
1. Fetch team list from RobotEvents API for the event
2. Extract team numbers from response
3. Query `skills_standings` table for these teams
4. Sort by: Score DESC → Auto DESC → Driver DESC → Rank ASC
5. Return ranked results

**Response:**
```json
{
  "eventId": 54207,
  "eventName": "VEX Worlds 2025",
  "matchType": "VRC",
  "rankings": [
    {
      "eventRank": 1,
      "teamNumber": "1822S",
      "teamName": "BuZhou Mount",
      "worldRank": 1,
      "combinedScore": 452,
      "autonomousSkills": 220,
      "driverSkills": 232,
      "highestAutonomousSkills": 220,
      "highestDriverSkills": 232,
      "organization": "不周山机器人",
      "region": "North China",
      "country": "China",
      "matchType": "VRC"
    }
  ],
  "total": 98,
  "teamsInEvent": 120,
  "teamsWithRankings": 98,
  "teamsWithoutRankings": 22
}
```

### **Ranking Criteria**

Teams are ranked in the following order:

1. **Combined Score** (DESC) - Primary ranking factor
2. **Highest Autonomous Skills** (DESC) - Tie-breaker #1
3. **Highest Driver Skills** (DESC) - Tie-breaker #2  
4. **World Rank** (ASC) - Tie-breaker #3

This ensures consistent, logical ranking based on skills performance.

---

## 📊 **Frontend Components**

### **1. Event Rankings Page**

**Location**: `frontend-nextjs/src/app/event-rankings/[eventId]/page.tsx`

**Features:**
- Dynamic route based on event ID
- Query parameters: `matchType`, `returnUrl`, `highlightTeam`
- Statistics cards showing event coverage
- Export to CSV functionality
- Info message for teams without rankings

### **2. Rankings Table Component**

**Location**: `frontend-nextjs/src/components/event-rankings/RankingsTable.tsx`

**Features:**
- Sortable columns (click header to sort)
- Visual sort indicators (arrows)
- Medal icons for top 3 positions
- Highlighted row for specific team
- Shows both average and highest skills scores
- World rank badges with special styling for top 10
- Responsive design

### **3. Updated Events Section**

**Location**: `frontend-nextjs/src/components/team/EventsSection.tsx`

**Changes:**
- Event cards now clickable
- Hover effects indicate interactivity
- Confirmation dialog before navigation
- Passes matchType to rankings page

---

## 🎨 **UI/UX Highlights**

### **Visual Indicators:**

- 🥇 Gold medal for 1st place
- 🥈 Silver medal for 2nd place
- 🥉 Bronze medal for 3rd place
- 🏆 Yellow badge for world top 10 teams
- 💙 Blue highlight for specific team focus
- ↕️ Sort arrows showing current sort state

### **Statistics Cards:**

1. **Total Teams**: Number of teams registered for event
2. **With Rankings**: Teams that have world skills data
3. **Coverage**: Percentage of teams with ranking data
4. **Actions**: Export button for CSV download

### **Information Display:**

- **Average vs Highest**: Shows both for skills scores
- **Organization**: Full team organization name
- **Region**: Geographic region
- **Match Type Badge**: VRC/VEXIQ/VEXU indicator

---

## 🧪 **Testing Checklist**

### **Backend Testing:**
- [ ] Endpoint returns 200 OK for valid event
- [ ] Returns empty array for event with no teams
- [ ] Filters by matchType correctly
- [ ] Handles missing RobotEvents API token
- [ ] Handles RobotEvents API errors gracefully
- [ ] Database query executes efficiently
- [ ] Returns correct ranking order

### **Frontend Testing:**
- [ ] Event cards are clickable
- [ ] Confirmation dialog appears
- [ ] Rankings page loads with data
- [ ] Table sorting works for all columns
- [ ] Export CSV generates correct file
- [ ] Back button returns to team page
- [ ] Highlighted team shows correctly
- [ ] Responsive on mobile devices
- [ ] Loading states display properly
- [ ] Error states display properly

---

## 📈 **Performance Metrics**

### **Expected Performance:**

- **API Call**: ~500-800ms (RobotEvents team list)
- **Database Query**: ~50-100ms (local PostgreSQL)
- **Total Response Time**: ~1-2 seconds
- **Page Load**: ~2-3 seconds total

### **Scalability:**

- ✅ Works with events of any size (10-500 teams)
- ✅ No performance degradation with more teams
- ✅ Efficient database indexing on teamNumber and matchType
- ✅ Cached responses (10 minute stale time)

---

## 🔄 **Future Enhancements**

### **Phase 2 (Optional):**

1. **Match Statistics**:
   - Win/loss records at the event
   - Average alliance scores
   - Qualification ranking

2. **Advanced Filtering**:
   - Filter by region
   - Filter by organization
   - Search teams in results

3. **Visualizations**:
   - Skills score distribution chart
   - Comparison graphs
   - Performance trends

4. **OPR Calculation** (Advanced):
   - Calculate actual OPR from match data
   - Add DPR and CCWM metrics
   - Requires matrix math and extensive API calls

---

## 🚀 **Deployment**

### **To Deploy to Production:**

1. **Merge to main branch**:
   ```bash
   git checkout main
   git merge feature/enhancements
   git push origin main
   ```

2. **Automatic Deployment**:
   - Vercel will auto-deploy frontend
   - Railway will auto-deploy backend

3. **Verify**:
   - Test with real event on production
   - Check performance
   - Monitor error logs

### **Environment Variables:**

No new environment variables needed! Uses existing:
- `ROBOTEVENTS_API_TOKEN` (already configured)
- `NEXT_PUBLIC_API_URL` (already configured)

---

## 📝 **Usage Instructions**

### **For End Users:**

1. **Navigate to any team page** (e.g., `/team/1822S`)
2. **View the Events section** (below skills data)
3. **Click on any event card**
4. **Confirm** when prompted
5. **View the rankings table**
6. **Click column headers** to sort
7. **Click "Export CSV"** to download data
8. **Click "Back"** to return to team page

### **For Administrators:**

- Ensure `skills_standings` table is up-to-date
- Upload latest world rankings CSV files
- Monitor RobotEvents API usage (stays within limits)

---

## ⚠️ **Known Limitations**

1. **Teams Without Rankings**:
   - Some teams at event may not have world skills data
   - Shown in statistics but not in table
   - Normal for new teams or teams that haven't done skills

2. **Data Freshness**:
   - Rankings based on skills_standings table
   - Only as current as last data upload
   - Admin should update regularly

3. **Match Type Requirement**:
   - Must filter by match type (VRC/VEXIQ/VEXU)
   - Mixed-type events not supported

---

## 🎉 **Success Metrics**

Feature is successful if:

✅ Users can click events and see rankings  
✅ Rankings load in under 3 seconds  
✅ Sorting works correctly  
✅ Export produces valid CSV files  
✅ No errors in console  
✅ Works on mobile and desktop  
✅ RobotEvents API usage stays within limits  

---

## 📞 **Support**

### **Common Issues:**

**Issue**: "Failed to load event rankings"
- **Cause**: RobotEvents API error or invalid event ID
- **Solution**: Check event ID is valid, verify API token

**Issue**: "No teams found"
- **Cause**: Event has no registered teams yet or wrong matchType
- **Solution**: Verify event exists and matchType is correct

**Issue**: "Teams show 0 rankings"
- **Cause**: Teams not in skills_standings table
- **Solution**: Upload latest world rankings data

---

## 🏅 **Feature Benefits**

1. **Strategic Planning**: See competitor strength before events
2. **Team Analysis**: Understand relative performance
3. **Scouting Tool**: Identify strong/weak opponents
4. **Data Export**: Further analysis in Excel/Sheets
5. **Quick Insights**: Instant overview of event competitiveness

---

**Built with ❤️ for VEX Scouting Platform**


