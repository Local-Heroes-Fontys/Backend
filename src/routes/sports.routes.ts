import { Router } from 'express';

import { listSports } from '../controllers/sports.controller';

export const sportRoutes = Router();

sportRoutes.get('/', listSports);
