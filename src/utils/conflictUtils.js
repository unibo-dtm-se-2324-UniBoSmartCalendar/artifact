/**
 * Utility functions for detecting and handling schedule conflicts
 */

/**
 * Checks if two events have overlapping times
 * @param {Object} event1 - First event with start and end properties
 * @param {Object} event2 - Second event with start and end properties
 * @returns {boolean} - True if events overlap
 */
export const eventsOverlap = (event1, event2) => {
  const start1 = new Date(event1.start);
  const end1 = new Date(event1.end);
  const start2 = new Date(event2.start);
  const end2 = new Date(event2.end);

  return (
    (start1 >= start2 && start1 < end2) ||
    (end1 > start2 && end1 <= end2) ||
    (start1 <= start2 && end1 >= end2)
  );
};

/**
 * Finds all conflicting events in a list
 * @param {Array} events - Array of events to check
 * @returns {Set} - Set of event IDs that have conflicts
 */
export const findConflicts = (events) => {
  const conflictingEventIds = new Set();

  events.forEach((event, index) => {
    events.slice(index + 1).forEach((otherEvent) => {
      if (eventsOverlap(event, otherEvent)) {
        // Use a combination of properties to create a unique ID
        const eventId1 = `${event.title}_${event.start}_${event.program}`;
        const eventId2 = `${otherEvent.title}_${otherEvent.start}_${otherEvent.program}`;
        
        conflictingEventIds.add(eventId1);
        conflictingEventIds.add(eventId2);
      }
    });
  });

  return conflictingEventIds;
};

/**
 * Checks if a specific event has conflicts with others
 * @param {Object} event - Event to check
 * @param {Array} allEvents - All events to check against
 * @returns {boolean} - True if event has conflicts
 */
export const hasConflict = (event, allEvents) => {
  const eventId = `${event.title}_${event.start}_${event.program}`;
  const conflicts = findConflicts(allEvents);
  return conflicts.has(eventId);
};

/**
 * Gets all events that conflict with a given event
 * @param {Object} event - Event to check
 * @param {Array} allEvents - All events to check against
 * @returns {Array} - Array of conflicting events
 */
export const getConflictingEvents = (event, allEvents) => {
  return allEvents.filter(otherEvent => {
    if (event === otherEvent) return false;
    return eventsOverlap(event, otherEvent);
  });
};S