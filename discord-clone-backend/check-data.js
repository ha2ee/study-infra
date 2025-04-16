const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/chat")
  .then(async () => {
    console.log("MongoDB 연결 성공");

    // Message 모델 가져오기
    const Message =
      mongoose.models.Message ||
      mongoose.model(
        "Message",
        new mongoose.Schema({
          room: String,
          username: String,
          message: String,
          createdAt: Date,
        })
      );

    // 데이터 조회
    const messages = await Message.find().sort({ createdAt: -1 }).limit(10);
    console.log("최근 메시지들:", messages);

    mongoose.disconnect();
  })
  .catch((err) => console.error("오류:", err));
