const express = require('express');

const app = express();

// 인증서 경로 설정
// 기본 라우터
app.get('/', (req, res) => {
  res.send('✅ HTTPS 서버 성공적으로 작동 중입니다!');
});

app.listen(3000, () => console.log('HTTP API 서버(3000)'));