const users = [];

// Join user to chat
export const userJoin = (id, username, room) => {
  const user = { id, username, room };
  users.push(user);
  console.log('userJoin', users)
  return user;
};

// Get current user
export const getCurrentUser = (id) => {
  return users.find((user) => user.id === id);
};

// User leaves chat
export const userLeave = (id) => {
  const index = users.findIndex((user) => user.id === id);
  console.log('userLeave index', index);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

// Get room users
export const getRoomUsers = (room) => {
  return users.filter((user) => user.room === room);
};
