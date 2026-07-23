import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useFocusTrap } from '../useFocusTrap';

function FocusTrapHarness() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, () => setOpen(false));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open archive dialog</button>
      {open && (
        <div ref={dialogRef} role="dialog" aria-label="Archive dialog">
          <button type="button" onClick={() => setOpen(false)}>Close archive dialog</button>
          <button type="button">Last action</button>
        </div>
      )}
    </>
  );
}

describe('useFocusTrap', () => {
  it('traps keyboard focus and restores the invoking control on close', async () => {
    const user = userEvent.setup();
    render(<FocusTrapHarness />);

    const opener = screen.getByRole('button', { name: 'Open archive dialog' });
    await user.click(opener);
    const close = screen.getByRole('button', { name: 'Close archive dialog' });
    const last = screen.getByRole('button', { name: 'Last action' });

    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
