import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || 'ap-south-1';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function main() {
  try {
    console.log(`Setting CORS for bucket: ${BUCKET}...`);
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000
          }
        ]
      }
    });
    
    await s3.send(command);
    console.log("CORS configuration successfully applied!");
  } catch (err) {
    console.error("Error setting CORS:", err);
  }
}

main();
