import { KeyboardEvent } from "react";
import { VirtuosoHandle } from "react-virtuoso";
import { handleKeyDown } from "./keyboard";
import { MessageDescriptor } from "./types";
import { genEmptyMessageDescriptor } from "./testing";

/**
 * Regression: the message table is focusable (tabIndex={0}) so keyboard users can reach the
 * ArrowUp/ArrowDown/j/k navigation - but handleKeyDown called event.preventDefault() for EVERY key
 * before looking at which key it was, so Tab / Shift-Tab could never move focus back out of the
 * table. Only the keys the handler actually acts on may be swallowed.
 *
 * CS-26 (e2e) covers the navigation keys; nothing covered the keys that must pass through.
 */
const messages: MessageDescriptor[] = [0, 1, 2].map((i) =>
  genEmptyMessageDescriptor({ numMessageProcessed: i, displayIndex: i }),
);

type Pressed = {
  preventDefaultCalls: number;
  selectionUpdates: number[][];
  scrolledTo: { index: number }[];
};

function press(
  key: string,
  opts?: { shiftKey?: boolean; selected?: number[]; messages?: MessageDescriptor[] },
): Pressed {
  // handleKeyDown debounces itself against a module-level timestamp (64ms) - step the fake clock
  // well past it so every press is handled on its own merits.
  jest.advanceTimersByTime(1000);

  const result: Pressed = { preventDefaultCalls: 0, selectionUpdates: [], scrolledTo: [] };
  const event = {
    key,
    shiftKey: opts?.shiftKey ?? false,
    preventDefault: () => {
      result.preventDefaultCalls += 1;
    },
  } as unknown as KeyboardEvent<HTMLDivElement>;

  handleKeyDown({
    event,
    messages: opts?.messages ?? messages,
    selectedMessages: opts?.selected ?? [0],
    setSelectedMessages: (selected) => result.selectionUpdates.push(selected),
    virtuoso: {
      scrollIntoView: (location: { index: number }) => result.scrolledTo.push(location),
    } as unknown as VirtuosoHandle,
  });

  return result;
}

// File-level, NOT per describe: `handleKeyDown`'s debounce timestamp is module state shared by every
// test here, and it only ever moves forwards. Re-installing fake timers between describes resets the
// clock to the real "now", which is BEHIND the timestamp the previous describe left behind - every
// press after that looks like it arrived within 64ms of the last one and is silently dropped.
beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

describe("handleKeyDown only swallows the keys it handles", () => {
  it("lets Tab through so focus can leave the message table", () => {
    const got = press("Tab");
    expect(got.preventDefaultCalls).toBe(0);
    expect(got.selectionUpdates).toEqual([]);
  });

  it("lets Shift-Tab through so focus can leave the message table backwards", () => {
    const got = press("Tab", { shiftKey: true });
    expect(got.preventDefaultCalls).toBe(0);
    expect(got.selectionUpdates).toEqual([]);
  });

  it.each(["a", "Escape", "Enter", "PageDown", "/"])("lets the unhandled key %s through", (key) => {
    expect(press(key).preventDefaultCalls).toBe(0);
  });

  it.each(["ArrowUp", "k", "ArrowDown", "j"])("still swallows the navigation key %s", (key) => {
    expect(press(key).preventDefaultCalls).toBe(1);
  });

  it("still moves the selection with the navigation keys", () => {
    expect(press("ArrowDown", { selected: [0] }).selectionUpdates).toEqual([[1]]);
    expect(press("j", { selected: [1] }).selectionUpdates).toEqual([[2]]);
    expect(press("ArrowDown", { selected: [2] }).selectionUpdates).toEqual([[0]]); // wraps
    expect(press("ArrowUp", { selected: [0] }).selectionUpdates).toEqual([[2]]); // wraps
    expect(press("k", { selected: [2] }).selectionUpdates).toEqual([[1]]);
  });
});

/**
 * ...and how navigation STARTS.
 *
 * The table is focusable precisely so a keyboard user can reach the navigation above - but every
 * key it acted on required a message to be selected ALREADY, and the only thing that selected one
 * was a mouse click. So a keyboard-only user could focus the table, press every key on it and never
 * select a row: the message details panel was unreachable without a pointer. Neither the tests above
 * nor e2e CS-26 noticed, because both seed the selection with a click first.
 */
describe("handleKeyDown starts navigating from no selection", () => {
  it.each(["ArrowDown", "j"])("selects the first message on %s", (key) => {
    expect(press(key, { selected: [] }).selectionUpdates).toEqual([[0]]);
  });

  it.each(["ArrowUp", "k"])("selects the last message on %s", (key) => {
    // Up from nothing means the end of the list, which is where a session that has been running
    // leaves the messages worth looking at.
    expect(press(key, { selected: [] }).selectionUpdates).toEqual([[2]]);
  });

  it("selects the first message on Enter", () => {
    expect(press("Enter", { selected: [] }).selectionUpdates).toEqual([[0]]);
  });

  it("swallows the Enter it acts on, and only that one", () => {
    // Swallow exactly what was acted on: an Enter pressed with a selection already in place is not
    // this handler's, and taking it would deny it to anything else on the page.
    expect(press("Enter", { selected: [] }).preventDefaultCalls).toBe(1);
    expect(press("Enter", { selected: [0] }).preventDefaultCalls).toBe(0);
  });

  it("scrolls the row it just selected into view", () => {
    // Selecting a row nobody can see is not selecting it: the table is virtualized, and the last
    // row of a long session is far off screen.
    expect(press("ArrowUp", { selected: [] }).scrolledTo).toEqual([{ index: 2, align: "end" }]);
    expect(press("ArrowDown", { selected: [] }).scrolledTo).toEqual([{ index: 0, align: "start" }]);
  });

  it("starts from a selection of several messages too", () => {
    // The same dead end: `!== 1` covered "none" and "many" alike.
    expect(press("ArrowDown", { selected: [1, 2] }).selectionUpdates).toEqual([[0]]);
  });

  it("does nothing at all when the table has no messages", () => {
    const got = press("ArrowDown", { selected: [], messages: [] });

    expect(got.selectionUpdates).toEqual([]);
    expect(got.scrolledTo).toEqual([]);
  });

  it("still lets Tab out of a table with nothing selected", () => {
    const got = press("Tab", { selected: [] });

    expect(got.preventDefaultCalls).toBe(0);
    expect(got.selectionUpdates).toEqual([]);
  });
});
