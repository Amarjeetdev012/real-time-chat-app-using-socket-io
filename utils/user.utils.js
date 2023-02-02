const users = [];

// Join user to chat
export const userJoin = (id, username, room) => {
  const user = { id, username, room };
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) {
    users.push(user);
  }
  console.log('joined users ', users);
  return user;
};

// Get room users
export const getRoomUsers = (room) => {
  const data = users.filter((user) => user.room === room);
  return data;
};

// User leaves chat
export const userLeave = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1);
  }
};
