const AWS = require('aws-sdk');

const s3 = new AWS.S3();

s3.putObject({
    Body: 'hello world',
    Bucket: 'jungscream-test',
    Key: 'my-file.txt',
}).promise();
