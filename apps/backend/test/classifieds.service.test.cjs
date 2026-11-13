const assert = require('node:assert/strict');
const { test } = require('node:test');
const { BadRequestException, ConflictException, NotFoundException } = require('@nestjs/common');
const { ClassifiedsService } = require('../dist/src/classifieds/classifieds.service.js');

const noDatabase = new Proxy({}, { get() { throw new Error('Unexpected database access'); } });

test('classified search rejects inverted price ranges before database access', async () => {
  const service = new ClassifiedsService(noDatabase);
  await assert.rejects(service.search({ minPricePaise: 9000, maxPricePaise: 5000 }), BadRequestException);
});

test('classified creation requires an active category', async () => {
  let created = false;
  const service = new ClassifiedsService({ category: { findFirst: async () => null }, classifiedListing: { create: async () => { created = true; } } });
  await assert.rejects(service.create('seller-1', { categoryId: 'missing', title: 'Old bicycle', description: 'A well-maintained bicycle in good condition.', pricePaise: 120000, condition: 'GOOD', locality: 'Nagoa', photoUrls: ['https://images.example.test/bike.jpg'] }), NotFoundException);
  assert.equal(created, false);
});

test('seller cannot remove another user’s listing', async () => {
  let updated = false;
  const service = new ClassifiedsService({
    classifiedListing: {
      findFirst: async ({ where }) => where.sellerId === 'seller-2' ? ({ id: 'listing-1', sellerId: 'seller-2', status: 'ACTIVE' }) : null,
      update: async () => { updated = true; },
    },
  });
  await assert.rejects(service.remove('seller-1', 'listing-1'), NotFoundException);
  assert.equal(updated, false);
});

test('expired listing cannot be resumed without renewal', async () => {
  let updated = false;
  const service = new ClassifiedsService({
    classifiedListing: {
      findFirst: async () => ({ id: 'listing-1', sellerId: 'seller-1', status: 'EXPIRED', expiresAt: new Date(Date.now() - 60_000) }),
      update: async () => { updated = true; },
    },
  });
  await assert.rejects(service.setStatus('seller-1', 'listing-1', 'ACTIVE'), ConflictException);
  assert.equal(updated, false);
});

test('new classified listing is persisted with a 30-day expiry', async () => {
  let createInput;
  const now = Date.now();
  const service = new ClassifiedsService({
    category: { findFirst: async () => ({ id: 'category-1' }) },
    classifiedListing: { create: async ({ data }) => { createInput = data; return data; } },
  });
  await service.create('seller-1', { categoryId: 'category-1', title: 'Used camera', description: 'A camera in good working condition with a case.', pricePaise: 1500000, condition: 'GOOD', locality: 'Diu Town', photoUrls: ['https://images.example.test/camera.jpg'] });
  assert.equal(createInput.sellerId, 'seller-1');
  assert.equal(createInput.status, undefined);
  const daysUntilExpiry = Math.round((createInput.expiresAt.getTime() - now) / 86_400_000);
  assert.equal(daysUntilExpiry, 30);
});
