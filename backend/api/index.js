import { createApp } from '../src/app.js';

const appPromise = createApp();

export default async function handler(req, res) {
  const app = await appPromise;
  await app.ready();
  app.server.emit('request', req, res);
}
