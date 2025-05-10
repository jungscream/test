const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const REGION = 'ap-northeast-2';
const s3 = new S3Client({ region: REGION });

// s3.putObject({
//     Body: 'hello world',
//     Bucket: 'jungscream-test',
//     Key: 'my-file.txt',
// }).promise();



  const key = `test.txt`;

(async () => {
    const command = new PutObjectCommand({
        Bucket: "jungscream-test",
        Key: key,
        Body: "hello world"
    });
    try {
        await s3.send(command);
        console.log(`S3 저장 완료: ${key}`);
    } catch (err) {
        console.error(`S3 저장 실패 (${label}):`, err.message);
    }
})();

