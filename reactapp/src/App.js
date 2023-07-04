import { useState, useRef, useEffect } from 'react';
import './css/app.css';

function App() {

  // States
  const [ws, setWs] = useState(null);
  const [page, setPage] = useState('lobby');
  const [history, setHistory] = useState([]);
  const [userName, setUserName] = useState('');
  const [location, setLocation] = useState('lobby');
  const [roomList, setRoomList] = useState([]);
  const [master, setMaster] = useState(false);
  const [chatHistory, setChatHistory] = useState(false);

  // Ref
  const refCanvas = useRef(null);

  // State Functions
  const appStateSet = {
    setWs,
    setPage,
    setUserName,
    setChatHistory
  }

  const Lobby = (props) => {
    const { appStateSet, userName, ws, roomList } = props;
    const { setUserName, setPage } = appStateSet;

    const [html, setHtml] = useState([])

    const enterRoom = (id) => {
      ws.send(JSON.stringify({
        name: userName,
        location: 'lobby',
        request: 'locate',
        data: id
      }))
    }

    useEffect(() => {
      if (roomList.length > 0) {
        console.log(roomList)
        const arr = []
        roomList.forEach((e, i) => {
          const { roomId, roomMember, roomMaster } = e

          arr.push(
            <tr key={i} onClick={() => enterRoom(roomId)}>
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
    const { appStateSet, ws, refCanvas, history, master } = props;
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
        location,
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
        location,
        request: 'locate',
        data: 'lobby'
      }))
    }

    const startGame = () => {
      ws.send(JSON.stringify({
        name: userName,
        location,
        request: 'startGame',
        data: false
      }))
    }

    const sendChat = (event) => {
      event.preventDefault();
      const $input = event.target.chatContent;
      const content = $input.value;
      $input.focus();

      event.target.chatContent.value = '';
      console.log(content)
      ws.send(JSON.stringify({
        name: userName,
        location,
        request: 'chat',
        data: false
      }))
    }

    return (
      <div className='room'>

        <div className='viewArea'>
          <div className='userArea1'>
            <div className='user'>

            </div>
            <div className='user'>

            </div>
            <div className='user'>

            </div>
          </div>
          <div className='canvasArea'>
            <div className='canvasWrap'>
              <canvas
                ref={refCanvas}
                width={500}
                height={500}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              />
            </div>
            <div className='controlArea'>
              <button onClick={exitRoom}>나가기</button>
              {
                master
                  ? <button onClick={startGame}>시작하기</button>
                  : <></>
              }
            </div>

          </div>
          <div className='userArea2'>
            <div className='user'>

            </div>
            <div className='user'>

            </div>
            <div className='user'>

            </div>
          </div>

        </div>
        <div className='chatArea'>
          <div className='chatView'>

          </div>
          <form className='chatInput' onSubmit={sendChat}>
            <div className='inputArea'>
              <input name='chatContent'></input>
            </div>
            <div className='buttonArea'>
              <button>전송</button>
            </div>
          </form>
        </div>
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

      if (response === 'roomList') {
        setRoomList(message)
      }

      if (response === 'enter') {

        if (message === 'lobby') {
          setPage('lobby');
        } else {
          const { roomId, roomMember, roomMaster, history } = message

          if (history) setHistory(history)
          else setHistory([])

          setMaster(roomMaster === userName ? true : false)
          setLocation(roomId)

          setPage('room')
        }

      }

      if (response === 'draw') {
        const $canvas = refCanvas.current;
        const context = $canvas.getContext('2d');
        // context.strokeStyle = 'red';
        // context.clearRect(0, 0, $canvas.width, $canvas.height);

        const { prevX, prevY, x, y } = message

        context.beginPath();
        context.moveTo(prevX, prevY);
        context.lineTo(x, y);
        context.stroke();
      }

    }

  }, []);


  if (page === 'room') return <Room appStateSet={appStateSet} ws={ws} refCanvas={refCanvas} history={history} master={master} chatHistory={chatHistory}/>

  return (
    <div>
      <Lobby appStateSet={appStateSet} userName={userName} ws={ws} roomList={roomList} />
    </div>
  )
}

export default App;
