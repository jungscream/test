require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-northeast-2' });

const s3 = new AWS.S3();

s3.putObject({
    Body: 'hello world',
    Bucket: 'jungscream-test',
    Key: 'my-file.txt',
}).promise();
