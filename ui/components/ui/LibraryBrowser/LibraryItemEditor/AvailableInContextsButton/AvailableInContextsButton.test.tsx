/**
 * @jest-environment jsdom
 *
 * BUG-7 regression: the "Available in Contexts" dialog's Confirm must close the modal (it used to
 * apply the change but leave the modal open - only Cancel closed it). The fix lives in the button's
 * onChange wrapper (`props.onChange(v); modals.pop()`), so the dialog is mocked to a Confirm button
 * and the assertion is on the real Modals stack.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import AvailableInContextsButton from './AvailableInContextsButton';

// Replace the heavy dialog (ResourceMatchersInput etc.) with a Confirm button that fires onChange.
jest.mock('./AvailableInContextsDialog/AvailableInContextsDialog', () => ({
  __esModule: true,
  default: (props: { onChange: (v: unknown[]) => void }) => (
    <button data-testid="mock-confirm" onClick={() => props.onChange([])}>confirm</button>
  ),
}));

describe('BUG-7: Available-in-Contexts Confirm closes the modal', () => {
  it('pops the modal on Confirm', async () => {
    const onChange = jest.fn();
    render(
      <MemoryRouter>
        <Modals.DefaultProvider>
          <AvailableInContextsButton value={[]} onChange={onChange} libraryContext={{} as never} />
        </Modals.DefaultProvider>
      </MemoryRouter>
    );

    // No modal yet; open it via the trigger button.
    expect(screen.queryByTestId('modal')).toBeNull();
    fireEvent.click(screen.getByText(/Available in 0 contexts/));
    expect(screen.getByTestId('modal')).toBeTruthy();

    // Confirm must apply the change AND close the modal.
    fireEvent.click(screen.getByTestId('mock-confirm'));
    expect(onChange).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('modal')).toBeNull());
  });
});
