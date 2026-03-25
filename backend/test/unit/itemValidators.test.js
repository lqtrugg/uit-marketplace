import { describe, expect, it } from 'vitest';
import { sanitizeItemInput } from '../../src/services/itemService.js';

function getValidInput(overrides = {}) {
  return {
    itemName: 'MacBook Pro 14',
    description: 'Very good condition',
    durationDays: 3,
    durationHours: 4,
    wardCode: 26734,
    reasonForSelling: 'Need upgrade',
    price: '20000000',
    negotiable: 'Yes',
    conditionLabel: 'Good',
    delivery: 'Meetup',
    imageUrls: ['/images/item-1.jpg'],
    videoUrls: [],
    ...overrides
  };
}

describe('sanitizeItemInput', () => {
  it('accepts valid payload', () => {
    const result = sanitizeItemInput(getValidInput());

    expect(result.error).toBe('');
    expect(result.payload).toBeTruthy();
    expect(result.payload.itemName).toBe('MacBook Pro 14');
    expect(result.payload.postToMarketplace).toBe(true);
  });

  it('rejects missing item name', () => {
    const result = sanitizeItemInput(getValidInput({ itemName: '   ' }));

    expect(result.error).toBe('Item name is required.');
    expect(result.payload).toBeNull();
  });

  it('rejects invalid duration (both zero)', () => {
    const result = sanitizeItemInput(getValidInput({ durationDays: 0, durationHours: 0 }));

    expect(result.error).toBe('Duration must be greater than 0 hour.');
    expect(result.payload).toBeNull();
  });

  it('supports legacy aliases for reason/condition/delivery', () => {
    const result = sanitizeItemInput(
      getValidInput({
        reasonForSelling: undefined,
        conditionLabel: undefined,
        delivery: undefined,
        reason: 'Switching laptop',
        condition: 'Like New',
        selfPickup: 'Shipping COD'
      })
    );

    expect(result.error).toBe('');
    expect(result.payload).toBeTruthy();
    expect(result.payload.reasonForSelling).toBe('Switching laptop');
    expect(result.payload.conditionLabel).toBe('Like New');
    expect(result.payload.delivery).toBe('Shipping COD');
  });

  it('rejects invalid image URL format', () => {
    const result = sanitizeItemInput(
      getValidInput({
        imageUrls: ['ftp://file.example.com/item.jpg']
      })
    );

    expect(result.error).toBe('Each image URL must start with http://, https:// or /.');
    expect(result.payload).toBeNull();
  });
});
