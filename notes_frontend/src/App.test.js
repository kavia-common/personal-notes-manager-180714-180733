import { render, screen } from '@testing-library/react';
import App from './App';

test('renders navbar brand', () => {
  render(<App />);
  const brand = screen.getByText(/Notes/i);
  expect(brand).toBeInTheDocument();
});
