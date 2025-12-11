import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import CourseFilter from './CourseFilter';
import YearFilter from './YearFilter';

const ProgramFilter = ({ 
  events, 
  selectedPrograms, 
  onProgramFilterChange 
}) => {
  const theme = useTheme();
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [expandedCourseFilters, setExpandedCourseFilters] = useState({});

  // Get base program name for filter keys (without year/code)
  const getBaseProgramName = (programName) => {
    if (!programName) return '';
    // Just extract the base name before " - Year" or " - " 
    // Keep it exactly as it comes, no formatting
    const parts = programName.split(' - ');
    return parts[0];
  };
  
  // Format program name for display (with year if available)
  const formatProgramName = (programName) => {
    console.log('Original program name:', programName);
    if (!programName) return '';
    
    const parts = programName.split(' - ');
    const name = getBaseProgramName(programName);
    const year = parts.length > 1 ? parts[1] : '';
    
    const result = year ? `${name} - ${year}` : name;
    console.log('Formatted program name:', result);
    return result;
  };

  // Group events by program
  const programGroups = useMemo(() => {
    const groups = {};
    
    // Get program years configuration from localStorage
    const savedProgramYears = localStorage.getItem('programYears');
    const programYearsConfig = savedProgramYears ? JSON.parse(savedProgramYears) : {};
    
    // First, identify all unique programs
    events.forEach(event => {
      if (event.program) {
        // Use base name as the key for consistency
        const baseName = getBaseProgramName(event.program);
        if (!groups[baseName]) {
          groups[baseName] = {
            name: event.program, // Keep original for matching
            displayName: formatProgramName(event.program),
            events: [],
            years: new Set(),
            courses: new Map(),
            configuredYears: programYearsConfig[event.program] || null
          };
        }
      }
    });
    
    // Then populate each program group with its events
    events.forEach(event => {
      if (event.program) {
        const baseName = getBaseProgramName(event.program);
        if (groups[baseName]) {
          groups[baseName].events.push(event);
        
          // Track years for this program
          if (event.year) {
            groups[baseName].years.add(Number(event.year));
          }
          
          // Track courses for this program
          const courseKey = `${event.title}_${event.year}_${event.program}`;
          if (!groups[baseName].courses.has(courseKey)) {
            groups[baseName].courses.set(courseKey, {
              title: event.title,
              docente: event.docente,
              cfu: event.cfu,
              year: Number(event.year),
              program: event.program
            });
          }
        }
      }
    });
    
    // Convert Sets and Maps to arrays for easier consumption
    Object.keys(groups).forEach(program => {
      // If we have a configured number of years, generate the full range
      if (groups[program].configuredYears) {
        const maxYears = groups[program].configuredYears;
        const fullYearRange = Array.from({length: maxYears}, (_, i) => i + 1);
        groups[program].years = fullYearRange;
      } else {
        // Otherwise use the years found in events
        groups[program].years = Array.from(groups[program].years).sort((a, b) => a - b);
      }
      
      groups[program].courses = Array.from(groups[program].courses.values());
    });
    
    return groups;
  }, [events, formatProgramName]);

  // Initialize program filters and add new programs automatically
  useEffect(() => {
    const currentFilters = selectedPrograms || {};
    const updatedFilters = { ...currentFilters };
    const updatedExpanded = { ...expandedPrograms };
    const updatedCourseExpanded = { ...expandedCourseFilters };
    let hasChanges = false;
    
    // Add any new programs that don't have filters yet
    Object.keys(programGroups).forEach(program => {
      if (!updatedFilters[program]) {
        // New program detected - initialize with all years and courses selected
        const allYears = programGroups[program].years;
        const allCourseKeys = programGroups[program].courses.map(
          course => `${course.title}_${course.year}_${course.program}`
        );
        
        updatedFilters[program] = {
          selectedYears: allYears,
          selectedCourses: allCourseKeys
        };
        
        // Auto-expand new programs
        updatedExpanded[program] = true;
        updatedCourseExpanded[program] = true;
        hasChanges = true;
        
        console.log(`Auto-added new program: ${program} with ${allCourseKeys.length} courses`);
      }
    });
    
    // Apply changes if any new programs were added
    if (hasChanges) {
      onProgramFilterChange(updatedFilters);
      setExpandedPrograms(updatedExpanded);
      setExpandedCourseFilters(updatedCourseExpanded);
    }
  }, [programGroups, selectedPrograms, onProgramFilterChange, expandedPrograms, expandedCourseFilters]);

  const handleYearChange = (program, newYears) => {
    const updatedFilters = { ...selectedPrograms };
    
    // Update years for this program
    updatedFilters[program] = {
      ...updatedFilters[program],
      selectedYears: newYears
    };
    
    // Filter courses to only include those from selected years
    const validCourses = updatedFilters[program].selectedCourses.filter(courseKey => {
      const parts = courseKey.split('_');
      if (parts.length >= 2) {
        const yearStr = parts[1];
        const year = Number(yearStr);
        return newYears.includes(year);
      }
      return false;
    });
    
    updatedFilters[program].selectedCourses = validCourses;
    
    onProgramFilterChange(updatedFilters);
  };

  const handleCourseToggle = (program, newSelection) => {
    const updatedFilters = { ...selectedPrograms };
    
    updatedFilters[program] = {
      ...updatedFilters[program],
      selectedCourses: newSelection
    };
    
    onProgramFilterChange(updatedFilters);
  };

  const handleAccordionToggle = (program) => {
    setExpandedPrograms(prev => ({
      ...prev,
      [program]: !prev[program]
    }));
  };

  const handleCourseFilterToggle = (program) => {
    setExpandedCourseFilters(prev => ({
      ...prev,
      [program]: prev[program] === undefined ? false : !prev[program]
    }));
  };

  // If no program groups, don't render anything
  if (Object.keys(programGroups).length === 0) {
    return null;
  }

  return (
    <Paper elevation={3} sx={{ mb: 2 }}>
      <Box
        sx={{
          p: 2,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <SchoolIcon />
        <Typography variant="h6">Program Filters</Typography>
      </Box>
      
      <Box sx={{ p: 2 }}>
        {Object.keys(programGroups).map(program => (
          <Accordion 
            key={program}
            expanded={expandedPrograms[program] !== false}
            onChange={() => handleAccordionToggle(program)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                backgroundColor: theme.palette.action.hover,
                '&:hover': {
                  backgroundColor: theme.palette.action.selected,
                }
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                {formatProgramName(program)}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {selectedPrograms && selectedPrograms[program] && (
                <>
                  <YearFilter
                    selectedYears={selectedPrograms[program].selectedYears || []}
                    onYearChange={(years) => handleYearChange(program, years)}
                    availableYears={programGroups[program].years}
                  />
                  <Divider sx={{ my: 2 }} />
                  <CourseFilter
                    courses={programGroups[program].courses.filter(course => 
                      selectedPrograms[program].selectedYears.includes(Number(course.year))
                    )}
                    selectedCourses={selectedPrograms[program].selectedCourses || []}
                    onCourseToggle={(courses) => handleCourseToggle(program, courses)}
                    expanded={expandedCourseFilters[program] !== false}
                    onExpandToggle={() => handleCourseFilterToggle(program)}
                  />
                </>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Paper>
  );
};

export default ProgramFilter;
