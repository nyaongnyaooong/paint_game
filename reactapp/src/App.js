import './css/app.css';

const CreateId = () => {
  return (
    <div className="App">
      <form class="login" method="get" action="/lobby">
        <div class="inputArea">
          <span>닉네임을 입력해주세요</span>
          <input name="nickName" />
        </div>

        <div class="buttonArea">
          <button class="btn_start">게임 시작</button>
        </div>
      </form>
    </div>
  );

};

const Lobby = () => {
  return (
    <div className="App">
      <div className='room'>

      </div>
    </div>
  );
};

const App = () => {
  return <CreateId/>
}

export default App;
