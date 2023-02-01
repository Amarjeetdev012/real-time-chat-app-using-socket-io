import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Room = mongoose.model('rooms', roomSchema);

export const createRoom = async (roomname, username) => {
  const data = {};
  data.userName = username;
  data.roomName = roomname;
  const result = await Room.create(data);
  console.log('result====', result);
  return result;
};

export const allRooms = async () => {
  return await Room.find();
};

export const findRoom = async (roomName) => {
  const data = await Room.findOne({ roomName: roomName });
  return data;
};
