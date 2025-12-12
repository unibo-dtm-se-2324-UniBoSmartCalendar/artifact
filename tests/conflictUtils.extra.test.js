import { eventsOverlap, findConflicts, hasConflict, getConflictingEvents } from "../src/utils/conflictUtils";

describe("conflictUtils", () => {
  test("eventsOverlap: overlap parziale è vero; adiacenti è falso", () => {
    const a = { start: new Date("2025-11-06T10:00"), end: new Date("2025-11-06T12:00") };
    const b = { start: new Date("2025-11-06T11:30"), end: new Date("2025-11-06T13:00") };
    const c = { start: new Date("2025-11-06T12:00"), end: new Date("2025-11-06T13:00") };
    expect(eventsOverlap(a, b)).toBe(true);
    expect(eventsOverlap(a, c)).toBe(false);
  });

  test("findConflicts: restituisce gli ID degli eventi in conflitto", () => {
    const events = [
      { id: 1, title: "A", program: "DTM", start: new Date("2025-11-06T10:00"), end: new Date("2025-11-06T12:00") },
      { id: 2, title: "B", program: "DTM", start: new Date("2025-11-06T11:30"), end: new Date("2025-11-06T13:00") },
      { id: 3, title: "C", program: "DTM", start: new Date("2025-11-06T13:00"), end: new Date("2025-11-06T14:00") }
    ];
    const conflicts = findConflicts(events);

    expect(conflicts.size).toBe(2);

    const conflictIds = Array.from(conflicts);
    expect(conflictIds).toContain(`A_${events[0].start}_DTM`);
    expect(conflictIds).toContain(`B_${events[1].start}_DTM`);
    expect(conflictIds).not.toContain(`C_${events[2].start}_DTM`);
  });

  test("hasConflict & getConflictingEvents", () => {
    const events = [
      { id: 1, title: "A", program: "DTM", start: new Date("2025-11-06T10:00"), end: new Date("2025-11-06T12:00") },
      { id: 2, title: "B", program: "DTM", start: new Date("2025-11-06T11:30"), end: new Date("2025-11-06T13:00") }
    ];
    expect(hasConflict(events[0], events)).toBe(true);
    expect(hasConflict(events[1], events)).toBe(true);

    const list = getConflictingEvents(events[0], events);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(2);
  });
});
