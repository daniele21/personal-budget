import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from '../BrandMark';

describe('BrandMark', () => {
  it('uses square, contain-fitted assets for the compact app mark', () => {
    const { container } = render(<BrandMark wordmark={false} />);
    const images = Array.from(container.querySelectorAll('img'));

    expect(images.map((image) => image.getAttribute('src'))).toEqual([
      '/aura-mark-light.png',
      '/aura-mark-dark.png',
    ]);
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toHaveClass('object-contain');
      expect(image).not.toHaveClass('object-cover');
    }
  });
});
