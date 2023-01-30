import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
      unique: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const Room = mongoose.model('rooms', roomSchema);

export const createRoom = async (roomName, username) => {
  const data = {};
  data.roomName = roomName;
  data.username = username;
  await Room.create(data);
  return data;
};

export const allRooms = async () => {
  return await Room.find();
};
