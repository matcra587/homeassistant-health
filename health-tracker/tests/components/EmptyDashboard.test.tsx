import { expect, test } from "bun:test";
import { screen } from "@testing-library/react";
import { EmptyDashboard } from "../../src/client/screens/EmptyDashboard";
import { makeMember, render } from "./render";

function at(hour: number): Date {
  return new Date(2026, 4, 10, hour, 30, 0, 0);
}

test("greets with 'Good morning' when wall clock hour is 9", () => {
  render(
    <EmptyDashboard
      me={makeMember()}
      entries={[]}
      onLogToday={() => undefined}
      now={at(9)}
    />,
  );
  expect(screen.getByText(/Good morning/)).toBeTruthy();
});

test("greets with 'Good afternoon' when wall clock hour is 14", () => {
  render(
    <EmptyDashboard
      me={makeMember()}
      entries={[]}
      onLogToday={() => undefined}
      now={at(14)}
    />,
  );
  expect(screen.getByText(/Good afternoon/)).toBeTruthy();
});

test("greets with 'Good evening' when wall clock hour is 19", () => {
  render(
    <EmptyDashboard
      me={makeMember()}
      entries={[]}
      onLogToday={() => undefined}
      now={at(19)}
    />,
  );
  expect(screen.getByText(/Good evening/)).toBeTruthy();
});
