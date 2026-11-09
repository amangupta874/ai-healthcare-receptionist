import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { app } from './app';
import { logger } from './lib/logger';

const PORT = process.env.BACKEND_PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 Express backend server listening on http://localhost:${PORT}`);
});

