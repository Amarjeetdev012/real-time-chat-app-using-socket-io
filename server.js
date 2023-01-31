import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import router from './routes/router.route.js';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import { connectDatabase } from './database/mongoose.database.js';
import { formatMessage } from './utils/message.utils.js';
import { allRooms, createRoom } from './models/room.model.js';
import {
  getRoomUsers,
  userJoin,
  userLeave,
  getCurrentUser,
} from './utils/user.utils.js';
import { validUser } from './models/privateRoom.model.js';

const app = express();

const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));
app.use(cors());
connectDatabase();
app.use('/', router);

// attached http server to the socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const jwtSecret = process.env.JWTSECRET;
// authenticate user
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error no token provided'));
  } else {
    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded) return next(new Error('Authentication error decoded token'));
    socket.username = decoded.username;
    socket.userId = uuidv4();
    next();
    console.log('authenticated succesfully');
  }
});

// create a new connection
io.on('connection', async (socket) => {
  console.log(`User connected ${socket.id}`);
  // join room
  socket.on('joinRoom', async (username, room) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);
    await createRoom(user.room, user.username);
    // Welcome current user
    socket.emit(
      'message',
      formatMessage(user.username, 'Welcome to ChatBoard!')
    );
    // Broadcast all user when a user connects but this user have not get this data
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(user.username, `has joined the chat`));
    // the 'roomUsers' event will be broadcast to all connected clients in the 'user.room' room Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  socket.on('privateRoom', async (admin, allowedUser, room) => {
    const user = userJoin(socket.id, allowedUser, room);
    const validallowedUser = await validUser(admin, allowedUser);
    if (validallowedUser) {
      socket.join(room);

    } else {
      return (new Error('Authentication error decoded token'));
    }
  });
  const allRoomsData = await allRooms();
  socket.emit('allRooms', allRoomsData);

  // Listen for chatMessage
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(`${user.username} has left the chat`)
      );
      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
