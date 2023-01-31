import dotenv from 'dotenv';
import { findRoom } from '../models/room.model.js';
dotenv.config();

const secret = process.env.JWTSECRET;

export const chatRoom = async (req, res) => {
  try {
    const room = req.query.rooms;
    const finddata = await findRoom(room);
   if(finddata) {
    return res.status(400).send({status:false,message:'room is already registered'})
   }
    res.status(200).json({
      status: true,
      msg: 'you have entered in room succesfully',
      data: data,
    });
  } catch (error) {
    return res.status(500).send({ status: false, msg: err.message });
  }
};
