const express = require('express');
const path = require('path');

const app = express();

app.use(express.static('public'));

// index html response
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html')); // index.html 파일 응답
});

// index html response
app.get("/setname", (req, res) => {
  const { nickName } = req.query;
  res.set('nickName', nickName).redirect('/lobby'); 
});

app.get("/lobby", (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index2.html')); // index.html 파일 응답
});

// 3000포트에서 http
const HTTPServer = app.listen(3000, () => {
  console.log("Server is open at port:3000");
});




const wsModule = require('ws');

// WebSocket 서버
const webSocketServer = new wsModule.Server(
  {
    server: HTTPServer, // WebSocket서버에 연결할 HTTP서버를 지정한다.
    // port: 3001 // WebSocket연결에 사용할 port를 지정한다(생략시, http서버와 동일한 port 공유 사용)
  }
);

// connection(클라이언트 연결) 이벤트 처리
webSocketServer.on('connection', (ws, req) => {

  if (ws.readyState === ws.OPEN) { // 연결 여부 체크
    // ws.send(`클라이언트[${ip}] 접속을 환영합니다 from 서버`); // 데이터 전송
    // ws.send(id); // 데이터 전송
  }

  ws.on('message', (msg) => {
    // buffer > string 변환
    const a = msg.toString('utf8')
    // const a = JSON.parse(JSON.stringify(msg)).data
    webSocketServer.clients.forEach(e => {
      if (ws.id !== e.id) {
        e.send(a)
      }
    })
    // ws.send(id); // 데이터 전송
  })

  ws.on('error', (error) => {
    console.log(`클라이언트[${ip}] 연결 에러발생 : ${error}`);
  })

  ws.on('close', () => {
    console.log(`클라이언트[${ip}] 웹소켓 연결 종료`);
  })
});