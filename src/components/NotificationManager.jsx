import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';

const NotificationManager = ({ events, ariaLabel = 'Notifications & reminders' }) => {
  const [open, setOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notify15min, setNotify15min] = useState(true);
  const [notify5min, setNotify5min] = useState(true);
  const [permission, setPermission] = useState('default');
  const [reminders, setReminders] = useState([]);
  const [nextLesson, setNextLesson] = useState(null);

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load saved settings
    const saved = localStorage.getItem('notificationsEnabled');
    if (saved === 'true') {
      setNotificationsEnabled(true);
    }

    const saved15 = localStorage.getItem('notify15min');
    if (saved15 !== null) {
      setNotify15min(saved15 === 'true');
    }

    const saved5 = localStorage.getItem('notify5min');
    if (saved5 !== null) {
      setNotify5min(saved5 === 'true');
    }

    const savedReminders = localStorage.getItem('customReminders');
    if (savedReminders) {
      setReminders(JSON.parse(savedReminders));
    }
  }, []);

  useEffect(() => {
    if (!notificationsEnabled || !events || events.length === 0) return;

    // Find next lesson
    const now = new Date();
    const upcomingEvents = events
      .filter(event => new Date(event.start) > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    if (upcomingEvents.length > 0) {
      setNextLesson(upcomingEvents[0]);
    }

    // Set up interval to check for upcoming lessons
    const interval = setInterval(() => {
      checkUpcomingLessons();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [notificationsEnabled, events]);

  const checkUpcomingLessons = () => {
    if (!notificationsEnabled || permission !== 'granted') return;

    const now = new Date();
    events.forEach(event => {
      const eventStart = new Date(event.start);
      const minutesUntilStart = (eventStart - now) / 1000 / 60;

      // Notify 15 minutes before (if enabled)
      if (notify15min && minutesUntilStart > 14 && minutesUntilStart <= 15) {
        showNotification(event, 15);
      }
      // Notify 5 minutes before (if enabled)
      else if (notify5min && minutesUntilStart > 4 && minutesUntilStart <= 5) {
        showNotification(event, 5);
      }
    });
  };

  const showNotification = (event, minutes) => {
    const location = event.aule?.length > 0 
      ? `${event.aule[0].des_ubicazione} - ${event.aule[0].des_risorsa}`
      : 'Room to be confirmed';

    new Notification(`📚 Class starts in ${minutes} minutes`, {
      body: `${event.title}\n${location}\nInstructor: ${event.docente || 'N/A'}`,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `lesson-${event.start}`,
      requireInteraction: false,
      silent: false
    });
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notificationsEnabled', 'true');
        
        // Show test notification
        new Notification('🎉 Notifications enabled!', {
          body: 'You will receive reminders 15 and 5 minutes before classes',
          icon: '/favicon.svg'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const toggleNotifications = () => {
    if (!notificationsEnabled) {
      if (permission !== 'granted') {
        requestPermission();
      } else {
        setNotificationsEnabled(true);
        localStorage.setItem('notificationsEnabled', 'true');
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notificationsEnabled', 'false');
    }
  };

  const toggle15MinNotification = () => {
    const newValue = !notify15min;
    setNotify15min(newValue);
    localStorage.setItem('notify15min', newValue.toString());
  };

  const toggle5MinNotification = () => {
    const newValue = !notify5min;
    setNotify5min(newValue);
    localStorage.setItem('notify5min', newValue.toString());
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const getTimeUntil = (date) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diff = eventDate - now;
    
    if (diff < 0) return 'Already started';
    
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days !== 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        color={notificationsEnabled ? 'primary' : 'default'}
        size="small"
        aria-label={ariaLabel}
      >
        {notificationsEnabled ? <NotificationsIcon /> : <NotificationsOffIcon />}
      </IconButton>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          🔔 Notifications & Reminders
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationsEnabled}
                  onChange={toggleNotifications}
                  color="primary"
                />
              }
              label="Enable automatic notifications"
            />
            <Typography variant="caption" display="block" sx={{ ml: 4, color: 'text.secondary' }}>
              You will receive notifications 15 and 5 minutes before every class
            </Typography>
          </Box>

          {permission === 'denied' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Notifications are blocked by the browser. Enable them from your browser settings.
            </Alert>
          )}

          {permission === 'default' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Click "Enable notifications" to receive reminders before classes.
            </Alert>
          )}

          {notificationsEnabled && nextLesson && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ color: 'primary.contrastText' }}>
                📅 Next Class
              </Typography>
              <Typography variant="h6" sx={{ color: 'primary.contrastText' }}>
                {nextLesson.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'primary.contrastText', opacity: 0.9 }}>
                {formatDate(nextLesson.start)} - {formatTime(nextLesson.start)}
              </Typography>
              <Chip 
                label={getTimeUntil(nextLesson.start)} 
                size="small" 
                sx={{ mt: 1, bgcolor: 'white', color: 'primary.main' }}
              />
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            ⚙️ Notification Settings
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="15-minute reminder"
                secondary="Gives you enough time to reach the classroom"
              />
              <Switch
                checked={notify15min}
                onChange={toggle15MinNotification}
                disabled={!notificationsEnabled}
                color="primary"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="5-minute reminder"
                secondary="Final heads-up before class starts"
              />
              <Switch
                checked={notify5min}
                onChange={toggle5MinNotification}
                disabled={!notificationsEnabled}
                color="primary"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationManager;
