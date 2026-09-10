import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { CadeauRegion } from '@client/ecrans/EcranRecompense';

afterEach(cleanup);

it('ouvre le cadeau exact, puis le referme sans modifier son illustration', () => {
  render(<CadeauRegion titre="Filou" annonce="Filou rejoint ta bande !"
    illustration={<img src="/assets/compagnons/filou.png" alt="Filou" />} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Filou rejoint ta bande !' }));
  const fenetre = screen.getByRole('dialog');
  expect(within(fenetre).getByRole('img', { name: 'Filou' }).getAttribute('src'))
    .toBe('/assets/compagnons/filou.png');
  expect(within(fenetre).getByRole('heading').textContent).toBe('Filou');
  fireEvent(fenetre, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Filou rejoint ta bande !' })).toBeTruthy();
});
