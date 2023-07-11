import { useState, useRef, useEffect } from 'react';
const Room = (props) => {
  const { appStateSet, userName, ws, roomInfo } = props;
  const { setPage } = appStateSet;
  const { roomId: location, history } = roomInfo

  // roomInfo.correct = {};
  // roomMember.forEach(e => {
  //   roomInfo.correct[e] = 0;
  // })

  const [drawAuth, setDrawAuth] = useState(true)
  const [chatLog, setChatLog] = useState([]);
  const [nowTime, setNowTime] = useState(new Date());
  const [timerTime, setTimerTime] = useState(new Date());

  const [isDrawing, setIsDrawing] = useState(false)
  const [preCoord, setPreCoord] = useState({ x: 0, y: 0 })

  const [information, setInformation] = useState({ ...roomInfo, correct: {} });

  // Canvas 요소에 접근하기 위한 Ref 생성
  const refCanvas = useRef(null);
  const refAudio = useRef(null);
  const refChat = useRef(null);
  const refInput = useRef(null);


  useEffect(() => {
    console.log(information)
    // 컴포넌트가 마운트될 때, Canvas 초기화
    const $canvas = refCanvas.current;
    const context = $canvas.getContext('2d');
    context.lineCap = 'round'
    // context.strokeStyle = 'red';
    context.clearRect(0, 0, $canvas.width, $canvas.height);

    console.log(history)
    // 히스토리 정보에 따라 그림을 그림
    if (typeof history === 'object') {
      history.forEach(e => {
        if (e.prevX === undefined) {
          context.strokeStyle = e.color;
        }
        else {
          if (e.weight) context.lineWidth = e.weight;
          context.beginPath();
          context.moveTo(e.prevX, e.prevY);
          context.lineTo(e.x, e.y);
          context.stroke();
        }
      })
    }

    // const originCondition = ws.onmessage

    // 메세지 수신
    ws.onmessage = (res) => {
      const serverMsg = JSON.parse(res.data);
      const { response, message } = serverMsg

      const $canvas = refCanvas.current;
      const context = $canvas.getContext('2d');


      console.log(serverMsg)

      if (response === 'enter') {
        if (message === 'lobby') {
          setPage('lobby');
        }
      }

      // 다른 사람의 그림 정보 받음
      if (response === 'draw') {
        const { weight, prevX, prevY, x, y } = message

        context.lineWidth = weight ? weight : context.lineWidth;
        context.beginPath();
        context.moveTo(prevX, prevY);
        context.lineTo(x, y);
        context.stroke();
      }

      // 페인트 색상 변경 요청 받음
      if (response === 'changePaint') {
        if (message === 'erase') {
          context.lineWidth = 20;
        } else {
          context.lineWidth = 1;
        }
        context.strokeStyle = message;
      }

      if (response === 'clear') {
        context.clearRect(0, 0, $canvas.width, $canvas.height);
      }

      // 채팅 정보 수신
      if (response === 'chat') {
        setChatLog((preState) => [...preState, message]);
      }

      // 방 정보 업데이트
      if (response === 'roomInfo') {

        setInformation((preState) => {
          const newState = { ...preState }
          Object.keys(message).forEach(key => {
            newState[key] = message[key];
          })
          if (preState.game && !newState.game) {
            context.clearRect(0, 0, $canvas.width, $canvas.height);
            setDrawAuth(true)
          }
          return newState;
        })
      }

      if (response === 'present') setDrawAuth(true);
      if (response === 'solver') setDrawAuth(false);

      // 게임 시작
      if (response === 'present' || response === 'solver') {

        const { round, presenter, answer, roundTime } = message;

        setInformation((preState) => {
          const newState = { ...preState };
          newState.presenter = presenter;
          newState.round = round;

          if (response === 'present') {
            newState.answer = answer;
          }

          if (response === 'solver') {
            newState.answer = '';
          }
          return newState;
        })


        // 캔버스 초기화
        context.clearRect(0, 0, $canvas.width, $canvas.height);

        setTimerTime(() => {
          const nowTime = new Date();
          return nowTime.setMilliseconds(nowTime.getMilliseconds() + parseInt(roundTime));
        })

      }

      // 누군가 정답을 맞춤
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

  // 채팅 올라올 시 스크롤 맨 하단으로
  useEffect(() => {
    const $chat = refChat.current
    const substract = $chat.scrollHeight - $chat.scrollTop
    if (substract > 115 && substract < 119)
      $chat.scrollTop = $chat.scrollHeight;
    // if ($chat.scrollHeight === 116)
    //   $chat.scrollTop = $chat.scrollHeight;
  }, [chatLog])

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

    // 서버에 그림 정보 전송
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
    e.preventDefault();

    if (!drawAuth) return;

    const $canvas = refCanvas.current;
    const context = $canvas.getContext('2d');

    if (ws.readyState !== ws.OPEN) return;

    if (e.button === 2) {
      context.lineWidth = 20
    } else if (e.button === 0 && context.strokeStyle !== '#ffffff') {

      context.lineWidth = 1
    }


    // 그림 그리기 시작
    setIsDrawing(true)

    // 현재 마우스 위치
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // 이전 마우스 위치
    const prevX = x;
    const prevY = y;

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
        weight: context.lineWidth,
        prevX,
        prevY,
        x,
        y,
      }
    }))

    // 현재 마우스 위치를 이전 위치로 초기화
    setPreCoord({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    })
  };

  // 마우스 클릭을 놓을 때 호출되는 이벤트 핸들러
  const handleMouseUp = (e) => {
    e.preventDefault();
    console.log(e)

    const $canvas = refCanvas.current;
    const context = $canvas.getContext('2d');

    if (e.button === 2 && context.strokeStyle !== '#ffffff') {
      context.lineWidth = 1
    }

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
    if (information.roomMember.length < 2) return
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
    if (information.presenter === userName) return;

    const $input = event.target.chatContent;
    const content = $input.value;
    event.target.chatContent.value = '';

    if (!content) return;
    $input.focus();

    // 채팅 내용 전송
    ws.send(JSON.stringify({
      name: userName,
      location,
      request: 'chat',
      data: content
    }))

    // state
    setChatLog((preState) => [...preState, { chatter: userName, content }]);

  }

  const UserView = (props) => {
    const { player } = props;
    return (
      <div className='userWrap'>
        <div className='user'>
          <div className='userNameArea'>
            <div className='userNameTitle'>
              닉네임
            </div>
            <div className='userName'>
              {
                player
                  ? player
                  : <></>
              }
            </div>
          </div>
          <div className='correctArea'>
            {
              player
                ? '정답 ' + (information?.correct[player] ? information.correct[player] : 0) + '개'
                : <></>
            }
          </div>
        </div>
      </div>
    )
  }

  const setDrawColor = (color) => {
    return () => {
      const $canvas = refCanvas.current;
      const context = $canvas.getContext('2d');

      ws.send(JSON.stringify({
        name: userName,
        location,
        request: 'changePaint',
        data: color
      }))

      if (color === 'white') {
        context.lineWidth = 20;

      }
      if (color === 'clear') {
        ws.send(JSON.stringify({
          name: userName,
          location,
          request: 'clear',
        }))
        context.clearRect(0, 0, $canvas.width, $canvas.height);

      } else context.strokeStyle = color;


    }
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
              ? <button className='bgBlue' onClick={startGame}>시작하기</button>
              : <></>
          }
          <button className='bgRed' onClick={exitRoom}>나가기</button>
        </div>
        <div className='gameInfoArea'>
          <div className='roundArea'>
            <div className='roundTitle'>
              Round
            </div>
            <div className='round'>
              {
                information.round
                  ? information.round
                  : <></>
              }
            </div>
          </div>
          <div className='timeArea'>
            <div className='timeTitle'>
              Time
            </div>
            <div className='time'>
              <span>
                {
                  timerTime > nowTime
                    ? String(Math.floor((timerTime - nowTime) / 1000 / 60)).padStart(2, '0')
                    : '00'
                }
              </span>
              <span>:</span>
              <span>
                {
                  timerTime > nowTime
                    ? (String(Math.floor((timerTime - nowTime) / 1000 % 60))).padStart(2, '0')
                    : '00'
                }
              </span>
            </div>

          </div>

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
          <UserView player={information?.roomMember[2]} />
          <UserView player={information?.roomMember[4]} />
        </div>
        <div className='canvasArea'>
          <div className='answerArea'>
            {
              information.answer ? information.answer : <></>
            }
          </div>
          <div className='canvasWrap'>
            <canvas
              ref={refCanvas}
              width={450}
              height={280}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseOut={handleMouseLeave}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
        <div className='userArea2'>
          <UserView player={information?.roomMember[1]} />
          <UserView player={information?.roomMember[3]} />
          <UserView player={information?.roomMember[5]} />
        </div>

      </div>

      <div className='canvasControlArea'>
        <img src='/img/ink/black.png' onClick={setDrawColor('black')} />
        <img src='/img/ink/red.png' onClick={setDrawColor('red')} />
        <img src='/img/ink/orange.png' onClick={setDrawColor('orange')} />
        <img src='/img/ink/yellow.png' onClick={setDrawColor('yellow')} />
        <img src='/img/ink/green.png' onClick={setDrawColor('green')} />
        <img src='/img/ink/purple.png' onClick={setDrawColor('purple')} />
        {/* <button onClick={setDrawColor('red')} className='cRed'>🖋️</button>
        <button onClick={setDrawColor('orange')} ><img src='img/ink/orange.png' /></button>
        <button onClick={setDrawColor('yellow')} ><img src='/img/ink/yellow.png' /></button>
        <button onClick={setDrawColor('green')} ><img src='/img/ink/green.png' /></button>
        <button onClick={setDrawColor('blue')} ><img src='/img/ink/blue.png' /></button>
        <button onClick={setDrawColor('purple')} ><img src='/img/ink/purple.png' /></button> */}
        <button onClick={setDrawColor('white')} className='white'>🧽</button>
        <button onClick={setDrawColor('clear')} className='clear'>♻️</button>
      </div>

      <div className='chatArea' onClick={() => { refInput.current.focus(); }}>
        <div ref={refChat} className='chatView'>
          {
            chatLog.map((chat, index) => (
              <div key={index}>
                {chat.chatter + ': ' + chat.content}
              </div>
            ))
          }
        </div>
        <form className='chatInput' onSubmit={sendChat}>
          <div className='inputArea'>
            <input ref={refInput} name='chatContent'></input>
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
