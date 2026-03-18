import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserEntity } from '../entities/UserEntity.js';
import { SessionEntity } from '../entities/SessionEntity.js';
import { PostEntity } from '../entities/PostEntity.js';

function getConnectionUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function getOrCreateDataSource() {
  const globalStore = globalThis;

  if (!globalStore.__socialDataSource) {
    const connectionUrl = getConnectionUrl();

    if (!connectionUrl) {
      throw new Error('Missing DATABASE_URL (or POSTGRES_URL).');
    }

    globalStore.__socialDataSource = new DataSource({
      type: 'postgres',
      url: connectionUrl,
      entities: [UserEntity, SessionEntity, PostEntity],
      synchronize: true,
      logging: false
    });
  }

  return globalStore.__socialDataSource;
}

export async function getDataSource() {
  const globalStore = globalThis;
  const dataSource = getOrCreateDataSource();

  if (dataSource.isInitialized) {
    return dataSource;
  }

  if (!globalStore.__socialDataSourceInitPromise) {
    globalStore.__socialDataSourceInitPromise = dataSource.initialize().catch((error) => {
      globalStore.__socialDataSourceInitPromise = null;
      throw error;
    });
  }

  await globalStore.__socialDataSourceInitPromise;
  return dataSource;
}
