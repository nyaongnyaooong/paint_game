
// const req = async () => {
//   try {
//     const response = await fetch('/test', {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//     });

//     if (response.ok) {
//       console.log(response)

//     } else {
//       throw new Error('요청 실패');
//     }
//   } catch (error) {
//     console.log('요청 실패:', error);
//   }
// }
// req();

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

// 웹 페이지 닉네임 표시
const $name = document.querySelector(".title h4")
$name.innerHTML = userName

// Functions --------------------------

const changeName = () => {
  window.location.href = '/setname'
}

const createRoom = () => {
  window.location.href = '/setname'
}

const getRoomList = async () => {
  try {
    const roomList = await axios.get('/room');

    // tbody 요소를 선택합니다.
    const tbody = document.querySelector('.roomList tbody');
    console.log(1)
    console.log(roomList)

    roomList.forEach(e => {
      var tr = document.createElement('tr');
      var tdNumber = document.createElement('td');
      var tdTitle = document.createElement('td');
      var tdCreator = document.createElement('td');
      tr.appendChild(tdNumber);
      tr.appendChild(tdTitle);
      tr.appendChild(tdCreator);
      tbody.appendChild(tr);
    });
  } catch (err) {

  }
}

// getRoomList();


const host = window.location.host;
const webSocket = new WebSocket("ws://" + host);

// 2. 웹소켓 이벤트 처리
// 2-1) 연결 이벤트 처리
webSocket.onopen = () => {
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

}

const timer = setInterval(() => {
  if (webSocket.readyState === webSocket.OPEN) {
    console.log('상태보냄');
    webSocket.send(JSON.stringify({
      name: userName,
      location: 'lobby',
      request: 'roomList'
    }))
  }
}, 1000)