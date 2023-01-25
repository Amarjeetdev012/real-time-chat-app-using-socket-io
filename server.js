import express, { urlencoded } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import router from './routes/router.route.js';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import cookieParser from 'cookie-parser';
import { connectDatabase } from './database/mongoose.database.js';
import {
  getRoomUsers,
  userJoin,
  userLeave,
  getCurrentUser,
} from './utils/user.utils.js';
import { formatMessage } from './utils/message.utils.js';

const app = express();
const httpServer = createServer(app);
app.use(cors());
app.use(express.json());
app.use(cookieParser())
app.set('view engine', 'ejs');
app.use(urlencoded({ extended: true }));
connectDatabase();
app.use('/', router);

// attached http server to the socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// const adminNameSpace = io.of('/admin');
// const userNameSpace = io.of('/');

// create a new connection
io.on('connection', (socket) => {
  // * show all rooms
  const allRooms = io.sockets.adapter.rooms;

  // create and join room
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);
    // Welcome current user
    socket.emit(
      'message',
      formatMessage(user.username, 'Welcome to ChatCord!')
    );
    // Broadcast all user when a user connects
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(`${user.username} has joined the chat`));
    // the 'roomUsers' event will be broadcast to all connected clients in the 'user.room' room Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

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
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const port = process.env.PORT || 3000;

httpServer.listen(3000, () => {
  console.log(`server is running on port ${port}`);
});
