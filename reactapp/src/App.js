import { useState, useRef, useEffect } from 'react';
import { Lobby } from './component/Lobby';
import { Room } from './component/Room';

import './css/app.css';

function App() {

  // States
  const [ws, setWs] = useState(null);
  const [page, setPage] = useState('lobby');
  const [userName, setUserName] = useState('');
  const [location, setLocation] = useState('lobby');
  const [roomList, setRoomList] = useState([]);
  const [roomInfo, setRoomInfo] = useState({});

  // State Functions
  const appStateSet = {
    setWs,
    setPage,
    setUserName,
    setLocation,
    setRoomList,
    setRoomInfo
  }

  // 웹소켓 처리
  useEffect(() => {

    // 쿠키 정보를 담을 객체
    const cookieParse = {}

    // 쿠키 정보는 document.cookie에 key=value; 형식으로 담겨있으므로 '; '을 기준으로 split
    document.cookie.split('; ').forEach(e => {
      const [key, value] = e.split('=');

      // 'j:'로 시작하면 json형태로 판별
      cookieParse[key] = /^j%3A/.test(value)
        ? JSON.parse(decodeURIComponent(value.replace(/^j%3A/, '')))
        : decodeURIComponent(value);
    })

    // 닉네임
    const userName = cookieParse?.userInfo.name;
    setUserName(cookieParse?.userInfo.name)



    // websocket
    // const host = window.location.host;

    const webSocket = new WebSocket('ws://' + window.location.hostname + ':8080');

    // 2. 웹소켓 이벤트 처리
    // 2-1) 연결 이벤트 처리
    webSocket.onopen = () => {
      setWs(webSocket)
      webSocket.send(JSON.stringify({
        name: userName,
        location: 'lobby',
        request: 'setName'
      }))
    };

    // 2-3) 연결 종료 이벤트 처리
    webSocket.onclose = function () {
      console.log('연결해제됨')
    }

    // 2-4) 에러 발생 이벤트 처리
    webSocket.onerror = function (event) {
      console.log(event)
    }

    // 메세지 수신
    webSocket.onmessage = (res) => {
      const serverMsg = JSON.parse(res.data);
      const { response, message } = serverMsg;

      if (response === 'error') {
        if (serverMsg.message === 'duplicated name') {
          alert('중복된 닉네임입니다!\n다른 닉네임을 입력해주세요')
          window.location.href = '/setname';
        } else if (message === 'room does not exist') {
          alert('존재하지 않는 방입니다')
        }
      }
    }

  }, []);

  if (!ws) return <></>
  if (page === 'room') return <Room appStateSet={appStateSet} userName={userName} ws={ws} roomInfo={roomInfo} />
  return <Lobby appStateSet={appStateSet} userName={userName} ws={ws} roomList={roomList} />

}

export default App;
