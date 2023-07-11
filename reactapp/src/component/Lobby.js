import { useState, useRef, useEffect } from 'react';


const Lobby = (props) => {
  const { appStateSet, userName, ws, roomList } = props;
  const { setPage, setLocation, setRoomList, setRoomInfo } = appStateSet;

  const [html, setHtml] = useState([])

  useEffect(() => {
    if (roomList.length > 0) {
      console.log(roomList)
      const arr = []
      roomList.forEach((e, i) => {
        const { roomId, title, roomMember, roomMaster, game } = e

        arr.push(
          <tr key={i} onClick={() => enterRoom(roomId)}>
            <td className='number'>{roomId}</td>
            <td className='title'>{title}</td>
            <td className='master'>{roomMaster}</td>
            <td className='member'>{roomMember} / 6</td>
            <td className='status'>{game ? '게임중' : '대기중'}</td>
          </tr>
        )
      })
      setHtml(arr)
    } else {
      setHtml(<></>)
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

    // 메세지 수신
    ws.onmessage = (res) => {
      const serverMsg = JSON.parse(res.data);
      const { response, message } = serverMsg;
      console.log(serverMsg)

      if (response === 'error') {
        if (message === 'duplicated name') {
          alert('중복된 닉네임입니다!\n다른 닉네임을 입력해주세요')
          setPage('setName');
        } else if (message === 'room does not exist') {
          alert('존재하지 않는 방입니다')
        } else if (message === 'member is full') {
          alert('정원이 꽉 찼습니다')
        }
      }

      if (response === 'roomList') {
        setRoomList(message)
      }

      if (response === 'enter') {
        if (message !== 'lobby') {
          const { roomId, roomMember, roomMaster, history } = message

          setRoomInfo({ ...message })
          setLocation(roomId)

          setPage('room')
        }

      }
    }

    return () => {
      clearInterval(getRoomList);
    };
  }, [])

  // 방 만들기
  const createRoom = () => {
    ws.send(JSON.stringify({
      name: userName,
      location: 'lobby',
      request: 'createRoom'
    }))
  }

  // 방 입장
  const enterRoom = (id) => {
    ws.send(JSON.stringify({
      name: userName,
      location: 'lobby',
      request: 'locate',
      data: id
    }))
  }

  return (
    <div className='lobby'>
      <div className='headArea'>
        <div className='logo'>

        </div>

        <div className='rightArea'>
          <div className='nameArea'>
            <div className='nameTitle'>닉네임</div>
            <div className='nameWrap'>{userName}</div>
          
          </div>
          <div className="buttonArea">
            <button className='bgYellow' onClick={() => {setPage('setName')}}>닉네임 <br />변경하기</button>
            <button className='bgBlue' onClick={createRoom}>방 만들기</button>
          </div>
        </div>

      </div>


      <div className="roomList">
        <table>
          <thead>
            <tr>
              <th className='number'>번호</th>
              <th className='title'>방제목</th>
              <th className='master'>방장</th>
              <th className='member'>인원</th>
              <th className='status'>상태</th>
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

export { Lobby };