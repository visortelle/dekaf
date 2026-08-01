/**
 * @jest-environment jsdom
 */
import { defaultValue } from './Notifications';

// Four call sites do `const res = await call().catch(err => notifyError(...))` and then branch on
// `res === undefined`. That guard is only sound if the notifier genuinely returns undefined.
//
// These were once bare arrows returning `toast.*(...)`, i.e. react-toastify's Id. TypeScript allows a
// value-returning function where `=> void` is declared, so the compiler could not catch it, and the
// consequence showed up far away: `res` held a toast id, the undefined check passed straight through,
// and the next line threw "res.getStatus is not a function" - crashing the component instead of
// showing the error it was trying to report.
//
// Asserted directly because the end-to-end symptom is timing-dependent and an unreliable detector:
// with the bug reintroduced a full jest run still reported 217 passed while logging the TypeError.
describe('notification helpers return void', () => {
  const notifiers = [
    ['notifySuccess', defaultValue.notifySuccess],
    ['notifyInfo', defaultValue.notifyInfo],
    ['notifyWarn', defaultValue.notifyWarn],
    ['notifyError', defaultValue.notifyError],
  ] as const;

  it.each(notifiers)('%s returns undefined so `res === undefined` guards hold', (_name, notify) => {
    expect(notify('a message')).toBeUndefined();
  });
});
