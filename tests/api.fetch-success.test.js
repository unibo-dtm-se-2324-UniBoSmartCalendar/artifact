import axios from "axios";
import { fetchSchedule } from "../src/services/api";

describe("fetchSchedule - success path", () => {
  const timetableEntry = {
    name: "DTM Digital Transformation Management",
    url: "https://corsi.unibo.it/2cycle/DigitalTransformationManagement/@@orario_reale_json?anno=1&curricula=GEN"
  };

  beforeEach(() => {
    window.localStorage.setItem("timetableUrls", JSON.stringify([timetableEntry]));
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test("aggregates multi-year events and converts date fields", async () => {
    const rawYear1Event = {
      title: "[DTM] Digital Strategy",
      start: "2025-10-01T08:00:00.000Z",
      end: "2025-10-01T10:00:00.000Z",
      aula: "Room 1"
    };

    const rawYear2Event = {
      title: "[DTM] Service Design Lab",
      start: "2026-03-15T12:00:00.000Z",
      end: "2026-03-15T14:00:00.000Z",
      aula: "Room 2"
    };

    axios.get
      .mockResolvedValueOnce({ data: [rawYear1Event] })
      .mockResolvedValueOnce({ data: [rawYear2Event] })
      .mockResolvedValue({ data: [] }); // year 3

    const events = await fetchSchedule();

    expect(axios.get).toHaveBeenCalledTimes(3);
    const requestedUrls = axios.get.mock.calls.map(([url]) => decodeURIComponent(url));
    expect(requestedUrls[0]).toContain("anno=1");
    expect(requestedUrls[1]).toContain("anno=2");
    expect(requestedUrls[0]).toContain("curricula=GEN");

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      program: timetableEntry.name,
      year: 1,
      aula: "Room 1"
    });
    expect(events[1]).toMatchObject({
      program: timetableEntry.name,
      year: 2,
      aula: "Room 2"
    });

    events.forEach((event, index) => {
      expect(event.start).toBeInstanceOf(Date);
      expect(event.end).toBeInstanceOf(Date);
      expect(event._timetableUrl).toContain(`anno=${index + 1}`);
    });
  });
});
