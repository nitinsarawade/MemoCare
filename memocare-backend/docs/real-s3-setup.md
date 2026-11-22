# Setting up real cloud storage (S3) — optional

By default MemoCare stores uploaded audio/video files on your own
disk (`STORAGE_DRIVER=local`), which is completely real and fine for
a demo or local project. This is only needed if you want files stored
in the cloud instead — for example if you deploy the backend to a
server later and don't want media living on that one machine's disk.

The storage code fully supports real S3 now (previously this branch
just threw an error) — you only need your own AWS account and bucket
to turn it on.

## 1. Create an AWS account (free tier available)
https://aws.amazon.com/free/

## 2. Create an S3 bucket
1. Go to the S3 console → **Create bucket**
2. Give it a globally-unique name, e.g. `memocare-media-yourname`
3. Pick a region (e.g. `us-east-1`) — remember it, you'll need it below
4. Leave "Block all public access" ON (the app uses signed URLs, files
   should not be public)

## 3. Create an IAM user with S3 access
1. Go to IAM → Users → **Create user**
2. Attach the `AmazonS3FullAccess` policy (or a tighter custom policy
   scoped to just your bucket, for production)
3. Create an **Access key** for that user (choose "Application running
   outside AWS") — copy the Access Key ID and Secret Access Key

## 4. Update your `.env`
```
STORAGE_DRIVER=s3
S3_REGION=us-east-1
S3_BUCKET=memocare-media-yourname
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=
```
Leave `S3_ENDPOINT` blank for real AWS — it's only needed for
S3-compatible alternatives like Cloudflare R2, MinIO, or DigitalOcean
Spaces.

## 5. Restart and test
```powershell
npm run dev
npm run worker
```
Upload an audio/video file — it should now land in your S3 bucket
instead of the local `uploads/` folder, and playback URLs will be
real time-limited presigned S3 links instead of `localhost` ones.

## Cost note
S3 isn't free forever — AWS free tier covers a generous amount for 12
months, then it's pay-as-you-go (typically fractions of a cent per
GB/month for storage this small). For a course project or local demo,
sticking with `STORAGE_DRIVER=local` is simpler and costs nothing.
