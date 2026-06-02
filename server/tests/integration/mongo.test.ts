import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  connectMongo,
  disconnectMongo,
  isMongoHealthy,
} from '@shared/infrastructure/database/mongo';

describe('Mongo connection (integration)', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongod.stop();
  });

  it('reports healthy once connected', () => {
    expect(isMongoHealthy()).toBe(true);
  });

  it('persists and reads back a document', async () => {
    const Widget = mongoose.model('Widget', new mongoose.Schema({ name: String }));

    const created = await Widget.create({ name: 'reelo' });
    const found = await Widget.findById(created._id).lean();

    expect(found?.name).toBe('reelo');
  });
});
