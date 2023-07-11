import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

class CustomError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'CustomError';
  }
}

const SetName = (props) => {
  const { appStateSet, userName, ws, roomList } = props;
  const { setPage, setUserName, setLocation, setRoomList, setMaster, setRoomInfo } = appStateSet;

  useEffect(() => {
    ws.onmessage = (res) => {
      const serverMsg = JSON.parse(res.data);
      const { response, message } = serverMsg;
      console.log(serverMsg)

      if (response === 'setNameSuccess') {
        const reqNameCookie = async () => {
          try {
            await axios.post('/setname', { nickName: message });
            setUserName(message);
            setPage('lobby');
          } catch (err) {

          }
        }
        reqNameCookie();
      }

      if (response === 'error') {
        if (message === 'duplicated name') alert('중복된 닉네임입니다')
      }
    }
  }, [])

  const reqSetName = async (e) => {
    e.preventDefault();
    try {
      const reqName = e.target.setNameInput.value;

      if (reqName === 'undefined') throw new CustomError('invalid')
      if (reqName === '') throw new CustomError('void')

      ws.send(JSON.stringify({
        name: userName,
        request: 'setName',
        data: reqName
      }))

    } catch (err) {
      if (err instanceof CustomError) {
        if (err.message === 'invalid') alert('유효하지 않은 닉네임 입니다')
        if (err.message === 'void') alert('닉네임을 입력해주세요')
      }
    }
  }

  const cancelSetName = () => {
    if (!userName) alert('닉네임을 설정해야 게임이 가능합니다');
    else setPage('lobby');
  }

  return (

    <div className='setName'>
      <div className='titleArea'>
        닉네임 설정
      </div>
      <form className='formArea' onSubmit={reqSetName}>
        <div className='inputArea'>
          <input name='setNameInput' placeholder='닉네임을 입력해주세요' />

        </div>
        <div className='buttonArea'>
          <button type='button' className='cancel' onClick={cancelSetName}>취소</button>
          <button type='submit' className='confirm'>확인</button>
        </div>


      </form>
    </div>

  )
}

export { SetName };