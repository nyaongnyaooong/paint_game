const express = require('express');
const wsModule = require('ws');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
// dotenv
dotenv.config();





// Variables ---------------------

// express
const app = express();
app.set('httpPort', process.env.HTTP_PORT || 80);


const gUsers = {};
const gRooms = [];
let roomNumber = 0;


// Middlewares ---------------------

// helmet
// app.use(helmet());

// body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// static
app.use(express.static('public'));

// morgan
app.use(morgan('dev'));

// Routers ---------------------

// Main
app.get("/", (req, res) => {
  const userInfo = req.cookies?.userInfo;
  if (!userInfo || !!userInfo?.nickName) return res.redirect('/setname')
  // if (!userInfo) return res.redirect('/setname')

  res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

// 닉네임 설정 페이지
app.get("/setname", (req, res) => {
  res.sendFile(path.join(__dirname, '/public/html/setName.html'));
});


// 닉네임 설정 요청 처리
app.post("/setname", (req, res) => {
  // 요청한 닉네임
  const { nickName } = req?.body;

  const cookieOb = {
    name: nickName
  }

  // 세션 쿠키에 저장
  res.cookie('userInfo', cookieOb, {
    path: '/',
  });

  res.cookie('userInfo2', nickName, {
    path: '/',
  });

  res.cookie('userInfo3', nickName, {
    path: '/',
  });
  res.redirect('/');
});

app.get('test', (req, res) => {
  res.send('123')
})

// 404
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '/public/html/404.html'));
});

// 3000포트에서 http
const HTTPServer = app.listen(app.get('httpPort'), () => {
  console.log("Server is open at port:" + app.get('httpPort'));
});



// Websocket Variables ---------------------



// Websocket ---------------------

let count = 0;

const game = () => {
  let round = 1;
  
}

// WebSocket 서버
const webSocketServer = new wsModule.Server(
  {
    server: HTTPServer, // WebSocket서버에 연결할 HTTP서버를 지정한다.
    // port: 3001 // WebSocket연결에 사용할 port를 지정한다(생략시, http서버와 동일한 port 공유 사용)
  }
);

// connection(클라이언트 연결) 이벤트 처리
webSocketServer.on('connection', (ws, req) => {

  const ip = ++count;

  // 첫 연결시 1회 실행
  if (ws.readyState === ws.OPEN) { // 연결 여부 체크
    console.log('클라이언트[' + ip + '] 접속')
    // ws.send(`클라이언트[${ip}] 접속을 환영합니다 from 서버`); // 데이터 전송
    // ws.send(id); // 데이터 전송
  }

  // 클라이언트로부터 메세지 수신
  ws.on('message', (msg) => {
    const clientMsg = JSON.parse(msg.toString('utf8'))

    // 현재 클라이언트 위치 저장
    if (clientMsg.location) ws.state = clientMsg.location;

    // 클라이언트가 닉네임 변경을 요청
    if (clientMsg.request === 'setName') {
      console.log('닉네임 변경 요청' + clientMsg.name)
      // 기존 클라이언트 중에 동일한 닉네임이 있는지 검사
      webSocketServer.clients.forEach(client => {
        // 있으면 연결을 끊음
        if (client.name === clientMsg.name) {
          ws.send(JSON.stringify({
            response: 'error',
            message: 'duplicated name'
          }));
          ws.close();
        }
      });

      gUsers[clientMsg.name] = ws;
      ws.name = clientMsg.name;
    }

    // 방 리스트 요청
    if (clientMsg.request === 'roomList') {
      ws.send(JSON.stringify({
        response: 'roomList',
        message: gRooms
      }));
    }

    // 방 생성을 요청
    if (clientMsg.request === 'createRoom') {
      gRooms.push({
        roomId: ++roomNumber,
        roomMember: [ws.name],
        roomMaster: ws.name,
        history: []
      })

      ws.send(JSON.stringify({
        response: 'enter',
        message: {
          roomId: roomNumber,
          roomMember: [ws.name],
          roomMaster: ws.name
        },
      }));

      ws.state = roomNumber;
    }

    // 방 입장/퇴장 요청
    if (clientMsg.request === 'locate') {   //퇴장
      if (clientMsg.data === 'lobby') {
        // 퇴실하기 전 방의 index
        const idx = gRooms.findIndex(e => e.roomId === clientMsg.location)

        // 멤버중 본인 삭제 / 자신 혼자면 방 삭제
        if (gRooms[idx].roomMember.length === 1) gRooms.splice(idx, 1)
        else gRooms[idx].roomMember.splice(gRooms[idx].roomMember.findIndex(e => e === ws.name), 1);

        // 방 퇴실
        ws.send(JSON.stringify({
          response: 'enter',
          message: 'lobby',
        }));

        // location 저장
        ws.state = 'lobby';
      } else {    //입장
        // 입장 요청한 방의 index값을 배열에서 찾음
        const idx = gRooms.findIndex(e => e.roomId === clientMsg.data)

        // 방 클릭하기 직전 방이 사라졌을 경우
        if (idx === -1) {
          // 방 입장 허가
          ws.send(JSON.stringify({
            response: 'error',
            message: 'room does not exist',
          }));
        } else {
          // 방 멤버에 추가
          gRooms[idx].roomMember.push(ws.name)

          // 방 입장 허가
          ws.send(JSON.stringify({
            response: 'enter',
            message: {
              ...gRooms[idx]
            },
          }));

          // location 저장
          ws.state = gRooms[idx].id

          gRooms[idx].roomMember
        }
      }

    }

    // 그림을 그림
    if (clientMsg.request === 'draw') {
      // 입장 중인 방의 index
      const idx = gRooms.findIndex(e => e.roomId === clientMsg.location)

      // 자신을 제외한 모든 멤버에서 그리기 데이터 전송
      gRooms[idx].roomMember.forEach(e => {
        if (e !== ws.name) {
          gUsers[e].send(JSON.stringify({
            response: 'draw',
            message: {
              ...clientMsg.data
            },
          }));
        }
      })

      // 방 히스토리 추가
      gRooms[idx].history.push({ ...clientMsg.data });
    }

    // 게임 시작
    if (clientMsg.request === 'startGame') {

      ws.send(JSON.stringify({
        response: 'roomList',
        message: gRooms
      }));
    }

    // // buffer > string 변환
    // const a = msg.toString('utf8')
    // webSocketServer.clients.forEach(e => {
    //   if (ws.id !== e.id) {
    //     e.send(a)
    //   }
    // })
    // ws.send(id); // 데이터 전송
  })

  ws.on('error', (error) => {
    console.log(`클라이언트[${ip}] 연결 에러발생 : ${error}`);
  })

  ws.on('close', () => {
    delete gUsers[ws.name];
  })
});