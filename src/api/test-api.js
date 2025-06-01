import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const apiToken = process.env.ROBOTEVENTS_API_TOKEN;
const teamNumber = '252C';  // Full team number
const currentSeasonId = process.env.CURRENT_SEASON_ID || '190'; // VRC 2024-2025: High Stakes

const searchTeam = async () => {
  console.log('\nSearching for teams...');
  try {
    // Use the correct query parameter format: number[]=252C and filter for VEX V5 program
    const searchUrl = `https://www.robotevents.com/api/v2/teams?number[]=${teamNumber}&program[]=1`;
    console.log('Search URL:', searchUrl);
    
    const response = await fetch(
      searchUrl,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    console.log('Search Status:', response.status);
    console.log('Search Response:', JSON.stringify(data, null, 2));

    if (data.data && data.data.length > 0) {
      const team = data.data[0]; // Should be the VEX V5 team since we filtered by program
      console.log('\nFound team:', team);
      console.log('\nFetching events for team ID:', team.id);
      
      // First try with current season
      console.log('\nTrying current season...');
      const eventsUrl = `https://www.robotevents.com/api/v2/teams/${team.id}/events?season[]=${currentSeasonId}`;
      console.log('Events URL:', eventsUrl);
      
      const eventsResponse = await fetch(
        eventsUrl,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const eventsData = await eventsResponse.json();
      console.log('Events Status:', eventsResponse.status);
      console.log('Current Season Events:', JSON.stringify(eventsData, null, 2));

      // Then try without season filter to see all events
      console.log('\nTrying all seasons...');
      const allEventsUrl = `https://www.robotevents.com/api/v2/teams/${team.id}/events`;
      console.log('All Events URL:', allEventsUrl);
      
      const allEventsResponse = await fetch(
        allEventsUrl,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const allEventsData = await allEventsResponse.json();
      console.log('All Events Status:', allEventsResponse.status);
      console.log('All Events:', JSON.stringify(allEventsData, null, 2));
    } else {
      console.log('No teams found with that number');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

searchTeam(); 