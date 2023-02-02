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
import { getRoomUsers, userJoin, userLeave } from './utils/user.utils.js';
import {
  createUser,
  findUser,
  verifyUser,
} from './models/privateRoom.model.js';

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

io.of('/private').use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentication error no token'));
  } else {
    console.log('token', token);
    jwt.verify(token, jwtSecret, function (err, decoded) {
      if (err)
        return next(
          new Error('Authentication error token expired please login again')
        );
      else {
        socket.username = decoded.username;
        socket.userId = uuidv4();
      }
      next();
      console.log('authenticated succesfully');
    });
  }
});

// create a new connection
io.on('connection', async (socket) => {
  console.log(`User connected ${socket.id}`);

  // join room public
  socket.on('joinRoom', async (username, room) => {
    const user = userJoin(socket.id, username, room);
    console.log('user===', user);
    const roomData = await findRoom(room);
    if (!roomData) {
      await createRoom(user.room, user.username);
    }
    socket.join(user.room);
    // Welcome current user
    socket.emit(
      'message',
      formatMessage(user.username, 'Welcome to ChatBoard!')
    );

    // Broadcast all user when a user connects but this user have not get this data
    socket.broadcast
      .to(user.room)
      .emit('info', formatMessage(user.username, `has joined the chat`));
  });
  // send and get message in public room
  socket.on('new message', (room, message, name) => {
    console.log('room, message, name', room, message, name);
    io.to(room).emit('new message', {
      message: message,
      name: name,
    });
  });
  socket.on('getroominfo', (room) => {
    console.log('room', room);
    socket.emit('allUser', getRoomUsers(room));
  });

  // one to one message with authenticated users
  socket.on('directmessage', (msg) => {
    io.emit('directmessage', { message: msg, user: socket.username });
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
    console.log(`user disconnected ${socket.id}`);
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit(
        'dissconnectmessage',
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

// create channel roomspace
const namespace = io.of('/private');
namespace.on('connection', async (socket) => {
  console.log('user connected private');
  const verifyusername = await verifyUser(socket.username);
  console.log('verifyusername', verifyusername);
  if (!verifyusername) {
    // handling error we can use exception
    socket.emit('exception', {
      errorMessage:
        'authentication error user is not allowed to enter this channel',
    });
  }
  // join room
  socket.on('privateRoom', async (admin, allowedUser, room) => {
    const user = userJoin(socket.id, allowedUser, room);
    const findUsers = await findUser(admin, allowedUser, room);
    if (findUsers[0].admin) {
      socket.on('addUser', async (allowedUser) => {
        const findUsers = await findUser(admin, allowedUser);
        console.log('findUsers========', findUsers);
        if (!findUsers.length > 0) {
          await createUser(admin, allowedUser, room);
        }
      });
    }

    const validallowedUser = await findUser(admin, allowedUser);
    if (validallowedUser.length > 0) {
      socket.join(room);
      socket.emit('success', `You have joined the room: ${room}`);
      namespace
        .to(room)
        .emit('new user', `A new user has joined the room: ${room}`);
      socket.on('private message', (msg, room) => {
        console.log('msg======', msg);
        namespace.to(room).emit('private message', msg);
      });
      socket.on('leaveRoom', (room) => {
        socket.leave(room);
      });
    } else {
      return new Error('Authentication error private room message');
    }
  });
  socket.on('disconnect', () => {
    console.log('Private namespace: Client disconnected');
  });
});

const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
