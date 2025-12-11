import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay, addMonths, addWeeks, addDays } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { 
  Box, 
  Paper, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  ToggleButtonGroup, 
  ToggleButton, 
  IconButton, 
  Button, 
  Typography 
} from '@mui/material';
import TodayIcon from '@mui/icons-material/Today';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarCustom.css';
import EventList from './EventList';
import { formatEventTitle, createCalendarEvent } from '../utils/eventUtils';
import { findConflicts } from '../utils/conflictUtils';

const locales = {
  'en-GB': enGB
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const calendarMinHeight = {
  xs: 540,
  sm: 720,
  md: 800
};

const moveDateByView = (currentDate, view, direction) => {
  switch (view) {
    case Views.DAY:
      return addDays(currentDate, direction);
    case Views.WEEK:
    case Views.AGENDA:
      return addWeeks(currentDate, direction);
    case Views.MONTH:
    default:
      return addMonths(currentDate, direction);
  }
};

const formatViewLabel = (date, view) => {
  switch (view) {
    case Views.DAY:
      return localizer.format(date, 'EEEE dd MMMM yyyy');
    case Views.WEEK: {
      const start = startOfWeek(date, { locale: enGB });
      const end = endOfWeek(date, { locale: enGB });
      return `${localizer.format(start, 'dd MMM')} – ${localizer.format(end, 'dd MMM yyyy')}`;
    }
    case Views.AGENDA: {
      const start = startOfWeek(date, { locale: enGB });
      const end = endOfWeek(date, { locale: enGB });
      return `${localizer.format(start, 'dd MMM yyyy')} – ${localizer.format(end, 'dd MMM yyyy')}`;
    }
    case Views.MONTH:
    default:
      return localizer.format(date, 'MMMM yyyy');
  }
};

const CalendarView = ({ events }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());

  // Process events for the calendar
  const calendarEvents = useMemo(() => {
    console.log('Processing events for calendar:', events.length);
    
    // Debug event structure
    if (events.length > 0) {
      console.log('Sample event structure:', events[0]);
    }
    
    return events.map(event => {
      // Ensure start and end are valid dates
      let start, end;
      
      try {
        start = new Date(event.start);
        end = new Date(event.end);
        
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.warn('Invalid date in event:', event);
          // Use current date as fallback
          const now = new Date();
          start = now;
          end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
        }
      } catch (error) {
        console.error('Error parsing dates for event:', event, error);
        // Use current date as fallback
        const now = new Date();
        start = now;
        end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
      }
      
      // Use the utility function to create a calendar event with formatted title
      return createCalendarEvent(event, start, end);
    });
  }, [events]);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
  };

  const handleCloseDialog = () => {
    setSelectedEvent(null);
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const handleViewChange = (newView) => {
    if (newView && newView !== view) {
      setView(newView);
    }
  };

  const handleNavigationControl = (type) => {
    if (type === 'TODAY') {
      setDate(new Date());
      return;
    }

    setDate(prevDate => moveDateByView(prevDate, view, type === 'NEXT' ? 1 : -1));
  };

  // Find conflicts
  const conflictingEventIds = useMemo(() => findConflicts(events), [events]);

  const eventStyleGetter = (event) => {
    const eventId = event.resource ? 
      `${event.resource.title}_${event.resource.start}_${event.resource.program}` : '';
    const hasConflict = conflictingEventIds.has(eventId);

    return {
      style: {
        backgroundColor: hasConflict ? '#1976d2' : '#ac3931',
        borderRadius: '4px',
        border: hasConflict ? '2px solid #fff' : 'none',
        color: 'white',
        fontWeight: hasConflict ? 'bold' : 'normal',
        boxShadow: hasConflict ? '0 0 10px rgba(25, 118, 210, 0.5)' : 'none',
      }
    };
  };

  const formats = {
    eventTimeRangeFormat: () => '', // This removes the time from the month view
    timeGutterFormat: (date, culture, localizer) =>
      localizer.format(date, 'HH:mm', culture),
    eventTimeRangeEndFormat: ({ end }, culture, localizer) =>
      localizer.format(end, 'HH:mm', culture),
    dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
      localizer.format(start, 'MMMM dd', culture) + ' - ' +
      localizer.format(end, view === Views.MONTH ? 'MMMM dd' : 'dd', culture),
    dayHeaderFormat: (date, culture, localizer) =>
      localizer.format(date, 'EEEE dd/MM', culture), // Example: "Monday 22/10"
    weekdayFormat: (date, culture, localizer) =>
      localizer.format(date, 'EEEE', culture),
    timeRangeFormat: ({ start, end }, culture, localizer) =>
      localizer.format(start, 'HH:mm', culture) + ' - ' + localizer.format(end, 'HH:mm', culture),
  };

  // Custom styles for the calendar
  const calendarStyle = {
    height: '100%',
    minHeight: calendarMinHeight,
    '& .rbc-time-view': {
      border: '1px solid #ddd',
    },
    '& .rbc-time-header-content': {
      borderLeft: '1px solid #ddd',
    },
    '& .rbc-time-content': {
      borderTop: '2px solid #ac3931',
    },
    '& .rbc-current-time-indicator': {
      backgroundColor: '#rgb(231, 210, 18)',
      height: '2px',
    },
    '& .rbc-today': {
      backgroundColor: '#rgb(231, 210, 18)',
    },
    '& .rbc-header': {
      padding: '8px 3px',
      fontWeight: 'bold',
      fontSize: '0.9rem',
      borderBottom: '2px solid #ac3931',
      backgroundColor: '#fafafa',
    },
    '& .rbc-time-slot': {
      minHeight: '40px',
    },
    '& .rbc-event': {
      padding: '2px 5px',
      fontSize: '0.85rem',
    },
    '& .rbc-event-label': {
      fontSize: '0.75rem',
    },
  };

  return (
    <Box sx={{ minHeight: calendarMinHeight, height: 'auto' }}>
      <Paper 
        elevation={2} 
        sx={{ 
          minHeight: calendarMinHeight, 
          height: 'auto', 
          p: { xs: 1.5, sm: 2 }, 
          overflow: 'hidden' 
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.5, sm: 2 },
            mb: 2
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'space-between', sm: 'flex-start' },
              gap: 1
            }}
          >
            <IconButton
              size="small"
              onClick={() => handleNavigationControl('PREV')}
              aria-label="Previous day"
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                textTransform: 'capitalize',
                textAlign: 'center',
                minWidth: { xs: 'auto', sm: 200 }
              }}
            >
              {formatViewLabel(date, view)}
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleNavigationControl('NEXT')}
              aria-label="Next day"
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TodayIcon fontSize="small" />}
            onClick={() => handleNavigationControl('TODAY')}
            sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Today
          </Button>
        </Box>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(event, nextView) => handleViewChange(nextView)}
          size="small"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-start' },
            gap: 1,
            mb: 2,
            '& .MuiToggleButton-root': {
              flex: { xs: '1 1 45%', sm: '0 0 auto' },
              minWidth: { xs: '45%', sm: 100 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            },
            '& .MuiToggleButton-root.Mui-selected': {
              borderColor: 'primary.main'
            }
          }}
        >
          <ToggleButton value={Views.MONTH}>Month</ToggleButton>
          <ToggleButton value={Views.WEEK}>Week</ToggleButton>
          <ToggleButton value={Views.DAY}>Day</ToggleButton>
          <ToggleButton value={Views.AGENDA}>Agenda</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={calendarStyle}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={{
              month: true,
              week: true,
              day: true,
              agenda: true,
            }}
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            formats={formats}
            popup
            tooltipAccessor={event => `${event.title}`}
            min={new Date(2024, 0, 1, 7, 0, 0)} // Start at 7:00 AM
            max={new Date(2024, 0, 1, 21, 0, 0)} // End at 9:00 PM
            step={30}
            timeslots={2}
            getNow={() => new Date()} // Ensure current time is always fresh
            showMultiDayTimes={true}
            components={{ toolbar: () => null }}
            messages={{
              today: 'Today',
              previous: 'Previous',
              next: 'Next',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              agenda: 'Agenda',
              date: 'Date',
              time: 'Time',
              event: 'Event',
              noEventsInRange: 'No events in this range',
              showMore: total => `+ ${total} more`
            }}
          />
        </Box>
      </Paper>

      <Dialog
        open={Boolean(selectedEvent)}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              {formatEventTitle(selectedEvent)}
            </DialogTitle>
            <DialogContent>
              <EventList events={[selectedEvent]} />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CalendarView;
