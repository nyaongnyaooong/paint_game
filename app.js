const express = require('express');
const wsModule = require('ws');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const fs = require('fs');
// dotenv
dotenv.config();



// Variables ---------------------

// express
const app = express();
app.set('httpPort', process.env.HTTP_PORT || 80);


const gUsers = {};
const gRooms = {};
let roomNumber = 0;
const words = fs.readFileSync('./modules/words.txt').toString('utf-8').split('\r\n');


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

// // Main
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, 'public/html/index.html'));
// });

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

  res.send(true)
});


// 404
app.use((req, res, next) => {
  console.log(new Date(), req.ip)
  res.status(404).sendFile(path.join(__dirname, '/public/html/404.html'));
});

// 3000포트에서 http
const HTTPServer = app.listen(app.get('httpPort'), () => {
  console.log("Server is open at port:" + app.get('httpPort'));
});



// Websocket Variables ---------------------



// Websocket ---------------------


// 게임 라운드 실행 함수
const game = (roomId) => {

  // 1라운드 진행 시간 설정(ms)
  const roundTime = 120000;

  const room = gRooms[roomId];

  // 게임 중 상태 설정
  room.game = true;

  // 라운드 설정
  // 이전 게임의 라운드를 불러오고 없으면 0라운드로 설정
  room.round = room.round + 1 || 0;

  room.roomMember.forEach(e => {
    gUsers[e].send(JSON.stringify({
      response: 'roomInfo',
      message: {
        game: true
      }
    }));
  })

  // 라운드가 끝났는지 확인
  if (room.round > 4) {
    room.game = false;
    room.round = -1;

    room.roomMember.forEach(e => {
      gUsers[e].send(JSON.stringify({
        response: 'roomInfo',
        message: {
          game: false,
          answer: '',
          presenter: ''
        }
      }));
    })

    return
  }

  // 출제자 선정 (type: user.name)
  const presenter = room.roomMember[room.round % room.roomMember.length]

  // 정답 설정
  room.answer = words[Math.floor(Math.random() * words.length)]

  // 출제자와 도전자에게 게임정보 보냄
  room.roomMember.forEach(e => {
    if (e === presenter) {
      gUsers[e].role = 'presenter'

      gUsers[e].send(JSON.stringify({
        response: 'present',
        message: {
          round: room.round + 1,
          presenter,
          answer: room.answer,
          roundTime
        },
      }));
    } else {
      gUsers[e].role = 'solver'

      gUsers[e].send(JSON.stringify({
        response: 'solver',
        message: {
          round: room.round + 1,
          presenter,
          roundTime
        }
      }));
    }
  })

  room.timer = setTimeout(() => {
    game(roomId);
  }, roundTime)
  return
}

// 게임 중간 딜레이 함수
const gameDelay = (roomId) => {

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

  // 첫 연결시 1회 실행
  if (ws.readyState === ws.OPEN) { // 연결 여부 체크
    console.log('클라이언트 접속')
    ws.correct = 0;
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

      if (gUsers[data] && name !== data) {
        ws.send(JSON.stringify({
          response: 'error',
          message: 'duplicated name'
        }));
      } else {
        gUsers[data] = ws;
        ws.name = data;

        ws.send(JSON.stringify({
          response: 'setNameSuccess',
          message: data
        }));
      }
      // // 기존 클라이언트 중에 동일한 닉네임이 있는지 검사
      // webSocketServer.clients.forEach(client => {
      //   // 있으면 연결을 끊음
      //   if (client.name === name) {
      //     ws.send(JSON.stringify({
      //       response: 'error',
      //       message: 'duplicated name'
      //     }));
      //     ws.close();
      //   }
      // });
    }

    // 방 리스트 요청
    if (request === 'roomList') {
      // 모든 방의 방정보를 담은 배열
      const roomList = Object.values(gRooms)

      ws.send(JSON.stringify({
        response: 'roomList',
        message: roomList.map(e => {
          const { roomId, title, roomMember, roomMaster, game } = e;
          return { roomId, title, roomMember: roomMember.length, roomMaster, game }
        })
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
    // 이하 퇴장 요청 부분
    if (request === 'locate') {
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

        //이하 입장 요청 부분
      } else {
        // 입장 요청한 방의 index값을 배열에서 찾음
        const clientRoom = gRooms[data]

        // 방 클릭하기 직전 방이 사라졌을 경우
        if (clientRoom === undefined) {
          // 방 입장 불허
          ws.send(JSON.stringify({
            response: 'error',
            message: 'room does not exist',
          }));

          // 이하 풀 방일 경우
        } else if (clientRoom.roomMember.length > 5) {
          // 방 입장 불허
          ws.send(JSON.stringify({
            response: 'error',
            message: 'member is full',
          }));

          // 이하 입장 허가
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

    // 페인트 색상 변경
    if (request === 'changePaint') {
      // 입장 중인 방의 index
      const clientRoom = gRooms[location]


      clientRoom.roomMember.forEach(e => {
        if (e !== ws.name) {
          gUsers[e].send(JSON.stringify({
            response: 'changePaint',
            message: data
          }));
        }
      })

      clientRoom.history.push({ color: data });
    }

    // 모든 그림 삭제
    if (request === 'clear') {
      // 입장 중인 방의 index
      const clientRoom = gRooms[location]

      // 자신을 제외한 모든 멤버에게 클리어 명령
      clientRoom.roomMember.forEach(e => {
        if (e !== ws.name) {
          gUsers[e].send(JSON.stringify({
            response: 'clear',
          }));
        }
      })

      // 방 히스토리 초기화
      console.log(11)
      clientRoom.history = [];
    }

    // 게임 시작
    if (request === 'startGame') {
      const room = gRooms[location];
      if (room?.game) return

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
    console.log(`클라이언트 연결 에러발생 : ${error}`);
  })

  ws.on('close', () => {
    delete gUsers[ws.name];

    if (ws.location !== 'lobby' && gRooms[ws.location]) {
      const room = gRooms[ws.location];
      if (room.roomMember.length === 1) {
        delete gRooms[ws.location]
        if (room.game) clearInterval(room.timer)
      }
      else {
        const roomMemberIdx = room.roomMember.findIndex(e => e === ws.name);
        room.roomMember.splice(roomMemberIdx, 1);
        if (room.roomMaster === ws.name) room.roomMaster = room.roomMember[0];

      }

      // 마스터 변경
      room.roomMember.forEach(e => {
        if (gUsers[e]) {
          gUsers[e].send(JSON.stringify({
            response: 'roomInfo',
            message: {
              roomMember: room.roomMember,
              roomMaster: room.roomMaster
            }
          }));
        }
      })
    }
  })
});