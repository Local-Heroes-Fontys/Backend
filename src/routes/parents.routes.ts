import { Router } from 'express';

import * as parentsController from '../controllers/parents.controller';

export const parentRoutes = Router();

// Public: this is how a parent creates an account.
parentRoutes.post('/', parentsController.registerParent);
