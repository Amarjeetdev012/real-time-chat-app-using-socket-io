const users = [];

// Join user to chat
export const userJoin = (id, username, room) => {
  const user = { id, username, room };
  users.push(user);
  console.log('joined users ', users);
  return user;
};

// all users
export const allUsers = () => {
  return users;
};

// Get current user
export const getCurrentUser = (id) => {
  return users.find((user) => user.id === id);
};

// User leaves chat
export const userLeave = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1);
  }
};

// Get room users
export const getRoomUsers = (room) => {
  return users.filter((user) => user.room === room);
};
