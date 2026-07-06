import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FieldOverlay from '../field/FieldOverlay';

describe('FieldOverlay', () => {
  it('renders canvas element', () => {
    const { container } = render(
      <FieldOverlay path={[]} currentPos={null} width={27} height={27} />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders with path data', () => {
    const path = [{ x: 5, y: 5 }, { x: 10, y: 10 }];
    const { container } = render(
      <FieldOverlay path={path} currentPos={null} width={27} height={27} />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders with current position', () => {
    const { container } = render(
      <FieldOverlay path={[]} currentPos={{ x: 13.5, y: 13.5 }} width={27} height={27} />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
