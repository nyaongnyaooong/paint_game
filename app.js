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
const gRooms = {};
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
const gwords = ['자동차', '카페']

const game = (roomId) => {
  // 해당 room id를 가진 룸 객체
  const room = gRooms[roomId];

  // 게임 중임을 표기
  room.game = true;

  // 라운드 설정
  // 이전 게임의 라운드를 불러오고 없으면 0라운드로 설정
  room.round = room.round + 1 || 0;
  console.log(room.round)
  // 라운드가 끝났는지 판별
  if (room.round > 4) {
    room.game = false;
    room.round = 0;

    room.roomMember.forEach(e => {
      gUsers[e].send(JSON.stringify({
        response: 'gameEnd',
        message: false
      }));
    })

    return
  }

  // 출제자 선정 (type: user.name)
  const presenter = room.roomMember[room.round % room.roomMember.length]

  // 정답 설정
  room.answer = '자동차'

  // 출제자와 도전자에게 게임정보 보냄
  room.roomMember.forEach(e => {
    if (e === presenter) {
      gUsers[e].role = 'presenter'

      gUsers[e].send(JSON.stringify({
        response: 'present',
        message: {
          round: room.round,
          presenter,
          answer: room.answer
        },
      }));
    } else {
      gUsers[e].role = 'solver'

      gUsers[e].send(JSON.stringify({
        response: 'solver',
        message: {
          presenter,
          correct: gUsers[e].correct
        }
      }));
    }
  })

  room.timer = setTimeout(() => {
    game(roomId);
  }, 10000)
  return
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
    ws.correct = 0;
    // ws.send(`클라이언트[${ip}] 접속을 환영합니다 from 서버`); // 데이터 전송
    // ws.send(id); // 데이터 전송
  }

  // 클라이언트로부터 메세지 수신
  ws.on('message', (msg) => {

    const clientMsg = JSON.parse(msg.toString('utf8'))
    const { name, location, request, data } = clientMsg;

    // 현재 클라이언트 위치 저장
    if (location) ws.location = location;

    // 클라이언트가 닉네임 변경을 요청
    if (request === 'setName') {
      console.log('닉네임 변경 요청' + name)
      // 기존 클라이언트 중에 동일한 닉네임이 있는지 검사
      webSocketServer.clients.forEach(client => {
        // 있으면 연결을 끊음
        if (client.name === name) {
          ws.send(JSON.stringify({
            response: 'error',
            message: 'duplicated name'
          }));
          ws.close();
        }
      });

      gUsers[name] = ws;
      ws.name = name;
    }

    // 방 리스트 요청
    if (request === 'roomList') {
      const roomList = Object.values(gRooms)
      const message = roomList.map(e => {
        const { roomId, roomMaster } = e;
        return { roomId, roomMaster }
      })

      ws.send(JSON.stringify({
        response: 'roomList',
        message
      }));
    }

    // 방 생성을 요청
    if (request === 'createRoom') {
      // 방 생성
      gRooms[++roomNumber] = {
        roomId: roomNumber,
        roomMember: [ws.name],
        roomMaster: ws.name,
        history: [],
        chat: [],
      }

      ws.send(JSON.stringify({
        response: 'enter',
        message: {
          roomId: roomNumber,
          roomMember: [ws.name],
          roomMaster: ws.name
        },
      }));

      ws.location = roomNumber;
    }

    // 방 입장/퇴장 요청
    if (request === 'locate') {   //퇴장
      if (data === 'lobby') {
        // 퇴실하기 전 방의 index
        const clientRoom = gRooms[location]
        const { roomId, roomMember, roomMaster, history } = clientRoom

        // 멤버중 본인 삭제 / 자신 혼자면 방 삭제
        if (clientRoom.roomMember.length !== 1) {
          clientRoom.roomMember.splice(clientRoom.roomMember.findIndex(e => e === ws.name), 1);

          if (roomMaster === ws.name) clientRoom.roomMaster = roomMember[0];

          // 다른 방 멤버들에게 퇴장 사실 전달
          clientRoom.roomMember.forEach(e => {
            if (e !== ws.name) {
              gUsers[e].send(JSON.stringify({
                response: 'roomInfo',
                message: {
                  roomId,
                  roomMember,
                  roomMaster: clientRoom.roomMaster,
                },
              }));
            }
          })
        } else delete gRooms[location]





        // 방 퇴실
        ws.send(JSON.stringify({
          response: 'enter',
          message: 'lobby',
        }));



        // location 저장
        ws.location = 'lobby';
      } else {    //입장
        // 입장 요청한 방의 index값을 배열에서 찾음
        const clientRoom = gRooms[data]

        // 방 클릭하기 직전 방이 사라졌을 경우
        if (clientRoom === undefined) {
          // 방 입장 불허
          ws.send(JSON.stringify({
            response: 'error',
            message: 'room does not exist',
          }));
        } else {
          const { roomId, roomMember, roomMaster, history } = clientRoom

          // 방 멤버에 추가
          clientRoom.roomMember.push(ws.name)

          // 방 입장 허가
          ws.send(JSON.stringify({
            response: 'enter',
            message: {
              roomId,
              roomMember,
              roomMaster,
              history
            },
          }));

          // 다른 방 멤버들에게 입장 사실 전달
          clientRoom.roomMember.forEach(e => {
            if (e !== ws.name) {
              gUsers[e].send(JSON.stringify({
                response: 'roomInfo',
                message: {
                  roomId,
                  roomMember,
                  roomMaster,
                },
              }));
            }
          })

          // location 저장
          ws.location = clientRoom.roomId

          // gRooms[idx].roomMember
        }
      }

    }

    // 그림을 그림
    if (request === 'draw') {
      // 입장 중인 방의 index
      const clientRoom = gRooms[location]
      // const idx = gRooms.findIndex(e => e.roomId === clientMsg.location)

      // 자신을 제외한 모든 멤버에서 그리기 데이터 전송
      clientRoom.roomMember.forEach(e => {
        if (e !== ws.name) {
          gUsers[e].send(JSON.stringify({
            response: 'draw',
            message: {
              ...data
            },
          }));
        }
      })

      // 방 히스토리 추가
      clientRoom.history.push({ ...data });
    }

    // 게임 시작
    if (request === 'startGame') {
      const room = gRooms[location];
      if (room.game) return

      delete room.correct;

      room.roomMember.forEach(e => {
        gUsers[e].send(JSON.stringify({
          response: 'gameStart',
          message: false
        }));
      })

      game(location)
    }

    // 채팅 요청
    if (request === 'chat') {
      const room = gRooms[location];
      // 멤버들에게 채팅 전송
      room.roomMember.forEach(e => {
        if (e !== ws.name) {
          gUsers[e].send(JSON.stringify({
            response: 'chat',
            message: {
              chatter: ws.name,
              content: data
            }
          }));
        }
      })

      // 정답 제출
      if (ws.role === 'solver' && room.answer === data) {
        // 타이머 중지
        clearTimeout(room.timer)

        if (!room.correct) room.correct = {}
        room.correct[ws.name] = room.correct[ws.name] ? room.correct[ws.name] + 1 : 1;

        // 멤버들에게 채팅 전송
        room.roomMember.forEach(e => {
          gUsers[e].send(JSON.stringify({
            response: 'correct',
            message: {
              correct: room.correct
            }
          }));
        })

        // 다음 라운드 시작
        if (room.game) game(location)
      }

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

    if (ws.location !== 'lobby') {
      if (gRooms[ws.location].roomMember.length === 1) delete gRooms[ws.location]
    }
  })
});