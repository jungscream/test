// --- [1] MQTT 브로커 생성 (Aedes) ---
const aedes = require('aedes')();
const net = require('net');
const mqttServer = net.createServer(aedes.handle);
mqttServer.listen(1883, () => console.log('MQTT 브로커 동작중 (1883 포트)'));

// --- [2] Express HTTP API 서버 ---
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const app = express();
app.use(cors());

// s3
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const REGION = 'ap-northeast-2';
const s3 = new S3Client({ region: REGION });
const BUCKETNAME = "iot-teamproject-data";
const SLEEPKEY = `sleep/${new Date().toISOString().split('T')[0]}.json`;
const STRESSKEY = `stress/${new Date().toISOString().split('T')[0]}.json`;

// async function s3putObject(key, data) {
//   const command = new PutObjectCommand({
//       Bucket: BUCKETNAME,
//       Key: key,
//       Body: JSON.stringify(data, null, 2)
//   });
//   try {
//       await s3.send(command);
//   } catch (err) {
//       console.error(`S3 저장 실패`, err.message);
//   }
// }

async function s3putObject(key, data) {
  const command = new PutObjectCommand({
      Bucket: BUCKETNAME,
      Key: key,
      Body: JSON.stringify(data, null, 2)
  });
  try {
    console.log(`🚀 S3 업로드 시작: key=${key}`);
    const result = await s3.send(command);
    console.log('✅ S3 업로드 성공:', result);
    return result;
  } catch (err) {
    console.error('❌ S3 저장 실패:', err.message);
    throw err;
  }
}


const MQTT_TOPIC = 'iot/stretch';
const FITBIT_TOKEN_PATH = './secret.txt';

var app_id;
var auth_code;
var authorizationCode;
var ACCESS_TOKEN;

const dumy_stress_data = [20,40,50,80,10];
const dumy_sleep_data = {
  "hour" : 6,
  "minutes" : 42,
  "avgHours" : 7,
  "avgMins" : 30,
  "restAdvice" : 5
}

function loadAccessToken() {
  const jsonString = fs.readFileSync(FITBIT_TOKEN_PATH, 'utf-8');
  const data = JSON.parse(jsonString);

  app_id = data.app_id;
  auth_code = data.auth_code;

  console.log("app_id = ", app_id);
  console.log("auth_code = ", auth_code);
}

//oauth 에서 redirect 받기
app.get('/', (req, res) => {
  authorizationCode = req.query.code;

  if (authorizationCode) {
    console.log('Fitbit에서 받은 인증 코드:', authorizationCode);
  } else {
    console.error('URL에서 인증 코드를 찾을 수 없습니다.', req.query);
  }

  const url = 'https://api.fitbit.com/oauth2/token';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode
  }).toString();

  axios.post(url, params, {
    headers: {
      'Authorization': `${auth_code}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  })
  .then(response => {
    ACCESS_TOKEN = response.data.access_token;
    console.log("access token : ", ACCESS_TOKEN);
    res.send(`access token ${ACCESS_TOKEN}`);
  })
  .catch(err => {
    if (err.response) {
      console.error('에러:', err.response.status, err.response.data);
    } else {
      console.error('에러:', err.message);
    }
  });
});

app.get('/api/start', async (req, res) => {
  const token = loadAccessToken();
  try {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id : app_id,
        scope: 'activity cardio_fitness electrocardiogram heartrate irregular_rhythm_notifications location nutrition oxygen_saturation profile respiratory_rate settings sleep social temperature weight'
    });
    const url = `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
    
    res.redirect(url);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 원래 코드//
// app.get('/api/sleep', async (req, res) => {
  
//   const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
//   const url = `https://api.fitbit.com/1.2/user/-/sleep/date/${yesterday}.json`;
//   var response_sleep_time;

//   axios.get(url, {
//       headers: {
//         'accept': 'application/json',
//         'authorization': `Bearer ${ACCESS_TOKEN}`
//       }
//     })
//     .then(response => {
//       console.log(response.data);
//       response_sleep_time = response.data.summary.totalMinutesAsleep;
//       res.send(dumy_sleep_data);
//     })
//     .then(s3putObject(SLEEPKEY,dumy_sleep_data))
//     .catch(error => {
//       console.error(error.response?.data || error.message);
//     });
// });

app.get('/api/stress', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.fitbit.com/1/user/-/hrv/date/${today}.json`;

  try {
    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${ACCESS_TOKEN}`
      }
    });

    const response_stress = response.data?.hrv?.[0]?.value?.dailyRmssd ?? null;
    console.log('✅ Fitbit 데이터:', response_stress);

    const s3Result = await s3putObject(STRESSKEY, dumy_stress_data);
    console.log('✅ S3 저장 완료:', s3Result);

    res.send({
      success: true,
      data: "hello world"
    });

  } catch (error) {
    console.error('❌ 오류:', error.message || error);
    res.status(500).send({
      success: false,
      error: 'Fitbit API 또는 S3 저장 중 오류 발생'
    });
  }
});


app.get('/api/sleep', async (req, res) => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const url = `https://api.fitbit.com/1.2/user/-/sleep/date/${yesterday}.json`;

  try {
    const response = await axios.get(url, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    console.log(response.data);
    const response_sleep_time = response.data.summary.totalMinutesAsleep;
    res.send(dumy_sleep_data);
    await s3putObject(SLEEPKEY, dumy_sleep_data);

  } catch (error) {
    console.error('에러 발생:', error.response?.data || error.message);
    res.status(500).send('에러 발생');
  }
});




app.listen(3000, () => console.log('HTTP API 서버(3000)'));

// s3putObject(STRESSKEY, dumy_stress_data);
// s3putObject(SLEEPKEY, dumy_sleep_data);


// --- [3] 스트레칭 알림 주기적 MQTT 전송 ---
const mqtt = require('mqtt');
const { json } = require('stream/consumers');
const MQTT_SERVER = 'mqtt://localhost:1883';
const mqttClient = mqtt.connect(MQTT_SERVER);

async function pollActivity() {
  const token = loadAccessToken();
  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.fitbit.com/1/user/-/activities/date/${today}.json`;
  try {
    const fitbitRes = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    // 실사용 환경에 맞는 조건 추가 필요
    const steps = fitbitRes.data.summary?.steps || 0;
    if (steps < 2000) {
      mqttClient.publish(MQTT_TOPIC, JSON.stringify({event: "stretch"}));
      console.log("스트레칭 이벤트 MQTT 전송");  
    }
  } catch (e) {
    console.error('활동량 체크 에러:', e.message);
  }
}
setInterval(pollActivity, 600000);  // 10분마다 실행 (ms 단위)
