import { useState, useRef, useEffect } from 'react';
const Room = (props) => {
  const { appStateSet, userName, ws, roomInfo } = props;
  const { setPage } = appStateSet;
  const { roomId: location, roomMember, roomMaster, history } = roomInfo

  // roomInfo.correct = {};
  // roomMember.forEach(e => {
  //   roomInfo.correct[e] = 0;
  // })

  const [drawAuth, setDrawAuth] = useState(true)
  const [chatHistory, setChatHistory] = useState([]);
  const [nowTime, setNowTime] = useState(new Date());
  const [timerTime, setTimerTime] = useState(new Date());

  const [isDrawing, setIsDrawing] = useState(false)
  const [preCoord, setPreCoord] = useState({ x: 0, y: 0 })

  const [information, setInformation] = useState({ ...roomInfo, correct: {} });
  // console.log(information.roomMember[0])
  // Canvas 요소에 접근하기 위한 Ref 생성
  const refCanvas = useRef(null);
  const refAudio = useRef(null);

  // 그림 그리기에 필요한 변수들
  // let isDrawing = false;


  useEffect(() => {
    console.log(information)
    // 컴포넌트가 마운트될 때, Canvas 초기화
    const $canvas = refCanvas.current;
    const context = $canvas.getContext('2d');
    // context.strokeStyle = 'red';
    context.clearRect(0, 0, $canvas.width, $canvas.height);

    if (typeof history === 'object') {
      history.forEach(e => {
        context.beginPath();
        context.moveTo(e.prevX, e.prevY);
        context.lineTo(e.x, e.y);
        context.stroke();
      })
    }

    // const originCondition = ws.onmessage

    // 메세지 수신
    ws.onmessage = (res) => {
      const serverMsg = JSON.parse(res.data);
      const { response, message } = serverMsg

      const $canvas = refCanvas.current;
      const context = $canvas.getContext('2d');
      // context.strokeStyle = 'red';

      console.log(serverMsg)

      if (response === 'enter') {
        if (message === 'lobby') {
          setPage('lobby');
        }
      }

      if (response === 'draw') {
        const { prevX, prevY, x, y } = message

        context.beginPath();
        context.moveTo(prevX, prevY);
        context.lineTo(x, y);
        context.stroke();
      }

      // 채팅 정보 수신
      if (response === 'chat') {
        setChatHistory((preState) => [...preState, message]);
      }

      // 방 정보 업데이트
      if (response === 'roomInfo') {

        setInformation((preState) => {
          const newState = { ...preState }
          Object.keys(message).forEach(key => {
            newState[key] = message[key];
          })
          return newState;
        })
      }

      if (response === 'present') setDrawAuth(true);
      if (response === 'solver') setDrawAuth(false);

      // 게임 시작
      if (response === 'present' || response === 'solver') {
        context.clearRect(0, 0, $canvas.width, $canvas.height);

        setTimerTime(() => {
          const nowTime = new Date();
          return nowTime.setMilliseconds(nowTime.getMilliseconds() + 10000);
        })

      }

      if (response === 'correct') {

        setTimerTime(() => new Date())

        setInformation((preState) => {
          const newState = { ...preState }
          Object.keys(message).forEach(key => {
            newState[key] = message[key];
          })
          return newState;
        })
      }

      if (response === 'gameEnd') {

      }

    }

    // 타이머 표시용 interval
    const timerView = setInterval(() => {
      if (!isDrawing) setNowTime(new Date())
    }, 91)

    return () => {
      clearInterval(timerView)
    };
  }, []);

  // 마우스를 이동할 때 호출되는 이벤트 핸들러
  const handleMouseMove = (e) => {

    if (!drawAuth) return;
    if (!isDrawing) return;
    const $canvas = refCanvas.current;
    const context = $canvas.getContext('2d');

    // 현재 마우스 위치
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // 이전 마우스 위치
    const { x: prevX, y: prevY } = preCoord;

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
    setPreCoord({ x, y });
  };

  // 마우스를 클릭할 때 호출되는 이벤트 핸들러
  const handleMouseDown = (e) => {
    if (ws.readyState !== ws.OPEN) return;

    // 그림 그리기 시작
    setIsDrawing(true)

    // 현재 마우스 위치를 이전 위치로 초기화
    setPreCoord({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    })
  };

  // 마우스 클릭을 놓을 때 호출되는 이벤트 핸들러
  const handleMouseUp = () => {

    // 그림 그리기 종료
    // isDrawing = false;
    setIsDrawing(false)
  };

  const handleMouseLeave = () => {
    setIsDrawing(false)
  }

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

  // 채팅 보내기
  const sendChat = (event) => {
    event.preventDefault();

    const $input = event.target.chatContent;
    const content = $input.value;
    event.target.chatContent.value = '';

    if (content === '') {
      return;
    }
    $input.focus();

    // 채팅 내용 전송
    ws.send(JSON.stringify({
      name: userName,
      location,
      request: 'chat',
      data: content
    }))

    // state
    setChatHistory((preState) => [...preState, { chatter: userName, content }]);
  }

  const UserView = (props) => {
    const { player } = props;
    return player
      ? (
        <div className='userWrap'>
          <div className='user'>
            <span>{player}</span>
            <span>{information?.correct[player] ? information.correct[player] : 0}</span>
          </div>
        </div>
      )
      : (
        <div className='userWrap'>
          <div className='user'>
          </div>
        </div>
      )
  }

  return (
    <div className='room'>
      <div className='controlArea'>
        <div className='logoArea'>
          <div className='logo'></div>
        </div>
        <div className='buttonArea'>

          {
            information.roomMaster === userName
              ? <button onClick={startGame}>시작하기</button>
              : <></>
          }
          <button onClick={exitRoom}>나가기</button>
        </div>
        <div className='timeArea'>
          {timerTime > nowTime
            ? timerTime - nowTime
            : 0
          }
        </div>


        {
          information?.game
            ? <audio ref={refAudio} onLoadStart={() => { refAudio.current.volume = 0.4 }} autoPlay loop >
              <source src="../bgm/walking.mp3"></source>
            </audio>
            : <></>
        }
      </div>

      <div className='viewArea'>
        <div className='userArea1'>
          <UserView player={information?.roomMember[0]} />
          <UserView player={information?.roomMember[1]} />
          <UserView player={information?.roomMember[2]} />
        </div>
        <div className='canvasArea'>
          <div className='answerArea'>

          </div>
          <div className='canvasWrap'>
            <canvas
              ref={refCanvas}
              width={450}
              height={350}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseOut={handleMouseLeave}
            />
          </div>

        </div>
        <div className='userArea2'>
          <UserView player={information?.roomMember[3]} />
          <UserView player={information?.roomMember[4]} />
          <UserView player={information?.roomMember[5]} />
        </div>

      </div>
      <div className='chatArea'>
        <div className='chatView'>
          {
            chatHistory.map((chat, index) => (
              <div key={index}>
                {chat.chatter + ': ' + chat.content}
              </div>
            ))
          }
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
}

export { Room };
