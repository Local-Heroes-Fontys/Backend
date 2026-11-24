import { Router } from 'express';

import * as clubsController from '../controllers/clubs.controller';
import { requireClubRepresentative } from '../middleware/requireClubRepresentative';

export const clubRoutes = Router();

// Reading is public. Registering is public too: it creates the club and its first representative.
clubRoutes.get('/', clubsController.listClubs);
clubRoutes.get('/:id', clubsController.getClub);
clubRoutes.post('/', clubsController.registerClub);

// Only a representative of the club itself may change it. Ownership is checked in the service.
clubRoutes.put('/:id', requireClubRepresentative, clubsController.updateClub);
