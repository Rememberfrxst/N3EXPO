import { S3Client, PutPublicAccessBlockCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

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
    console.log(`Unblocking public access for bucket: ${BUCKET}...`);
    
    // 1. Remove Block Public Access
    const unblockCmd = new PutPublicAccessBlockCommand({
      Bucket: BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      }
    });
    await s3.send(unblockCmd);
    console.log("Public access block removed.");

    // 2. Add Bucket Policy for public read
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${BUCKET}/*`
        }
      ]
    };
    
    const policyCmd = new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(policy)
    });
    await s3.send(policyCmd);
    console.log("Bucket policy updated for public read.");
    
  } catch (err) {
    console.error("Error setting public access:", err);
  }
}

main();
