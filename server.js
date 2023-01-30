import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken'
import logger from 'morgan';
import MongoStore from 'connect-mongo';
import session from 'express-session';
import { createAdapter } from '@socket.io/mongo-adapter';
import { MongoClient } from 'mongodb';
import router from './routes/router.route.js';
import cors from 'cors';
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

const app = express();

const store = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  autoRemove: 'native',
});

const sessionMiddleware = session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 69600 },
  store: store,
});

app.use(sessionMiddleware);
const httpServer = createServer(app);
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));
connectDatabase();
app.use('/', router);

const DB = 'chatData';
const COLLECTION = 'socket.io-adapter-events';
const mongoClient = new MongoClient(process.env.MONGO_URI);
await mongoClient.connect();
const mongoCollection = mongoClient.db(DB).collection(COLLECTION);
await mongoCollection.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600, background: true }
);

// attached http server to the socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

// convert a connect middleware to a Socket.IO middleware
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
// authenticate user
io.use((socket, next) => {
  if (socket.handshake.query || socket.handshake.query.token) {
    jwt.verify(
      socket.handshake.query.token,
      jwtSecret,
      function (err, decoded) {
        if (err) return next(new Error('Authentication error if block'));
        socket.decoded = decoded;
        next();
        console.log('authenticated succesfully');
      }
    );
  } else {
    next(new Error('Authentication error else block'));
  }
});

io.adapter(
  createAdapter(mongoCollection, {
    addCreatedAtField: true,
  })
);

// create a new connection
io.on('connection', async (socket) => {
  console.log(`User connected ${socket.id}`);
  console.log(`total connected clients ${io.engine.clientsCount}`);
  // create and join room
  socket.on('joinRoom', async (username, room) => {
    console.log('username', username, 'room', room);
    const user = userJoin(socket.id, username, room);
    console.log('join room user', user);
    socket.join(user.room);
    await createRoom(user.room, user.username);
    // Welcome current user
    socket.emit(
      'message',
      formatMessage(user.username, 'Welcome to ChatCord!')
    );
    // Broadcast all user when a user connects
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(user.username, `has joined the chat`));
    // the 'roomUsers' event will be broadcast to all connected clients in the 'user.room' room Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  const allRoomsData = await allRooms();
  console.log('allRoomsData', allRoomsData);
  socket.emit('allRooms', allRoomsData);

  // Listen for chatMessage
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    console.log('user', user);
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

const port = process.env.PORT || 3000;

httpServer.listen(3000, () => {
  console.log(`server is running on port ${port}`);
});
