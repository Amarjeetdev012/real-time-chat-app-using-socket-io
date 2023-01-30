import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.model('Users', userSchema);

export const findUsername = async (username) => {
  return await User.findOne({ username: username });
};

export const findEmail = async (email) => {
  return await User.findOne({ email: email });
};

export const createUser = async (email, username, password) => {
  const data = {};
  data.email = email;
  data.username = username;
  data.password = password;
  await User.create(data);
  delete data.password;
  return data;
};

export const findData = async (id) => {
  return await User.find({ id: id });
};

export const findId = async (id) => {
  return await User.findById(id);
};
