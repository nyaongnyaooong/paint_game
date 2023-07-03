import { useState, useRef, useEffect } from 'react';
import './css/app.css';

function App() {

  const [ws, setWs] = useState(null);
  const [page, setPage] = useState('lobby');
  const [history, setHistory] = useState([]);
  const [userName, setUserName] = useState('');
  const [roomList, setRoomList] = useState([]);
  const refCanvas = useRef(null);

  const appStateSet = {
    setWs,
    setPage,
    setUserName
  }

  const Lobby = (props) => {
    const { appStateSet, userName, ws, roomList } = props;
    const { setUserName, setPage } = appStateSet;

    const [html, setHtml] = useState([])

    const enterRoom = (idx) => {
      ws.send(JSON.stringify({
        name: userName,
        location: 'lobby',
        request: 'locate',
        data: idx
      }))
    }

    useEffect(() => {
      if (roomList.length > 0) {
        console.log(roomList)
        const arr = []
        roomList.forEach((e, i) => {
          const { roomId, roomIdx, roomMember, roomMaster } = e

          arr.push(
            <tr key={i} onClick={() => enterRoom(roomIdx)}>
              <td>{roomId}</td>
              <td>방</td>
              <td>{roomMaster.name}</td>
            </tr>
          )
        })

        setHtml(arr)
      }
    }, [roomList])


    // 쿠키에서 닉네임을 읽어서 표기
    useEffect(() => {

      const getRoomList = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          console.log('방정보 요청');
          ws.send(JSON.stringify({
            name: userName,
            location: 'lobby',
            request: 'roomList'
          }))
        }
      }, 1000)



      return () => {
        clearInterval(getRoomList);
      };
    }, [])


    const createRoom = () => {
      ws.send(JSON.stringify({
        name: userName,
        location: 'lobby',
        request: 'createRoom'
      }))
    }


    return (
      <div className="Lobby">
        <div className="title">
          <h1>캐치마인드</h1>
          <h4>{userName}</h4>
        </div>
        <div className="buttonArea">
          {/* <button onClick="{changeName}">닉네임 변경하기</button> */}
          <button onClick={createRoom}>방 만들기</button>
        </div>

        <div className="roomList">
          <table>
            <thead>
              <tr>
                <th>번호</th>
                <th>방제목</th>
                <th>방장</th>
              </tr>
            </thead>
            <tbody>
              {html}
            </tbody>
          </table>
        </div>
      </div>
    )
  }


  const Room = (props) => {
    const { appStateSet, ws, refCanvas, history } = props;
    const { setPage } = appStateSet;

    // Canvas 요소에 접근하기 위한 Ref 생성
    // const refCanvas = useRef(null);
    // 그림 그리기에 필요한 변수들
    let isDrawing = false;
    let prevX = 0;
    let prevY = 0;


    useEffect(() => {
      // 컴포넌트가 마운트될 때, Canvas 초기화
      const $canvas = refCanvas.current;
      const context = $canvas.getContext('2d');
      context.strokeStyle = 'red';
      context.clearRect(0, 0, $canvas.width, $canvas.height);

      if (history.length > 0) {
        history.forEach(e => {
          context.beginPath();
          context.moveTo(e.prevX, e.prevY);
          context.lineTo(e.x, e.y);
          context.stroke();
        })
      }

      // const originCondition = ws.onmessage

      // 메세지 수신
      // ws.onmessage = (res) => {
      //   const serverMsg = JSON.parse(res.data);
      //   console.log(serverMsg)

      //   if (serverMsg.response === 'draw') {
      //     const { prevX, prevY, x, y } = serverMsg.message

      //     context.beginPath();
      //     context.moveTo(prevX, prevY);
      //     context.lineTo(x, y);
      //     context.stroke();
      //   }
      // }
    }, []);

    // 마우스를 클릭하고 이동할 때 호출되는 이벤트 핸들러
    const handleMouseMove = (e) => {
      if (!isDrawing) return;

      const $canvas = refCanvas.current;
      const context = $canvas.getContext('2d');

      // 현재 마우스 위치
      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;

      // 이전 위치에서 현재 위치까지 선 그리기
      context.beginPath();
      context.moveTo(prevX, prevY);
      context.lineTo(x, y);
      context.stroke();

      ws.send(JSON.stringify({
        name: userName,
        location: false,
        request: 'draw',
        data: {
          prevX,
          prevY,
          x,
          y
        }
      }))

      // 현재 위치를 이전 위치로 업데이트
      prevX = x;
      prevY = y;


    };

    // 마우스를 클릭할 때 호출되는 이벤트 핸들러
    const handleMouseDown = (e) => {
      if (ws.readyState !== ws.OPEN) return;
      // 그림 그리기 시작
      isDrawing = true;
      // 현재 마우스 위치를 이전 위치로 초기화
      prevX = e.nativeEvent.offsetX;
      prevY = e.nativeEvent.offsetY;
    };

    // 마우스 클릭을 놓을 때 호출되는 이벤트 핸들러
    const handleMouseUp = () => {
      // 그림 그리기 종료
      isDrawing = false;
    };


    const exitRoom = () => {
      ws.send(JSON.stringify({
        name: userName,
        location: false,
        request: 'locate',
        data: 'lobby'
      }))
    }

    return (
      <div>
        <canvas
          ref={refCanvas}
          width={500}   // Canvas 너비
          height={500}  // Canvas 높이
          style={{ border: '1px solid black' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />
        <button onClick={exitRoom}>나가기</button>
      </div>

    );

    // const { appStateSet, userName, ws } = props;
    // const { setUserName, setPage } = appStateSet;

    // const refCanvas = useRef(null)

    // useEffect(() => {
    //   const $canvas = refCanvas.current;
    //   $canvas.width = '700px';
    //   $canvas.height = '700px';
    // }, [])


    // return (
    //   <div className='canvas_wrap'>
    //     <canvas ref={refCanvas}></canvas>
    //   </div>
    // );
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
    const webSocket = new WebSocket("ws://localhost:8080");

    // 2. 웹소켓 이벤트 처리
    // 2-1) 연결 이벤트 처리
    webSocket.onopen = () => {
      console.log(userName)
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

      if (serverMsg.response === 'error') {
        if (serverMsg.message === 'duplicated name') {
          alert('중복된 닉네임입니다!\n다른 닉네임을 입력해주세요')
          window.location.href = '/setname';
        }
      }

      if (serverMsg.response === 'roomList') {
        const r = serverMsg.message


        setRoomList(r)
      }

      if (serverMsg.response === 'enter') {

        if (serverMsg.message === 'lobby') {
          setPage('lobby');
        } else {
          const { roomId, roomIdx, roomMember, roomMaster, history: his } = serverMsg.message

          if (his) setHistory(his)
          else setHistory([])

          setPage('room')
        }

      }

      if (serverMsg.response === 'draw') {
        const $canvas = refCanvas.current;
        const context = $canvas.getContext('2d');
        // context.strokeStyle = 'red';
        // context.clearRect(0, 0, $canvas.width, $canvas.height);

        const { prevX, prevY, x, y } = serverMsg.message

        context.beginPath();
        context.moveTo(prevX, prevY);
        context.lineTo(x, y);
        context.stroke();
      }

    }
    console.log(webSocket)

  }, []);


  if (page === 'room') return <Room appStateSet={appStateSet} ws={ws} refCanvas={refCanvas} history={history} />

  return (
    <div>
      <Lobby appStateSet={appStateSet} userName={userName} ws={ws} roomList={roomList} />
    </div>
  )
}

export default App;
