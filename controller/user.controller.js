import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();
import { createUser, findEmail, findUsername } from '../models/user.models.js';

const jwtSecret = process.env.JWTSECRET;

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await findUsername(username);
    if (!user)
      return res.status(400).send({ status: false, msg: 'Incorrect Username' });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res
        .status(400)
        .send({ status: false, msg: 'Incorrect  Password' });
    const data = {};
    data.id = user._id;
    data.username = user.username;
    const token = jwt.sign(data, jwtSecret, { expiresIn: '1h' });
    return res.status(200).json({
      status: true,
      msg: 'you are login succesfully',
      data: token,
    });
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message });
  }
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const usernameCheck = await findUsername(username);
    if (usernameCheck)
      return res
        .status(400)
        .send({ status: false, msg: 'Username already used' });
    const emailCheck = await findEmail(email);
    if (emailCheck)
      return res.status(400).send({ status: false, msg: 'Email already used' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, username, hashedPassword);
    return res.status(201).json({
      status: true,
      msg: 'you are registered succesfully',
      data: user,
    });
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message });
  }
};
