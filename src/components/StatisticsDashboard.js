import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { format, getDay, startOfWeek, endOfWeek, isWithinInterval, differenceInMinutes } from 'date-fns';
import { enGB } from 'date-fns/locale';

const StatisticsDashboard = ({ events }) => {
  // Calculate statistics
  const stats = useMemo(() => {
    if (!events || events.length === 0) {
      return {
        totalHours: 0,
        weeklyHours: 0,
        totalEvents: 0,
        busiestDay: 'N/A',
        coursesByYear: {},
        conflicts: [],
        hourDistribution: Array(24).fill(0),
        dayDistribution: Array(7).fill(0)
      };
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { locale: enGB });
    const weekEnd = endOfWeek(now, { locale: enGB });

    let totalMinutes = 0;
    let weeklyMinutes = 0;
    const coursesByYear = {};
    const hourDistribution = Array(24).fill(0);
    const dayDistribution = Array(7).fill(0);
    const conflicts = [];

    // Process each event
    events.forEach((event, index) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const duration = differenceInMinutes(end, start);

      // Total hours
      totalMinutes += duration;

      // Weekly hours (if event is in current week)
      if (isWithinInterval(start, { start: weekStart, end: weekEnd })) {
        weeklyMinutes += duration;
      }

      // Courses by year
      const year = event.year || 'Unknown';
      if (!coursesByYear[year]) {
        coursesByYear[year] = new Set();
      }
      coursesByYear[year].add(event.title);

      // Hour distribution (what hours of day are busiest)
      const hour = start.getHours();
      hourDistribution[hour]++;

      // Day distribution (what days of week are busiest)
      const dayOfWeek = getDay(start);
      dayDistribution[dayOfWeek]++;

      // Check for conflicts
      events.slice(index + 1).forEach((otherEvent) => {
        const otherStart = new Date(otherEvent.start);
        const otherEnd = new Date(otherEvent.end);

        // Check if events overlap
        if (
          (start >= otherStart && start < otherEnd) ||
          (end > otherStart && end <= otherEnd) ||
          (start <= otherStart && end >= otherEnd)
        ) {
          conflicts.push({
            event1: event.title,
            event2: otherEvent.title,
            time: format(start, 'PPP p', { locale: enGB })
          });
        }
      });
    });

    // Find busiest day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const maxDayIndex = dayDistribution.indexOf(Math.max(...dayDistribution));
    const busiestDay = dayNames[maxDayIndex];

    // Convert coursesByYear Sets to counts
    const coursesByYearCount = {};
    Object.keys(coursesByYear).forEach(year => {
      coursesByYearCount[year] = coursesByYear[year].size;
    });

    return {
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      weeklyHours: Math.round(weeklyMinutes / 60 * 10) / 10,
      totalEvents: events.length,
      busiestDay,
      coursesByYear: coursesByYearCount,
      conflicts: conflicts.slice(0, 5), // Show max 5 conflicts
      hourDistribution,
      dayDistribution
    };
  }, [events]);

  // Find busiest hour
  const busiestHourIndex = stats.hourDistribution.indexOf(Math.max(...stats.hourDistribution));
  const busiestHour = `${busiestHourIndex}:00`;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <TrendingIcon sx={{ mr: 1 }} />
        Calendar Statistics
      </Typography>

      <Grid container spacing={2}>
        {/* Total Events */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Total Events
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {stats.totalEvents}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Hours */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Total Hours
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {stats.totalHours}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Hours */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Hours This Week
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {stats.weeklyHours}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Conflicts */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ bgcolor: stats.conflicts.length > 0 ? 'warning.light' : 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon color={stats.conflicts.length > 0 ? 'error' : 'disabled'} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Time Conflicts
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {stats.conflicts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Busiest Day and Hour */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              📊 Distribution
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Busiest Day
              </Typography>
              <Chip label={stats.busiestDay} color="primary" sx={{ fontWeight: 'bold' }} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Most Frequent Time Slot
              </Typography>
              <Chip label={busiestHour} color="primary" sx={{ fontWeight: 'bold' }} />
            </Box>
          </Paper>
        </Grid>

        {/* Courses by Year */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SchoolIcon sx={{ mr: 1 }} />
              Courses by Year
            </Typography>
            {Object.keys(stats.coursesByYear).length > 0 ? (
              Object.entries(stats.coursesByYear)
                .sort(([a], [b]) => a - b)
                .map(([year, count]) => (
                  <Box key={year} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Year {year}</Typography>
                      <Typography variant="body2" fontWeight="bold">{count} courses</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(count / Math.max(...Object.values(stats.coursesByYear))) * 100} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No courses available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Conflicts List */}
        {stats.conflicts.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2, bgcolor: 'warning.light' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: '#d32f2f' }}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                Detected Time Conflicts
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {stats.conflicts.map((conflict, index) => (
                <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#1976d2' }} fontWeight="bold">
                    ⚠️ {conflict.event1} ↔ {conflict.event2}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e65100' }}>
                    {conflict.time}
                  </Typography>
                </Box>
              ))}
              {stats.conflicts.length > 5 && (
                <Typography variant="caption" sx={{ color: '#e65100' }}>
                  ...and {stats.conflicts.length - 5} more conflicts
                </Typography>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default StatisticsDashboard;