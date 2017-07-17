const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const userSelectors = require('./services/usersSelectors');
const messagesSelectors = require('./services/messagesSelectors');

const app = express();
const server = app.listen(1500);
const io = require('socket.io').listen(server);

const staticPath = path.join(__dirname, '/public');
app.use(express.static(staticPath));

app.use(morgan('common'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(compression());

const listenersIds = [];

io.on('connection', (socket) => {
  socket.emit('connected', userSelectors.findAllUsers());
  socket.on('create user', (data) => {
    const id = userSelectors.createUser(data);
    if (id) {
      listenersIds.push(id);
      userSelectors.changeUserStatus(data.nickname, 'recent');
      socket.emit('id', id);
      socket.emit('messages history', messagesSelectors.findMessages());
      socket.emit('user created', data.nickname);
      socket.broadcast.emit('user created', data.nickname);
      userSelectors.statusHandler(socket, userSelectors, data.nickname, false);
    }
    if (!id) socket.emit('customError', 'user already exists');
  });
  socket.on('logging in', (id, nickname) => {
    userSelectors.statusHandler(socket, userSelectors, nickname, true);
    if (listenersIds.includes(id)) {
      socket.emit('messages history', messagesSelectors.findMessages());
    }
  });
  socket.on('user disconnected', (nickname) => {
    userSelectors.changeUserStatus(nickname, 'offline');
    socket.broadcast.emit('user disconnected', nickname);
  });
  socket.on('new message', (data) => {
    const { authorName, authorNickname, createdAt, body } = data;
    messagesSelectors.createNewMessage(authorName, authorNickname, createdAt, body);
    if (messagesSelectors.getMessagesLength() <= 100) {
      socket.emit('new message', data);
      socket.broadcast.emit('new message', data);
    }
    if (messagesSelectors.getMessagesLength() > 100) {
      socket.emit('new message', messagesSelectors.findMessages());
      socket.broadcast.emit('new message', messagesSelectors.findMessages());
    }
  });
  socket.on('user typing', (nickname) => {
    socket.broadcast.emit('user typing', nickname);
  });
});
