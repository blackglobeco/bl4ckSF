const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const os = require('os');
const pty = require('node-pty');

const shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';

const port = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('User connected');
    socket.on('set-subdomain', (subdomain) => {
      const command = shell === 'cmd.exe' ? `subfinder -d ${subdomain}` : `export PATH=$PATH:$HOME/go/bin && subfinder -d ${subdomain}`;
      const term = pty.spawn(shell, shell === 'cmd.exe' ? ['/c', command] : ['-c', command], {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: process.env.PWD,
          env: process.env,
      });
  
      const bannerLines = 11;
  
      let buffer = '';
      let lineNumber = 0;
  
      term.onData((data) => {
          buffer += data;
          let lines = buffer.split('\n');
          if (lines.length > 1) {
              for (let i = 0; i < lines.length - 1; i++) {
                  lineNumber++;
                  if (lineNumber > bannerLines) {
                      socket.emit('output', lines[i] + '\n');
                  }
              }
              buffer = lines[lines.length - 1];
          }
      });
  
      socket.on('input', (data) => {
        term.write(data);
    
        if (window.innerWidth <= 600) {
            term.fit();
        }
      });
      socket.on('output', (data) => {
        term.write(data);
    
        if (window.innerWidth <= 600) {
            term.fit();
        }
    });
      socket.on('disconnect', () => {
          console.log('User disconnected');
          term.kill();
      });
  });
});

http.listen(port, () => {
    console.log(`Listening on *:${port}`);
});
