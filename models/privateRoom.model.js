import mongoose from 'mongoose';

const privateRoomSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    allowedUser: {
      type: String,
    },
  },
  { timestamps: true }
);

const PrivateUser = mongoose.model('privateRoomUser', privateRoomSchema);

export const createAllowedUser = async (data) => {
  return await PrivateUser.create(data);
};

export const validUser = async (username, allowedUser) => {
  return await PrivateUser.findOne(
    { username: username },
    { allowedUser: allowedUser }
  );
};
