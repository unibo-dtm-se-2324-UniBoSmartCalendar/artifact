import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import ScheduleContainer from "../src/components/ScheduleContainer";

test("ScheduleContainer render con eventi sovrapposti (smoke)", () => {
  const events = [
    { id: 1, title: "A", start: new Date("2025-11-06T10:00"), end: new Date("2025-11-06T12:00"), program: "DTM", year: 2 },
    { id: 2, title: "B", start: new Date("2025-11-06T11:30"), end: new Date("2025-11-06T13:00"), program: "DTM", year: 2 },
  ];
  const { container } = render(<ScheduleContainer events={events} />);
  expect(container).toBeTruthy();
});
