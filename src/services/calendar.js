// Generate ICS file manually without using the ics library
export const generateICSFile = (events) => {
  try {
    const formatDate = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    const escapeText = (text) => {
      if (!text) return '';
      return text.replace(/\\/g, '\\\\')
                 .replace(/;/g, '\\;')
                 .replace(/,/g, '\\,')
                 .replace(/\n/g, '\\n');
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UniBo Smart Calendar//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:UniBo Calendar',
      'X-WR-TIMEZONE:Europe/Rome',
      'X-WR-CALDESC:University of Bologna timetable'
    ].join('\r\n');

    events.forEach(event => {
      const uid = `${event.title}-${event.start}-${event.program}@unibo`.replace(/\s/g, '-');
      const location = event.aule?.length > 0 
        ? `${event.aule[0].des_ubicazione} - ${event.aule[0].des_risorsa}`
        : '';
      
      const description = `Course: ${event.title}\\nInstructor: ${event.docente || 'N/A'}\\nProgram: ${event.program}${event.note ? '\\nNotes: ' + event.note : ''}`;

      icsContent += '\r\n' + [
        'BEGIN:VEVENT',
        `UID:${escapeText(uid)}`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(event.start)}`,
        `DTEND:${formatDate(event.end)}`,
        `SUMMARY:${escapeText(event.title)}`,
        `DESCRIPTION:${description}`,
        location ? `LOCATION:${escapeText(location)}` : '',
        `CATEGORIES:${escapeText(event.program)}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      ].filter(line => line).join('\r\n');
    });

    icsContent += '\r\nEND:VCALENDAR';
    return icsContent;
  } catch (error) {
    console.error('Error generating ICS file:', error);
    return null;
  }
};

export const downloadICSFile = (events, filename = 'unibo-calendar.ics') => {
  const icsContent = generateICSFile(events);
  
  if (!icsContent) {
    console.error('Failed to generate ICS content');
    return false;
  }

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return true;
};