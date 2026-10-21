import { MongoMemoryServer } from 'mongodb-memory-server';

export interface TestMongo {
  uri: string;
  stop: () => Promise<void>;
}

/**
 * Starts a throwaway MongoDB for a test suite. Set MONGO_TEST_URI to reuse an
 * existing server instead (each suite gets its own database), or
 * MONGOMS_SYSTEM_BINARY to point mongodb-memory-server at a local mongod.
 */
export async function startTestMongo(suite: string): Promise<TestMongo> {
  const external = process.env.MONGO_TEST_URI;
  const dbName = `district8_test_${suite}_${process.pid}`;
  if (external) {
    const base = external.replace(/\/[^/]*$/, '');
    return { uri: `${base}/${dbName}`, stop: () => Promise.resolve() };
  }
  const server = await MongoMemoryServer.create();
  return {
    uri: server.getUri(dbName),
    stop: async () => {
      await server.stop();
    },
  };
}
