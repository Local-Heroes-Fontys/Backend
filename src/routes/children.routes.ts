import { Router } from 'express';

import * as childrenController from '../controllers/children.controller';
import { requireParent } from '../middleware/requireParent';

export const childRoutes = Router();

// Children are private: every route here requires a logged-in parent.
childRoutes.post('/', requireParent, childrenController.createChild);
