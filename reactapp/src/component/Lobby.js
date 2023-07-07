import { useState, useRef, useEffect } from 'react';


const Lobby = (props) => {
  const { appStateSet, userName, ws, roomList } = props;
  const { setPage, setHistory, setLocation, setRoomList, setMaster, setRoomInfo } = appStateSet;

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

export { Lobby };