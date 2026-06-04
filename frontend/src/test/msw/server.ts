import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** MSW server used to mock the API in unit/viewmodel tests. */
export const server = setupServer(...handlers);
