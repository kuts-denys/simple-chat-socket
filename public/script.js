const socket = io();
const registrationForm = document.querySelector('.registration-form');
const messagesList = document.querySelector('.messages-list');
const usersList = document.querySelector('.users-list');
const id = localStorage.getItem('socketId');
const messageForm = document.querySelector('.form');
const messageInput = document.querySelector('.form__user-input');
const typingContainer = document.querySelector('.messages-list__typing-notify');
const nicknameContainer = document.querySelector('.users-list__nickname');
const logoutButton = document.querySelector('.users-list__logout');

messageInput.addEventListener('input', () => {
  const nickname = localStorage.getItem('nickname');
  socket.emit('user typing', nickname);
});

messageForm.addEventListener('submit', (event) => {
  const nickname = localStorage.getItem('nickname');
  const name = localStorage.getItem('name');
  const body = messageForm.messageInput.value;
  if (body === '') {
    event.preventDefault();
    return;
  }
  const createdAt = Date.now();
  socket.emit('new message', { authorName: name, authorNickname: nickname, createdAt, body });
  messageForm.messageInput.value = '';
  event.preventDefault();
});

if (id) {
  const nickname = localStorage.getItem('nickname');
  registrationForm.parentNode.style.display = 'none';
  socket.emit('logging in', id, nickname);
  window.onbeforeunload = () => {
    socket.emit('user disconnected', nickname);
    socket.close();
  };
}

if (!id) {
  registrationForm.addEventListener('submit', (event) => {
    const name = registrationForm.name.value;
    const nickname = registrationForm.nickname.value;
    if (name === '' || nickname === '') return false;
    socket.emit('create user', { name, nickname });
    localStorage.setItem('nickname', nickname);
    localStorage.setItem('name', name);
    registrationForm.parentNode.style.display = 'none';
    nicknameContainer.innerHTML = `Nickname: ${nickname}`;
    messagesList.innerHTML = '';
    logoutButton.addEventListener('click', () => {
      localStorage.clear();
      socket.emit('user disconnected', nickname);
      nicknameContainer.innerHTML = 'Nickname:';
      registrationForm.parentNode.style.display = 'block';
    });
    window.onbeforeunload = () => {
      socket.emit('user disconnected', nickname);
      socket.close();
    };
    event.preventDefault();
  });
}

function createElement(el, className, text) {
  const element = document.createElement(el);
  if (className) element.className = className;
  if (text) element.innerText = text;
  return element;
}

function renderMessages(messages) {
  if (!messages.length) return;
  let messagesToRender;
  if (messages.length > 100) {
    messagesList.innerHTML = '';
    messagesToRender = messages.slice(-100);
  } else {
    messagesToRender = messages;
  }
  messagesToRender.forEach((message) => {
    const messageContainer = createElement('li', 'messages-list__message');
    const author = `${message.authorName} (@${message.authorNickname})`;
    const authorEl = createElement('p', 'messages-list__message-author', author);
    let time = new Date(message.createdAt);
    let hours = time.getHours();
    if (hours < 10) hours = `0${hours}`;
    let minutes = time.getMinutes();
    if (minutes < 10) minutes = `0${minutes}`;
    time = `${hours}:${minutes}`;
    const timeContainer = createElement('span', 'message-time', time);
    const body = createElement('p', 'messages-list__message-body', message.body);
    const regex = /^@(\S+)\s/;
    const toSpecificUsername = message.body.match(regex);
    if (toSpecificUsername && toSpecificUsername[1] === localStorage.getItem('nickname')) {
      body.style.color = 'brown';
      body.style.fontWeight = 'bold';
    }
    messageContainer.appendChild(authorEl);
    messageContainer.appendChild(timeContainer);
    messageContainer.appendChild(body);
    messagesList.appendChild(messageContainer);
  });
  messagesList.scrollTop = messagesList.scrollHeight - messagesList.offsetHeight;
}

function createNotification(nickname, message) {
  const notification = createElement('li', 'message-list__notification', `${nickname} ${message}.`);
  messagesList.appendChild(notification);
  messagesList.scrollTop = messagesList.scrollHeight - messagesList.offsetHeight;
}

function findUserLiByNickname(nickname) {
  const users = [...document.querySelectorAll('.users-list__name')];
  return users.filter(user => user.querySelector('p').innerText === nickname)[0];
}

function addUser(nickname, status, beforeElement) {
  let statusClass;
  if (status === 'online') statusClass = 'user-status user-status--online';
  if (status === 'recent') statusClass = 'user-status user-status--recent';
  if (status === 'offline') statusClass = 'user-status user-status--offline';
  const userLi = createElement('li', 'users-list__item users-list__name');
  const userPar = createElement('p', null, nickname);
  const statusSpan = createElement('span', statusClass);
  userPar.appendChild(statusSpan);
  userLi.appendChild(userPar);
  if (beforeElement) {
    usersList.insertBefore(userLi, beforeElement);
  } else {
    usersList.appendChild(userLi);
  }
}
socket.on('connected', (users) => {
  users.forEach(user => addUser(user.nickname, user.status));
});
socket.on('user created', (nickname) => {
  createNotification(nickname, 'joined the chat');
});
socket.on('id', (sentId) => {
  localStorage.setItem('socketId', sentId);
});

socket.on('user recent', (nickname, messageBul) => {
  if (messageBul) createNotification(nickname, 'is now online');
  const userLi = findUserLiByNickname(nickname);
  if (userLi) {
    const nextSibling = userLi.nextElementSibling;
    userLi.parentNode.removeChild(userLi);
    addUser(nickname, 'recent', nextSibling);
  } else {
    addUser(nickname, 'recent');
  }
});

socket.on('user online', (nickname) => {
  const userLi = findUserLiByNickname(nickname);
  if (userLi) {
    const nextSibling = userLi.nextElementSibling;
    userLi.parentNode.removeChild(userLi);
    addUser(nickname, 'online', nextSibling);
  } else {
    addUser(nickname, 'online');
  }
});
socket.on('user disconnected', (nickname) => {
  createNotification(nickname, 'disconnected');
  const userLi = findUserLiByNickname(nickname);
  userLi.querySelector('.user-status').className = 'user-status user-status--offline';
});
socket.on('messages history', (messages) => {
  renderMessages(messages);
});
socket.on('new message', (data) => {
  if (Array.isArray(data)) {
    renderMessages(data);
  } else {
    const message = [data];
    renderMessages(message);
  }
});
socket.on('user typing', (nickname) => {
  typingContainer.innerHTML = `@${nickname} is typing...`;
  setTimeout(() => {
    typingContainer.innerHTML = '';
  }, 2000);
});
socket.on('customError', (error) => {
  alert(error);
  registrationForm.parentNode.style.display = 'block';
});
