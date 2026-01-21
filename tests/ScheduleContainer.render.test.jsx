import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ScheduleContainer from "../src/components/ScheduleContainer";

test("ScheduleContainer mostra i tab 'Calendar View' e 'List View'", () => {
  render(<ScheduleContainer events={[]} />);
  expect(screen.getByText("Calendar View")).toBeInTheDocument();
  expect(screen.getByText("List View")).toBeInTheDocument();
});
