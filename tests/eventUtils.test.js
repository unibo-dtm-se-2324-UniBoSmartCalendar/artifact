import { formatEventTitle, createCalendarEvent } from "../src/utils/eventUtils";

describe("eventUtils", () => {
  describe("formatEventTitle", () => {
    test("rimuove prefissi tra [] e spazi extra", () => {
      const event = { title: "[DTM - 2 - ]   Analisi dei Dati   " };
      expect(formatEventTitle(event)).toBe("Analisi dei Dati");
    });

    test("elimina parole del programma >3 caratteri mantenendo il nome del corso", () => {
      const event = {
        title: "Data Science International Advanced Lab",
        program: "Data Science International"
      };

      expect(formatEventTitle(event)).toBe("Advanced Lab");
    });

    test("se tutto viene rimosso torna al titolo originale senza prefissi", () => {
      const event = {
        title: "[DTM] DTM",
        program: "DTM"
      };

      expect(formatEventTitle(event)).toBe("DTM");
    });
  });

  describe("createCalendarEvent", () => {
    test("costruisce titolo con docente e mantiene resource", () => {
      const event = { title: "[DTM] Basi di SE", docente: "Prof. Rossi" };
      const start = new Date("2025-11-06T10:00");
      const end = new Date("2025-11-06T12:00");
      const created = createCalendarEvent(event, start, end);

      expect(created.title).toBe("Basi di SE - Prof. Rossi");
      expect(created.start).toEqual(start);
      expect(created.end).toEqual(end);
      expect(created.resource).toBe(event);
    });

    test("usa 'No Instructor' quando manca il docente", () => {
      const event = { title: "Metodi Numerici" };
      const start = new Date("2025-11-07T09:00");
      const end = new Date("2025-11-07T11:00");
      const created = createCalendarEvent(event, start, end);

      expect(created.title).toBe("Metodi Numerici - No Instructor");
    });
  });
});
