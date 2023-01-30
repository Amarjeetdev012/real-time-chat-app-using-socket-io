import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWTSECRET;

export const authenticateUser = (socket, next) => {
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
};
