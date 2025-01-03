import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB; // optional: name of your DB
const options = {};

if (!uri) {
  throw new Error('Please add your MONGODB_URI to your .env.local or .env file');
}

// Global variable in development to avoid re-instantiating
let client;
let clientPromise;
let cachedDb;

// If in dev mode, try to reuse the global promise
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production mode, no global variable
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}


export async function connectToDatabase() {
  const client = await clientPromise;

  if (cachedDb) {
    return { client, db: cachedDb };
  }

  const db = client.db(dbName);
  cachedDb = db;

  return { client, db };
}

export { clientPromise }; 