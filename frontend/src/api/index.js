// frontend/src/api/index.js
import { getToken, saveToken, clearToken } from './client.js';
import * as auth from './auth.js';
import * as items from './items.js';
import * as containers from './containers.js';
import * as stock from './stock.js';
import * as usage from './usage.js';
import * as emoney from './emoney.js';
import * as admin from './admin.js';

export const api = {
  ...auth,
  ...items,
  ...containers,
  ...stock,
  ...usage,
  ...emoney,
  ...admin
};

export { getToken, saveToken, clearToken };
export default api;
