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
import { allRooms, createRoom, findRoom } from './models/room.model.js';
import {
  getRoomUsers,
  userJoin,
  userLeave,
  allUsers,
} from './utils/user.utils.js';
import { createUser, findUser, validUser } from './models/privateRoom.model.js';
import { channel } from 'diagnostics_channel';

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

// const jwtSecret = process.env.JWTSECRET;
// authenticate user
// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;
//   if (!token) {
//     return next(new Error('Authentication error no token provided'));
//   } else {
//     const decoded = jwt.verify(token, jwtSecret);
//     if (!decoded) return next(new Error('Authentication error decoded token'));
//     socket.username = decoded.username;
//     socket.userId = uuidv4();
//     next();
//     console.log('authenticated succesfully');
//   }
// });

// create a new connection
io.on('connection', async (socket) => {
  console.log(`User connected ${socket.id}`);

  // join room public
  socket.on('joinRoom', async (username, room) => {
    const user = userJoin(socket.id, username, room);
    const roomData = await findRoom(user.room);
    if (!roomData) {
      await createRoom(user.room, user.username);
    }
    socket.join(user.room);
    console.log('new joined user', user);

    // Welcome current user
    socket.emit(
      'message',
      formatMessage(user.username, 'Welcome to ChatBoard!')
    );

    // Broadcast all user when a user connects but this user have not get this data
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(user.username, `has joined the chat`));
  });

  // send and get message in public room
  socket.on('new message', (room, message, name) => {
    console.log('msg=====', message);
    console.log('room===', room);
    console.log('name====', name);
    io.to(room).emit('new message', {
      message: message,
      name: name,
    });
  });

  // connected all users
  const allUser = allUsers();
  socket.emit('allUser', allUser);

  // one to one message with authenticated users
  socket.on('message', (msg) => {
    io.emit('message', { message: msg, user: socket.username });
  });

  // private room message
  socket.on('privateRoom', async (admin, allowedUser, room) => {
    const user = userJoin(socket.id, allowedUser, room);
    const validallowedUser = await validUser(admin, allowedUser);
    if (validallowedUser.length > 0) {
      socket.join(room);
      socket.on('private message', (msg) => {
        io.to(room).emit('private message', msg);
      });
    } else {
      return new Error('Authentication error private room message');
    }
  });

  const allRoomsData = await allRooms();
  socket.emit('allRooms', allRoomsData);

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

  // create dynamic roomspace
  socket.on('create namespace', (name) => {
    const namespace = io.of(`/${name}`);
    namespace.on('connection', (nsSocket) => {
      // join room
      nsSocket.on('privateRoom', async (admin, allowedUser, room) => {
        const user = userJoin(nsSocket.id, allowedUser, room);
        nsSocket.on('addUser',async(allowedUser)=>{
          const findUsers = await findUser(admin, allowedUser)
          if(!findUsers.length>0){
            await createUser(admin, allowedUser)
          }
        })
        const validallowedUser = await validUser(admin, allowedUser);
        if (validallowedUser.length > 0) {
          nsSocket.join(room);
          nsSocket.emit('success', `You have joined the room: ${room}`);
          namespace
            .to(room)
            .emit('new user', `A new user has joined the room: ${room}`);
          nsSocket.on('private message', (msg) => {
            io.to(room).emit('private message', msg);
          });
          nsSocket.on('leaveRoom', (room) => {
            nsSocket.leave(room);
          });
        } else {
          return new Error('Authentication error private room message');
        }
      });
      nsSocket.on('disconnect', () => {
        console.log('Private namespace: Client disconnected');
      });
    });
  });
});

const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
