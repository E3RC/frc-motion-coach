import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import SplashScreen from '../components/SplashScreen';

describe('SplashScreen', () => {
  it('renders and auto-dismisses', async () => {
    vi.useFakeTimers();
    const { container } = render(<SplashScreen />);
    expect(container.querySelector('[data-testid="splash"]')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector('[data-testid="splash"]')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
