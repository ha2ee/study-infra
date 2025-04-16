const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public"));

//MongoDB 연결
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chat")
  .then(() => console.log("MongoDB 연결 성공"))
  .catch((err) => console.error("MongoDB 연결 오류:", err));

//메시지 스키마 정의
const messageSchema = new mongoose.Schema({
  room: String,
  username: String,
  message: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

//메시지 모델 생성
const Message = mongoose.model("Message", messageSchema);

// 소켓 연결 처리
io.on("connection", (socket) => {
  console.log("사용자 연결됨: ", socket.id);

  //채팅방 입장 이벤트
  socket.on("join_room", async (roomId) => {
    socket.join(roomId);
    console.log(`사용자 ${socket.id}가 ${roomId}, 방에 입장했습니다.`);

    try {
      //이전 메시지 로드(최근 50개)
      const message = await Message.find({ room: roomId })
        .sort({ createdAt: -1 })
        .limit(50);

      socket.emit("load_messages", message.reverse());
    } catch (error) {
      console.error("메시지 로드 오류 : ", error);
    }
  });

  //메시지 수신 및 저장 이벤트
  socket.on("send_message", async (data) => {
    try {
      //메시지 저장
      const newMessage = new Message({
        room: data.room,
        username: data.username,
        message: data.message,
      });

      await newMessage.save();

      //같은 방에 있는 모든 사용자들에게 메시지 전송
      io.to(data.room).emit("receive_message", {
        room: data.room,
        username: data.username,
        message: data.message,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error("메시지 저장 오류 : ", error);
    }
  });

  //연결 해제 이벤트
  socket.on("disconnect", () => {
    console.log("사용자 연결 해제됨: ", socket.id);
  });
});

// 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행중입니다.`);
});
