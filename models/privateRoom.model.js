import mongoose from 'mongoose';

const privateRoomSchema = new mongoose.Schema(
  {
    admin: {
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

export const validUser = async (admin, allowedUser) => {
  return await PrivateUser.find({
    $and: [{ admin: admin }, { allowedUser: allowedUser }],
  });
};

export const findUser = async (admin, allowedUser) => {
  return await PrivateUser.find({
    $and: [{ admin: admin }, { allowedUser: allowedUser }],
  });
};

export const createUser = async (admin, allowedUser) => {
  const data = {};
  data.admin = admin;
  data.allowedUser = allowedUser;
  return await PrivateUser.create(data);
};
