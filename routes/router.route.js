import express from 'express';
import { redirectRoom } from '../controller/room.controller.js';
import { login, register } from '../controller/user.controller.js';

const router = express.Router();

router.get('/',(req,res)=>{
res.redirect('https://chat-app-socket-io-peach.vercel.app')
})
router.post('/login', login);
router.post('/register', register);
router.get('/rooms', redirectRoom);

export default router;
