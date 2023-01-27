import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { findId } from '../models/user.models.js';
dotenv.config();

const secret = process.env.JWTSECRET;

export const redirectRoom = async (req, res) => {
  try {
    const token = req.cookies.token;
    const room = req.query.rooms;
    if (!token) {
      return res.status(400).send({
        status: false,
        msg: 'your session has expired please login again',
      });
    }
    const data = jwt.verify(token, secret);
    const checkId = await findId(data._id);
    const username = checkId.username;
    if (!checkId) {
      return res.status(401).send({
        status: false,
        message: 'you are not a authorised person',
      });
    }
    const data = {}
    data.username = username
    data.room = room
    res.status(200).send({ status: true, msg='you have entered in room succesfully', data: data })
  } catch (error) {
    return res.status(500).send({ status: false, msg: err.message });
  }
}