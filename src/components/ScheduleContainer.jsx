import React, { useState, useMemo, useEffect } from 'react';
import { Box, Tabs, Tab, Stack, IconButton, Tooltip, Menu, MenuItem, Chip } from '@mui/material';
import CalendarViewIcon from '@mui/icons-material/CalendarViewMonth';
import ViewListIcon from '@mui/icons-material/ViewList';
import RefreshIcon from '@mui/icons-material/Refresh';
import IosShareIcon from '@mui/icons-material/IosShare';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { downloadICSFile } from '../services/calendar';
import { getApiBaseUrl, getCalendarProfilePayload, syncCalendarProfile } from '../services/api';
import CalendarView from './CalendarView';
import CardList from './CardList';
import ProgramFilter from './ProgramFilter';
import StatisticsDashboard from './StatisticsDashboard';
import NotificationManager from './NotificationManager';
import { formatDistanceToNow } from 'date-fns';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`schedule-tabpanel-${index}`}
      aria-labelledby={`schedule-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `schedule-tab-${index}`,
    'aria-controls': `schedule-tabpanel-${index}`,
  };
}

const ScheduleContainer = ({ events }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  
  // Load saved filters from localStorage on mount
  const [programFilters, setProgramFilters] = useState(() => {
    const savedFilters = localStorage.getItem('programFilters');
    return savedFilters ? JSON.parse(savedFilters) : {};
  });
  
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('programFilters', JSON.stringify(programFilters));
  }, [programFilters]);
  
  // Get last update timestamp from cache
  useEffect(() => {
    const cached = localStorage.getItem('cachedScheduleEvents');
    if (cached) {
      try {
        const { timestamp } = JSON.parse(cached);
        setLastUpdate(timestamp);
      } catch (error) {
        console.error('Error reading cache timestamp:', error);
      }
    }
  }, [events]); // Update when events change
  
  const handleForceRefresh = () => {
    // Clear cache
    localStorage.removeItem('cachedScheduleEvents');
    // Reload page to fetch fresh data
    window.location.reload();
  };
  
  // This space intentionally left empty - we've moved to program-based filtering

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleProgramFilterChange = (newFilters) => {
    setProgramFilters(newFilters);
  };

  const { filteredEvents, activeCourseKeys } = useMemo(() => {
    const courseKeys = [];
    console.log('All events:', events);
    console.log('Program filters:', programFilters);
    
    if (!programFilters || Object.keys(programFilters).length === 0) {
      console.log('No program filters set, showing all events');
      return {
        filteredEvents: events.map(event => ({
          ...event,
          title: `[${event.program}] ${event.title}`
        })),
        activeCourseKeys: events.map(event => {
          const eventYear = Number(event.year);
          return `${event.title}_${eventYear}_${event.program}`;
        })
      };
    }
    
    const filtered = events.filter(event => {
      // Skip events without program information
      if (!event.program) return false;
      
      // Format the program name to match the filter keys
      const formatProgramName = (programName) => {
        if (!programName) return '';
        // Just extract the base name before " - Year" or " - " 
        // Keep it exactly as it comes, no formatting
        const parts = programName.split(' - ');
        return parts[0];
      };
      
      const formattedProgramName = formatProgramName(event.program);
      
      // Debug logging
      if (event === events[0]) {
        console.log('Filter matching debug:', {
          originalName: event.program,
          formattedName: formattedProgramName,
          availableFilters: Object.keys(programFilters),
          filterFound: !!programFilters[formattedProgramName]
        });
      }
      
      // Get the filters for this program using formatted name
      const programFilter = programFilters[formattedProgramName];
      if (!programFilter) return false;
      
      // Ensure year is a number for comparison
      const eventYear = Number(event.year);
      const courseKey = `${event.title}_${eventYear}_${event.program}`;
      
      // Check if both course and year are selected for this program
      const isCourseSelected = programFilter.selectedCourses.includes(courseKey);
      const isYearSelected = programFilter.selectedYears.includes(eventYear);
      
      const isIncluded = isCourseSelected && isYearSelected;
      
      console.log('Checking event:', { 
        title: event.title, 
        year: eventYear, 
        program: event.program,
        key: courseKey, 
        isCourseSelected,
        isYearSelected,
        isIncluded
      });
      
      return isIncluded;
    }).map(event => {
      const eventYear = Number(event.year);
      courseKeys.push(`${event.title}_${eventYear}_${event.program}`);
      return {
        ...event,
        title: `[${event.program}] ${event.title}`
      };
    });
    
    console.log('Filtered events:', filtered);
    
    // If no events are filtered but we have programs with courses selected, this is likely a bug
    if (filtered.length === 0 && Object.keys(programFilters).length > 0) {
      console.warn('No events passed filtering despite having program filters!', {
        programFilters,
        totalEvents: events.length
      });
    }
    
    return {
      filteredEvents: filtered,
      activeCourseKeys: courseKeys
    };
  }, [events, programFilters]);

  useEffect(() => {
    const payload = getCalendarProfilePayload(programFilters, activeCourseKeys);
    if (!payload.timetables || payload.timetables.length === 0) {
      return;
    }
    syncCalendarProfile(payload);
  }, [programFilters, events, activeCourseKeys]);

  const relativeLastUpdate = useMemo(() => {
    if (!lastUpdate) return null;
    return formatDistanceToNow(new Date(lastUpdate), { addSuffix: true });
  }, [lastUpdate]);

  const formattedLastUpdate = useMemo(() => {
    if (!lastUpdate) return null;
    return new Date(lastUpdate).toLocaleString('en-GB');
  }, [lastUpdate]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 1.5, md: 0 },
        pb: { xs: 1, md: 0 }
      }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange} 
          aria-label="schedule view tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ 
            flexGrow: 1,
            width: { xs: '100%', md: 'auto' },
            minHeight: { xs: 48, sm: 52 }
          }}
        >
          <Tab 
            icon={<CalendarViewIcon />} 
            label="Calendar View" 
            iconPosition="start"
            {...a11yProps(0)} 
          />
          <Tab 
            icon={<ViewListIcon />} 
            label="List View" 
            iconPosition="start"
            {...a11yProps(1)} 
          />
        </Tabs>
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: { xs: 'flex-start', md: 'flex-end' },
          mt: { xs: 1, md: 0 }
        }}>
          {lastUpdate && relativeLastUpdate && formattedLastUpdate && (
            <Tooltip title={`Last update: ${formattedLastUpdate}`}>
              <Chip 
                icon={<AccessTimeIcon />} 
                label={relativeLastUpdate}
                size="small"
                variant="outlined"
                aria-label={`Last update: ${formattedLastUpdate}`}
                sx={{ cursor: 'help', flexShrink: 0 }}
              />
            </Tooltip>
          )}
          <Tooltip title="Manage notifications and reminders">
            <span>
              <NotificationManager
                events={filteredEvents}
                ariaLabel="Manage notifications and reminders"
              />
            </span>
          </Tooltip>
          <Tooltip title="Export Calendar">
            <IconButton 
              onClick={(e) => setExportAnchorEl(e.currentTarget)}
              size="small"
              aria-label="Open export calendar menu"
              sx={{ flexShrink: 0 }}
            >
              <IosShareIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Force refresh (clear cache)">
            <IconButton 
              onClick={handleForceRefresh}
              size="small"
              color="primary"
              aria-label="Force refresh (clear cache)"
              sx={{ flexShrink: 0 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={exportAnchorEl}
          open={Boolean(exportAnchorEl)}
          onClose={() => setExportAnchorEl(null)}
        >
          <MenuItem onClick={() => {
            console.log('Download ICS clicked, events:', filteredEvents.length);
            const success = downloadICSFile(filteredEvents);
            if (success) {
              console.log('ICS download successful');
            } else {
              console.error('ICS download failed');
              alert('Unable to generate the calendar file. Check the console for details.');
            }
            setExportAnchorEl(null);
          }}>
            Download Calendar File
          </MenuItem>
          <MenuItem onClick={async () => {
            // Create subscription URL
            const profilePayload = getCalendarProfilePayload(programFilters, activeCourseKeys);
            const synced = await syncCalendarProfile(profilePayload);

            if (!synced) {
              setExportAnchorEl(null);
              alert('Unable to sync the calendar to the server. Please try again.');
              return;
            }

            const apiBaseUrl = getApiBaseUrl();
            const calendarUrl = new URL('/calendar.ics', apiBaseUrl);
            calendarUrl.searchParams.set('profileId', profilePayload.profileId);
            calendarUrl.searchParams.set('urls', JSON.stringify(profilePayload));
            const subscriptionUrl = calendarUrl.toString().replace(/^https?:/, 'webcal:');
            
            // Try to copy to clipboard
            navigator.clipboard.writeText(subscriptionUrl).catch(() => {
              // Fallback if clipboard API fails
              const tempInput = document.createElement('input');
              tempInput.value = subscriptionUrl;
              document.body.appendChild(tempInput);
              tempInput.select();
              document.execCommand('copy');
              document.body.removeChild(tempInput);
            });
            
            // Show URL in prompt so user can copy manually if needed
            prompt(
              'Calendar subscription URL copied to clipboard!\n\n' +
              'To subscribe to this calendar:\n\n' +
              '1. In Apple Calendar: File > New Calendar Subscription\n' +
              '2. In Google Calendar: Other Calendars (+) > From URL\n' +
              '3. In Outlook: Add Calendar > Subscribe from web\n\n' +
              'Copy this URL:',
              subscriptionUrl
            );
            
            setExportAnchorEl(null);
          }}>
            Subscribe to Calendar
          </MenuItem>
        </Menu>
      </Box>

      <Stack spacing={2} sx={{ mt: { xs: 2, md: 3 } }}>
        <ProgramFilter
          events={events}
          selectedPrograms={programFilters}
          onProgramFilterChange={handleProgramFilterChange}
        />
        
        {/* Statistics Dashboard */}
        <StatisticsDashboard events={filteredEvents} />
      </Stack>

      <TabPanel value={currentTab} index={0}>
        <CalendarView events={filteredEvents} />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <CardList events={filteredEvents} />
      </TabPanel>
    </Box>
  );
};

export default ScheduleContainer;
