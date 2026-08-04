const { Server } = require('socket.io');

let io = null;

const POLICE_ROOM = 'police';

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    const role = socket.handshake.query && socket.handshake.query.role;
    if (role === 'police') {
      socket.join(POLICE_ROOM);
    }

    socket.on('join', (data) => {
      if (data && data.role === 'police') {
        socket.join(POLICE_ROOM);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => io;

const emitNewCase = (caseData) => {
  if (io) {
    io.to(POLICE_ROOM).emit('new_case', caseData);
  }
};

const emitCaseUpdated = (caseData) => {
  if (io) {
    io.to(POLICE_ROOM).emit('case_updated', caseData);
  }
};

module.exports = { initSocket, getIO, emitNewCase, emitCaseUpdated, POLICE_ROOM };
