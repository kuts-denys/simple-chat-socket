const { users, usersById } = require('./usersList');
const uniqid = require('uniqid');

function checkIfUserExists(nickname) {
  let exists = false;
  usersById.forEach((userId) => {
    if (users[userId].nickname === nickname) exists = true;
  });
  return exists;
}

function findUserByNickname(nickname) {
  let user;
  usersById.forEach((userId) => {
    if (users[userId].nickname === nickname) user = users[userId];
  });
  return user;
}

function createUser({ name, nickname }) {
  const id = uniqid();
  const userExists = checkIfUserExists(nickname);
  if (userExists) return false;
  users[id] = {
    name,
    nickname,
    status: 'recent',
  };
  usersById.push(id);
  return id;
}

function changeUserStatus(nickname, status) {
  usersById.forEach((userId) => {
    if (users[userId].nickname === nickname) {
      users[userId].status = status;
    }
  });
}

function findAllUsers() {
  const array = [];
  usersById.forEach((userId) => {
    array.push(users[userId]);
  });
  return array;
}

function statusHandler(socket, userSelectors, nickname, messageBul) {
  const user = userSelectors.findUserByNickname(nickname);
  if (user) {
    userSelectors.changeUserStatus(nickname, 'recent');
    socket.emit('user recent', nickname, messageBul);
    socket.broadcast.emit('user recent', nickname, messageBul);
    setTimeout(() => {
      if (user.status !== 'offline' && user.status === 'recent') {
        userSelectors.changeUserStatus(nickname, 'online');
        socket.emit('user online', nickname);
        socket.broadcast.emit('user online', nickname);
      }
    }, 60000);
  }
}

module.exports = {
  createUser,
  changeUserStatus,
  findAllUsers,
  findUserByNickname,
  statusHandler,
};
