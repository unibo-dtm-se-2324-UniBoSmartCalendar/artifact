/**
 * Test gestione errori API per fetchSchedule (services/api.js)
 * - Imposta localStorage 'timetableUrls' con un programma fittizio
 * - Mock di axios.get che fallisce
 * - Verifica che fetchSchedule NON lanci ma gestisca l'errore internamente (e ritorni un array)
 */
import axios from "axios";
import { fetchSchedule } from "../src/services/api";

beforeEach(() => {
  // Simula una configurazione minima in localStorage
  window.localStorage.setItem("timetableUrls", JSON.stringify([
    { name: "DTM Test", url: "https://example.com/test-timetable" }
  ]));
});

afterEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
});

test("fetchSchedule: quando axios.get fallisce, ritorna comunque un array (vuoto)", async () => {
  axios.get.mockRejectedValueOnce(new Error("Network error"));
  axios.get.mockResolvedValue({ data: [] });
  const out = await fetchSchedule();
  expect(Array.isArray(out)).toBe(true);
  expect(out).toHaveLength(0);
});
