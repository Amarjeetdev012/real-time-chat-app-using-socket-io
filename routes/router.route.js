import express from 'express';
import { chatRoom } from '../controller/room.controller.js';
import { login, register } from '../controller/user.controller.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/rooms', chatRoom);

export default router;
