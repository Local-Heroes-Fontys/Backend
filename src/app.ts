import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { apiRoutes } from './routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api', apiRoutes);

// These must stay last, so they only run when nothing above handled the request.
app.use(notFound);
app.use(errorHandler);
