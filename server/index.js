// initial setup
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createEvents } = require('ics');

// server creation
const app = express();
app.use(cors());
app.use(express.json());

// profilestore 
const profileStore = global.__calendarProfileStore || new Map();
if (!global.__calendarProfileStore) {
  global.__calendarProfileStore = profileStore;
}

// fetchScheduleFromUniBo
async function fetchScheduleFromUniBo(targetUrl) {
  return axios.get(targetUrl, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    }
  });
}

// filters
const getBaseProgramName = (programName = '') => programName.split(' - ')[0] || '';

const makeCourseKey = (event) => {
  const eventYear = Number(event.year);
  return `${event.title}_${eventYear}_${event.program}`;
};

function applyFiltersToEvents(events, filters, courseKeysSet) {
  const hasCourseKeyFilter = courseKeysSet && courseKeysSet.size > 0;

  if (!filters || Object.keys(filters).length === 0) {
    if (hasCourseKeyFilter) {
      return events.filter((event) => courseKeysSet.has(makeCourseKey(event)));
    }
    return events;
  }

  return events.filter((event) => {
    if (!event.program) return false;

    const baseName = getBaseProgramName(event.program);
    const programFilter = filters[baseName];
    if (!programFilter) return false;

    const selectedYears = Array.isArray(programFilter.selectedYears)
      ? programFilter.selectedYears.map(Number)
      : [];
    const selectedCourses = Array.isArray(programFilter.selectedCourses)
      ? programFilter.selectedCourses
      : [];

    const eventYear = Number(event.year);
    const courseKey = makeCourseKey(event);

    const includeYear =
      selectedYears.length === 0 || selectedYears.includes(eventYear);
    const includeCourseByFilter =
      selectedCourses.length === 0 || selectedCourses.includes(courseKey);

    const includeCourseByKey =
      !hasCourseKeyFilter || courseKeysSet.has(courseKey);

    return includeYear && includeCourseByFilter && includeCourseByKey;
  });
}

// root endpoint
app.get('/', (req, res) => {
  res.send('Unibo Smart Calendar Server - Endpoints: /test, /api/fetch-schedule, /calendar.ics');
});

// simple test endpoint
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running correctly!' });
});

// cors proxy endpoint - fetches data from unibo on behalf of the client
app.get('/api/fetch-schedule', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'Missing url parameter',
      message: 'Please provide a url query parameter' 
    });
  }

  try {
    console.log(`[Proxy] Fetching schedule from: ${url}`);
    
    // fetch data from unibo (no CORS issues server-side)
    const response = await fetchScheduleFromUniBo(url);

    console.log(`[Proxy] Successfully fetched ${Array.isArray(response.data) ? response.data.length : 0} events`);
    
    // return the data to the client
    res.json(response.data);
    
  } catch (error) {
    console.error(`[Proxy] Error fetching from ${url}:`, error.message);
    
    if (error.response) {
      // the request was made and the server responded with a status code
      res.status(error.response.status).json({
        error: 'Upstream server error',
        message: error.response.statusText,
        status: error.response.status
      });
    } else if (error.request) {
      // the request was made but no response was received
      res.status(503).json({
        error: 'No response from UniBo server',
        message: 'The UniBo server did not respond. Please try again later.'
      });
    } else {
      // Something happened in setting up the request
      res.status(500).json({
        error: 'Server error',
        message: error.message
      });
    }
  }
});

// helper function to fetch and process events
async function fetchProgramSchedule(url, programName) {
  try {
    const isBachelors = url.includes('/laurea/') && !url.includes('/magistrale');
    const isSingleCycle = url.includes('/magistralecu/');
    const isMasters = url.includes('/magistrale/') && !url.includes('/magistralecu/');
    
    const urlObj = new URL(url);
    const existingCurricula = urlObj.searchParams.get('curricula');
    urlObj.searchParams.delete('anno');
    const baseTimetableUrl = urlObj.toString();

    // otherwise, fetch all years for the program type
    const createYearUrl = (year) => {
      const yearUrl = new URL(baseTimetableUrl);
      yearUrl.searchParams.set('anno', year.toString());
      if (existingCurricula) {
        yearUrl.searchParams.set('curricula', existingCurricula);
      }
      return yearUrl.toString();
    };

    // determine number of years based on program type
    let maxYears = 3; // default bachelor's
    if (isMasters) {
      maxYears = 2;
    } else if (isSingleCycle) {
      maxYears = 6;
    }

    console.log(`[Calendar] Fetching ${maxYears} years for ${programName}`);

    const yearRequests = [];
    for (let year = 1; year <= maxYears; year++) {
      const yearUrl = createYearUrl(year);
      yearRequests.push(
        fetchScheduleFromUniBo(yearUrl)
          .then(response => ({
            year,
            data: response.data
          }))
          .catch(error => {
            console.error(`[Calendar] Error fetching year ${year}:`, error.message);
            return { year, data: [] };
          })
      );
    }

    const responses = await Promise.all(yearRequests);
    return responses.flatMap(({ year, data }) => {
      return data.map(event => ({
        ...event,
        year,
        program: programName
      }));
    });
  } catch (error) {
    console.error(`[Calendar] Error fetching schedule for ${programName}:`, error.message);
    return [];
  }
}

// Convert events to ICS format
function generateICSContent(events) {
  const icsEvents = events.map(event => ({
    start: new Date(event.start)
      .toISOString()
      .split(/[^0-9]/)
      .slice(0, 5)
      .map(num => parseInt(num)),
    end: new Date(event.end)
      .toISOString()
      .split(/[^0-9]/)
      .slice(0, 5)
      .map(num => parseInt(num)),
    title: event.title,
    description: `Course: ${event.title}\nTeacher: ${event.docente}\nProgram: ${event.program}${event.note ? '\nNotes: ' + event.note : ''}`,
    location: event.aule?.length > 0 
      ? `${event.aule[0].des_ubicazione} - ${event.aule[0].des_risorsa}`
      : undefined,
    categories: [event.program],
    status: 'CONFIRMED',
    busyStatus: 'BUSY'
  }));

  const { error, value } = createEvents(icsEvents);
  return error ? null : value;
}

// endpoint to serve calendar data
app.get('/calendar.ics', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, max-age=0');
    const urlsParam = req.query.urls;
    const profileId = req.query.profileId;

    let timetableConfigs = null;
    let activeFilters = null;
    let courseKeys = null;

    if (profileId) {
      const storedProfile = profileStore.get(profileId);
      if (storedProfile && Array.isArray(storedProfile.timetables)) {
        timetableConfigs = storedProfile.timetables;
        activeFilters = storedProfile.filters || null;
        courseKeys = Array.isArray(storedProfile.courseKeys)
          ? storedProfile.courseKeys
          : null;
        console.log(`[Calendar] Loaded ${timetableConfigs.length} timetables for profile ${profileId}`);
      } else {
        console.warn(`[Calendar] No stored timetable configuration found for profile ${profileId}`);
      }
    }

    if (!timetableConfigs && !urlsParam) {
      return res.status(400).send('No calendar configuration provided');
    }

    if (!timetableConfigs && urlsParam) {
      try {
        const parsedConfig = JSON.parse(decodeURIComponent(urlsParam));
        timetableConfigs = Array.isArray(parsedConfig)
          ? parsedConfig
          : Array.isArray(parsedConfig?.timetables)
            ? parsedConfig.timetables
            : null;
        activeFilters = parsedConfig?.filters || activeFilters;
        courseKeys = Array.isArray(parsedConfig?.courseKeys)
          ? parsedConfig.courseKeys
          : courseKeys;

        if (!Array.isArray(timetableConfigs) || timetableConfigs.length === 0) {
          return res.status(400).send('No valid timetables provided');
        }
      } catch (parseError) {
        console.error('Failed to parse calendar configuration:', parseError);
        return res.status(400).send('Invalid calendar configuration');
      }
    }

    if (!Array.isArray(timetableConfigs) || timetableConfigs.length === 0) {
      return res.status(404).send('Calendar configuration missing. Re-open the app to refresh your subscription.');
    }

    if (profileId) {
      console.log(`[Calendar] Generating ICS for profile ${profileId}`);
    }

    const allSchedules = await Promise.all(
      timetableConfigs.map(timetable => fetchProgramSchedule(timetable.url, timetable.name))
    );

    const allEvents = allSchedules.flat();
    const courseKeysSet =
      Array.isArray(courseKeys) && courseKeys.length > 0
        ? new Set(courseKeys)
        : null;
    const filteredEvents = applyFiltersToEvents(allEvents, activeFilters, courseKeysSet);
    const hasFilters =
      (activeFilters && Object.keys(activeFilters).length > 0) ||
      (courseKeysSet && courseKeysSet.size > 0);
    let eventsForIcs;
    
    if (filteredEvents.length > 0) {
      eventsForIcs = filteredEvents;
    } else if (hasFilters) {
      eventsForIcs = [];
    } else {
      eventsForIcs = allEvents;
    }

    const icsContent = generateICSContent(eventsForIcs);

    if (!icsContent) {
      return res.status(500).send('Error generating calendar');
    }

    res.set('Content-Type', 'text/calendar;charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="unibo-calendar.ics"');
    res.send(icsContent);
  } catch (error) {
    console.error('Error serving calendar:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/api/profile', (req, res) => {
  try {
    const { profileId, timetables, filters, courseKeys } = req.body || {};

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ error: 'Missing profileId' });
    }

    if (!Array.isArray(timetables) || timetables.length === 0) {
      return res.status(400).json({ error: 'No timetables provided' });
    }

    profileStore.set(profileId, {
      timetables,
      filters: filters || {},
      courseKeys: Array.isArray(courseKeys) ? courseKeys : [],
      updatedAt: Date.now()
    });

    console.log(`[Profile] Stored timetable configuration for profile ${profileId} (${timetables.length} entries)`);

    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('[Profile] Failed to store timetable configuration:', error);
    return res.status(500).json({ error: 'Failed to store profile configuration' });
  }
});

const PORT = process.env.PORT || 3001;

//  Start and Export functions
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Calendar server running on port ${PORT}`);
  });
}

module.exports = app;