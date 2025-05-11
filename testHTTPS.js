const fs = require('fs');
const https = require('https');
const express = require('express');

const app = express();

// 인증서 경로 설정
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/jungscream.shop/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/jungscream.shop/fullchain.pem')
};

// 기본 라우터
app.get('/', (req, res) => {
  res.send('✅ HTTPS 서버 성공적으로 작동 중입니다!');
});

// HTTPS 서버 실행 (443 포트)
https.createServer(options, app).listen(443, () => {
  console.log('✅ HTTPS 서버 실행 중 (포트 443)');
});
