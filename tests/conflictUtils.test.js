/**
 * Tests for conflict detection utilities
 * Following TDD approach: Red -> Green -> Refactor
 */

import { eventsOverlap, findConflicts } from '../src/utils/conflictUtils';

describe('conflictUtils', () => {
  
  // Test Suite 1: eventsOverlap function
  describe('eventsOverlap', () => {
    
    test('should return true when events completely overlap', () => {
      // Arrange - prepara i dati
      const event1 = {
        start: new Date('2025-10-25T10:00:00'),
        end: new Date('2025-10-25T12:00:00')
      };
      const event2 = {
        start: new Date('2025-10-25T10:00:00'),
        end: new Date('2025-10-25T12:00:00')
      };
      
      // Act - esegui la funzione
      const result = eventsOverlap(event1, event2);
      
      // Assert - verifica il risultato
      expect(result).toBe(true);
    });

    test('should return true when event1 starts during event2', () => {
      const event1 = {
        start: new Date('2025-10-25T10:30:00'),
        end: new Date('2025-10-25T12:00:00')
      };
      const event2 = {
        start: new Date('2025-10-25T10:00:00'),
        end: new Date('2025-10-25T11:00:00')
      };
      
      const result = eventsOverlap(event1, event2);
      expect(result).toBe(true);
    });

    test('should return true when event1 ends during event2', () => {
      const event1 = {
        start: new Date('2025-10-25T09:00:00'),
        end: new Date('2025-10-25T10:30:00')
      };
      const event2 = {
        start: new Date('2025-10-25T10:00:00'),
        end: new Date('2025-10-25T11:00:00')
      };
      
      const result = eventsOverlap(event1, event2);
      expect(result).toBe(true);
    });

    test('should return true when event1 contains event2', () => {
      const event1 = {
        start: new Date('2025-10-25T09:00:00'),
        end: new Date('2025-10-25T12:00:00')
      };
      const event2 = {
        start: new Date('2025-10-25T10:00:00'),
        end: new Date('2025-10-25T11:00:00')
      };
      
      const result = eventsOverlap(event1, event2);
      expect(result).toBe(true);
    });

    test('should return false when events do not overlap', () => {
      const event1 = {
        start: new Date('2025-10-25T09:00:00'),
        end: new Date('2025-10-25T10:00:00')
      };
      const event2 = {
        start: new Date('2025-10-25T10:00:00'),
        end: new Date('2025-10-25T11:00:00')
      };
      
      const result = eventsOverlap(event1, event2);
      expect(result).toBe(false);
    });

    test('should return false when event1 is completely before event2', () => {
      const event1 = {
        start: new Date('2025-10-25T09:00:00'),
        end: new Date('2025-10-25T10:00:00')
      };
      const event2 = {
        start: new Date('2025-10-25T11:00:00'),
        end: new Date('2025-10-25T12:00:00')
      };
      
      const result = eventsOverlap(event1, event2);
      expect(result).toBe(false);
    });

    test('should return false when event1 is completely after event2', () => {
      const event1 = {
        start: new Date('2025-10-25T11:00:00'),
        end: new Date('2025-10-25T12:00:00')
      };
      const event2 = {
        start: new Date('2025-10-25T09:00:00'),
        end: new Date('2025-10-25T10:00:00')
      };
      
      const result = eventsOverlap(event1, event2);
      expect(result).toBe(false);
    });
  });

  // Test Suite 2: findConflicts function
  describe('findConflicts', () => {
    
    test('should return empty set when there are no events', () => {
      const events = [];
      
      const result = findConflicts(events);
      
      expect(result.size).toBe(0);
    });

    test('should return empty set when there is only one event', () => {
      const events = [{
        title: 'Matematica',
        start: new Date('2025-10-25T10:00:00'),
        end: new Date('2025-10-25T12:00:00'),
        program: 'Informatica'
      }];
      
      const result = findConflicts(events);
      
      expect(result.size).toBe(0);
    });

    test('should return empty set when events do not overlap', () => {
      const events = [
        {
          title: 'Matematica',
          start: new Date('2025-10-25T09:00:00'),
          end: new Date('2025-10-25T10:00:00'),
          program: 'Informatica'
        },
        {
          title: 'Fisica',
          start: new Date('2025-10-25T10:00:00'),
          end: new Date('2025-10-25T11:00:00'),
          program: 'Informatica'
        }
      ];
      
      const result = findConflicts(events);
      
      expect(result.size).toBe(0);
    });

    test('should detect conflicts when two events overlap', () => {
      const events = [
        {
          title: 'Matematica',
          start: new Date('2025-10-25T10:00:00'),
          end: new Date('2025-10-25T12:00:00'),
          program: 'Informatica'
        },
        {
          title: 'Fisica',
          start: new Date('2025-10-25T11:00:00'),
          end: new Date('2025-10-25T13:00:00'),
          program: 'Matematica'
        }
      ];
      
      const result = findConflicts(events);
      
      // Dovrebbero esserci 2 eventi in conflitto
      expect(result.size).toBe(2);
      
      // Verifica che contengano gli ID corretti
      const expectedId1 = 'Matematica_' + events[0].start + '_Informatica';
      const expectedId2 = 'Fisica_' + events[1].start + '_Matematica';
      
      expect(result.has(expectedId1)).toBe(true);
      expect(result.has(expectedId2)).toBe(true);
    });

    test('should detect multiple conflicts', () => {
      const events = [
        {
          title: 'Matematica',
          start: new Date('2025-10-25T10:00:00'),
          end: new Date('2025-10-25T12:00:00'),
          program: 'Informatica'
        },
        {
          title: 'Fisica',
          start: new Date('2025-10-25T11:00:00'),
          end: new Date('2025-10-25T13:00:00'),
          program: 'Matematica'
        },
        {
          title: 'Chimica',
          start: new Date('2025-10-25T11:30:00'),
          end: new Date('2025-10-25T12:30:00'),
          program: 'Chimica'
        }
      ];
      
      const result = findConflicts(events);
      
      // Tutti e 3 gli eventi dovrebbero essere in conflitto
      expect(result.size).toBe(3);
    });
  });
});
