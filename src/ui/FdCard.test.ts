import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FdCard } from './FdCard';

describe('FdCard', () => {
  it('uses a unique input id for each mounted card', () => {
    const markup = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(FdCard, { cash: 1_00_000, target: 2_00_000, onTransfer: vi.fn() }),
        createElement(FdCard, { cash: 1_00_000, target: 2_00_000, onTransfer: vi.fn() }),
      ),
    );
    const inputIds = [...markup.matchAll(/<input id="([^"]+)"/g)].map((match) => match[1]);
    const labelTargets = [...markup.matchAll(/<label[^>]+for="([^"]+)"/g)].map((match) => match[1]);

    expect(inputIds).toHaveLength(2);
    expect(new Set(inputIds)).toHaveLength(2);
    expect(labelTargets).toEqual(inputIds);
  });
});
