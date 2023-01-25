import express from 'express';
import { redirectRoom } from '../controller/room.controller.js';
import { login, register } from '../controller/user.controller.js';

const router = express.Router();

router.get('/',(req,res)=>{
res.render('home')
})
router.post('/login', login);
router.post('/register', register);
router.get('/rooms', redirectRoom);

export default router;
