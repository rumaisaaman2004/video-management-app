import { getPageItems } from './pagination.js';

describe('getPageItems', () => {
  it('lists every page when there are few', () => {
    expect(getPageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses distant pages into ellipses around the current page', () => {
    expect(getPageItems(10, 20)).toEqual([1, 'start-ellipsis', 9, 10, 11, 'end-ellipsis', 20]);
  });

  it('shows a page instead of an ellipsis that would hide only that page', () => {
    expect(getPageItems(4, 20)).toEqual([1, 2, 3, 4, 5, 'end-ellipsis', 20]);
    expect(getPageItems(17, 20)).toEqual([1, 'start-ellipsis', 16, 17, 18, 19, 20]);
  });

  it('handles the first and last page', () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 'end-ellipsis', 20]);
    expect(getPageItems(20, 20)).toEqual([1, 'start-ellipsis', 19, 20]);
  });
});
