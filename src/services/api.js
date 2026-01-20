import axios from 'axios';

export const DEFAULT_TIMETABLE_URLS = Object.freeze([]);

const CALENDAR_PROFILE_ID_KEY = 'calendarProfileId';

const resolveApiBaseUrl = () => {
  const fromEnv = process.env.REACT_APP_API_BASE_URL;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return window.location.origin.replace(/\/$/, '');
  }

  return 'http://localhost:3001';
};

const API_BASE_URL = resolveApiBaseUrl();
export const getApiBaseUrl = () => API_BASE_URL;

const cloneDefaultTimetables = () =>
  DEFAULT_TIMETABLE_URLS.map((timetable) => ({ ...timetable }));

export const getStoredTimetableUrls = () => {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return cloneDefaultTimetables();
    }

    const saved = window.localStorage.getItem('timetableUrls');
    if (!saved) {
      return cloneDefaultTimetables();
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return cloneDefaultTimetables();
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load timetable URLs from storage:', error);
    return cloneDefaultTimetables();
  }
};

const generateProfileId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Ignore failures and fall through to fallback
  }

  return `cal-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
};

export const getCalendarProfileId = () => {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return 'anonymous';
    }

    let profileId = window.localStorage.getItem(CALENDAR_PROFILE_ID_KEY);
    if (!profileId) {
      profileId = generateProfileId();
      window.localStorage.setItem(CALENDAR_PROFILE_ID_KEY, profileId);
    }

    return profileId;
  } catch (error) {
    console.error('Failed to resolve calendar profile ID:', error);
    return 'anonymous';
  }
};

export const getCalendarProfilePayload = (filters = {}, courseKeys = []) => ({
  profileId: getCalendarProfileId(),
  timetables: getStoredTimetableUrls(),
  filters,
  courseKeys
});

export const syncCalendarProfile = async (payload) => {
  try {
    if (
      !payload ||
      !payload.profileId ||
      !Array.isArray(payload.timetables) ||
      payload.timetables.length === 0
    ) {
      return false;
    }

    await axios.post(`${API_BASE_URL}/api/profile`, payload);
    return true;
  } catch (error) {
    console.error('Failed to sync calendar profile with server:', error);
    return false;
  }
};

const fetchProgramSchedule = async (url, programName) => {
  try {
    // Check if we have a manually specified number of years for this program
    const savedProgramYears = localStorage.getItem('programYears');
    const programYears = savedProgramYears ? JSON.parse(savedProgramYears) : {};
    
    // Try to determine program type from the URL
    const isBachelors = url.includes('/laurea/') && !url.includes('/magistrale');
    const isSingleCycle = url.includes('/magistralecu/') || url.includes('single-cycle') || url.includes('singlecycle') || 
                          url.includes('ciclo-unico') || url.includes('ciclounico');
    const isMasters = url.includes('/magistrale/') && !url.includes('/magistralecu/');

    // Also check program name for additional clues
    const programNameLower = programName.toLowerCase();
    const isSingleCycleByName = programNameLower.includes('single cycle') || 
                               programNameLower.includes('ciclo unico') || 
                               programNameLower.includes('6 year') || 
                               programNameLower.includes('6-year');

    // Final determination
    const finalIsSingleCycle = isSingleCycle || isSingleCycleByName;

    console.log(`Program detection for ${programName}:`, { 
      isBachelors, 
      isSingleCycle, 
      isSingleCycleByName,
      finalIsSingleCycle,
      isMasters,
      manualYears: programYears[programName]
    });

    // Check if URL already has curricula parameter
    const urlObj = new URL(url);
    const existingCurricula = urlObj.searchParams.get('curricula');
    urlObj.searchParams.delete('anno');
    const baseTimetableUrl = urlObj.toString();

    // Determine the number of years based on program type or manual setting
    let maxYears;
    
    // First check if there's a manual setting
    if (programYears[programName]) {
      maxYears = programYears[programName];
    } else {
      // Otherwise use auto-detection
      if (isMasters) {
        maxYears = 2;
      } else if (finalIsSingleCycle) {
        maxYears = 6; // Changed from 5 to 6 for single cycle degrees
      } else {
        maxYears = 3; // default for bachelor's
      }
    }

    console.log(`Determined maxYears for ${programName}:`, maxYears);

    // Prepare and execute requests for each year
    const allEvents = [];
    
    for (let year = 1; year <= maxYears; year++) {
      try {
        // Create URL with year parameter
        const yearUrl = new URL(baseTimetableUrl);
        yearUrl.searchParams.set('anno', year.toString());
        if (existingCurricula) {
          yearUrl.searchParams.set('curricula', existingCurricula);
        }
        
        console.log(`Fetching year ${year} for ${programName}:`, yearUrl.toString());
        
        try {
          // Use the proxy server to avoid CORS issues
          const proxyUrl = `${API_BASE_URL}/api/fetch-schedule?url=${encodeURIComponent(yearUrl.toString())}`;
          const response = await axios.get(proxyUrl);
          
          if (Array.isArray(response.data) && response.data.length > 0) {
            // Process events for this year
            const yearEvents = response.data.map(event => {
              // Ensure event has all required fields
              if (!event.start || !event.end) {
                console.warn(`Event missing start/end time:`, event);
                return null;
              }
              
              return {
                ...event,
                year,
                program: programName,
                _timetableUrl: yearUrl.toString(),
                // Ensure start and end are valid dates
                start: new Date(event.start),
                end: new Date(event.end)
              };
            }).filter(Boolean); // Remove any null events
            
            console.log(`Found ${yearEvents.length} events for ${programName} year ${year}`);
            allEvents.push(...yearEvents);
          } else {
            console.log(`No events found for ${programName} year ${year}`);
          }
        } catch (fetchError) {
          console.error(`Error fetching events for ${programName} year ${year}:`, fetchError);
          // Continue with other years even if one fails
        }
      } catch (yearError) {
        console.error(`Error fetching year ${year} for ${programName}:`, yearError);
        // Continue with other years even if one fails
      }
    }

    return allEvents;
  } catch (error) {
    console.error(`Error in fetchProgramSchedule for ${programName}:`, error);
    return []; // Return empty array instead of throwing
  }
};

export const fetchSchedule = async () => {
  try {
    // Get saved timetable URLs from localStorage
    const timetableUrls = getStoredTimetableUrls();

    console.log('Fetching schedules for programs:', timetableUrls);

    // Fetch schedules for all programs
    const allSchedules = [];
    for (const timetable of timetableUrls) {
      try {
        console.log(`Starting fetch for program: ${timetable.name} with URL: ${timetable.url}`);
        
        // Fetch via proxy server (resolves CORS issues)
        const programEvents = await fetchProgramSchedule(timetable.url, timetable.name);
        console.log(`Fetched ${programEvents.length} events for ${timetable.name}`);
        
        if (programEvents.length === 0) {
          console.warn(`No events found for ${timetable.name}. This might indicate an issue with the URL or data format.`);
        }
        
        allSchedules.push(...programEvents);
      } catch (programError) {
        console.error(`Error fetching program ${timetable.name}:`, programError);
        // Continue with other programs even if one fails
      }
    }

    console.log(`Total events fetched: ${allSchedules.length}`);
    
    // Return events (empty array if none found)
    return allSchedules;
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }
};