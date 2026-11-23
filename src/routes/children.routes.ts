import { Router } from 'express';

import * as childrenController from '../controllers/children.controller';

// mergeParams: makes `:parentId` from the URL in routes/index.ts available here as well.
export const childRoutes = Router({ mergeParams: true });

childRoutes.get('/', childrenController.listChildren);
childRoutes.get('/:id', childrenController.getChild);
childRoutes.post('/', childrenController.createChild);
childRoutes.put('/:id', childrenController.updateChild);
childRoutes.delete('/:id', childrenController.deleteChild);
