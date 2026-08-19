import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

function rootDir() {
  return path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
}

export const localDriver = {
  async put({ key, body }) {
    const full = path.join(rootDir(), key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return { key };
  },

  async getBuffer(key) {
    return fs.readFile(path.join(rootDir(), key));
  },

  async getSignedUrl() {
    return null;
  },
};
