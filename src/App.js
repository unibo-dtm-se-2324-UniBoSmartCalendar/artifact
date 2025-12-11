import React, { useState, useEffect } from 'react';
import { 
  Container, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  Typography,
  CircularProgress,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  GlobalStyles,
  Snackbar,
  Alert
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Outlet } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ScheduleContainer from './components/ScheduleContainer';
import Settings from './components/Settings';
import { fetchSchedule } from './services/api';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#ac3931',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  components: {
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#ac3931',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#8e2e28',
              color: '#fff',
            },
          },
        },
      },
    },
  },
});

// Calendar page component
function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const loadSchedule = async () => {
      const CACHE_KEY = 'cachedScheduleEvents';
      const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

      try {
        // Try to load from cache first
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const { events: cachedEvents, timestamp, timetableUrls } = JSON.parse(cachedData);
            const currentTimetableUrls = localStorage.getItem('timetableUrls');
            
            // Check if cache is still valid (less than 1 hour old and same URLs)
            const cacheAge = Date.now() - timestamp;
            const sameUrls = currentTimetableUrls === timetableUrls;
            
            if (cacheAge < CACHE_DURATION && sameUrls) {
              console.log(`Using cached data (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
              setIsUsingCache(true);
              
              // Process cached events
              const validEvents = processEvents(cachedEvents);
              setEvents(validEvents);
              setLoading(false);
              return; // Exit early, using cache
            } else {
              if (!sameUrls) {
                console.log('Timetable URLs changed, invalidating cache');
              } else {
                console.log('Cache expired, fetching fresh data');
              }
            }
          } catch (cacheError) {
            console.warn('Error reading cache:', cacheError);
          }
        }

        // Fetch fresh data
        setIsUsingCache(false);
        const data = await fetchSchedule();
        console.log('Fetched fresh data:', data);
        
        if (Array.isArray(data)) {
          // Process and validate events
          const validEvents = processEvents(data);
          
          console.log(`Processed ${validEvents.length} valid events out of ${data.length} total`);
          setEvents(validEvents);
          
          // Save to cache
          const cacheData = {
            events: data, // Store raw data for re-processing
            timestamp: Date.now(),
            timetableUrls: localStorage.getItem('timetableUrls')
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          console.log('Data cached successfully');
          setSnackbar({ 
            open: true, 
            message: 'Schedule loaded successfully', 
            severity: 'success' 
          });
        } else {
          setError('Invalid data format received from the server');
          setSnackbar({ 
            open: true, 
            message: 'Invalid data format', 
            severity: 'error' 
          });
        }
      } catch (err) {
        console.error('Error loading schedule:', err);
        
        // Try to use stale cache as fallback
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const { events: cachedEvents } = JSON.parse(cachedData);
            console.log('Using stale cache as fallback');
            const validEvents = processEvents(cachedEvents);
            setEvents(validEvents);
            setIsUsingCache(true);
            setError('Using cached data. Could not fetch fresh updates.');
            setSnackbar({ 
              open: true, 
              message: 'Using offline data. Check your connection.', 
              severity: 'warning' 
            });
          } catch (cacheError) {
            setError('Failed to load schedule. Please try again later.');
            setSnackbar({ 
              open: true, 
              message: 'Failed to load schedule', 
              severity: 'error' 
            });
          }
        } else {
          setError('Failed to load schedule. Please try again later.');
          setSnackbar({ 
            open: true, 
            message: 'Failed to load schedule. Please check if the server is running.', 
            severity: 'error' 
          });
        }
      } finally {
        setLoading(false);
      }
    };

    // Helper function to process and validate events
    const processEvents = (data) => {
      return data
        .filter(event => event.start && event.end)
        .map(event => {
          try {
            // Convert to Date objects and ensure they're valid
            const start = new Date(event.start);
            const end = new Date(event.end);
            
            // Check if dates are valid
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
              console.warn('Invalid date found in event:', event);
              return null;
            }
            
            return {
              ...event,
              start,
              end
            };
          } catch (dateError) {
            console.warn('Error converting dates for event:', event, dateError);
            return null;
          }
        })
        .filter(Boolean); // Remove null events
    };

    loadSchedule();
  }, []);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading schedule...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" align="center" gutterBottom>
          {error}
        </Typography>
        {isUsingCache && (
          <Typography variant="body2" color="text.secondary" align="center">
            Displaying cached data from a previous session.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <>
      {isUsingCache && (
        <Box sx={{ bgcolor: 'info.light', color: 'info.contrastText', p: 1, textAlign: 'center' }}>
          <Typography variant="body2">
            📦 Using cached data to improve performance
          </Typography>
        </Box>
      )}
      <ScheduleContainer events={events} />
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

// App layout with navigation
function AppLayout() {
  const location = useLocation();
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component={Link} 
            to="/" 
            sx={{ 
              flexGrow: 1, 
              color: 'inherit', 
              textDecoration: 'none',
              '&:hover': {
                color: 'inherit'
              }
            }}
          >
            Unibo Course Calendar
          </Typography>
          {location.pathname === '/' ? (
            <IconButton
              color="inherit"
              onClick={() => window.location.href = '/settings'}
              aria-label="settings"
            >
              <SettingsIcon />
            </IconButton>
          ) : (
            <Button
              color="inherit"
              onClick={() => window.location.href = '/'}
              startIcon={<ArrowBackIcon />}
            >
              Back to Calendar
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            '.rbc-calendar': {
              fontFamily: theme.typography.fontFamily,
            },
            '.rbc-toolbar button': {
              color: theme.palette.text.primary,
            },
            '.rbc-toolbar button.rbc-active': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            },
            '.rbc-event': {
              backgroundColor: theme.palette.primary.main,
              borderRadius: '4px',
              padding: '2px 5px',
              fontSize: '0.875rem',
            },
            '.rbc-today': {
              backgroundColor: theme.palette.action.hover,
            },
            '.rbc-header': {
              padding: '8px',
              fontWeight: theme.typography.fontWeightMedium,
            },
          }}
        />
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<CalendarPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </Router>
  );
}

export default App;