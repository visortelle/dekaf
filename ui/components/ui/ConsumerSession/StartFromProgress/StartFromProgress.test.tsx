/**
 * @jest-environment jsdom
 *
 * The panel shown while a large "skip first n messages" is being resolved. Skipping n messages
 * exactly costs O(n) - Pulsar keeps no message-ordinal index - so a very large n genuinely takes
 * time, and without this the session looks frozen on "Awaiting for new messages...".
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import StartFromProgress from './StartFromProgress';

describe('StartFromProgress', () => {
  it('says what is happening and how far along it is', () => {
    render(<StartFromProgress progress={{ messagesSkipped: 2_500_000, messagesToSkip: 10_000_000 }} />);

    const panel = screen.getByTestId('cs-start-from-progress');
    expect(panel.textContent).toMatch(/skipping/i);
    // Both counts must be legible, and the reader must be able to see it is moving.
    expect(panel.textContent).toContain('2,500,000');
    expect(panel.textContent).toContain('10,000,000');
    expect(panel.textContent).toContain('25%');
  });

  it('drives a real progress indicator, not just text', () => {
    render(<StartFromProgress progress={{ messagesSkipped: 2_500_000, messagesToSkip: 10_000_000 }} />);

    const bar = screen.getByTestId('cs-start-from-progress-bar');
    expect(bar.getAttribute('value')).toBe('2500000');
    expect(bar.getAttribute('max')).toBe('10000000');
  });

  it('does not present entry position as an equivalent message-count position', () => {
    render(<StartFromProgress progress={{ messagesSkipped: 2_500_000, messagesToSkip: 10_000_000 }} />);

    const panel = screen.getByTestId('cs-start-from-progress');
    expect(panel.textContent).toContain('based on retained entries, not message count');
    expect(panel.textContent).not.toContain('roughly the same place');
  });

  it('exposes the raw counts for e2e, so a test does not have to parse prose', () => {
    render(<StartFromProgress progress={{ messagesSkipped: 3_000_000, messagesToSkip: 4_000_000 }} />);

    const panel = screen.getByTestId('cs-start-from-progress');
    expect(panel.getAttribute('data-cs-skipped')).toBe('3000000');
    expect(panel.getAttribute('data-cs-to-skip')).toBe('4000000');
    expect(panel.getAttribute('data-cs-percent')).toBe('75');
  });

  it('survives a zero total instead of rendering NaN%', () => {
    // The server should never send this, but a divide-by-zero here would put "NaN%" on screen.
    render(<StartFromProgress progress={{ messagesSkipped: 0, messagesToSkip: 0 }} />);

    const panel = screen.getByTestId('cs-start-from-progress');
    expect(panel.getAttribute('data-cs-percent')).toBe('0');
    expect(panel.textContent).not.toContain('NaN');
  });

  it('never claims more than 100%', () => {
    render(<StartFromProgress progress={{ messagesSkipped: 12, messagesToSkip: 10 }} />);

    expect(screen.getByTestId('cs-start-from-progress').getAttribute('data-cs-percent')).toBe('100');
  });
});
