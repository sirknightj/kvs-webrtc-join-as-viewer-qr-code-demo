# Rotating QR Code Display for KVS WebRTC JS

A simple application that generates rotating QR codes to grant temporary Kinesis Video Streams (KVS) WebRTC viewer access.

## How it works

1. Uses STS to fetch short-lived temporary credentials 
2. Generates a QR Code to the KVS Sample App to join as a viewer with pre-filled credentials and page configuration settings
3. Rotates the QR Code when the credentials are nearing expiry

## Getting started

1. **Login**: Enter AWS Access Key and Secret Key
2. **Configure**: Set IAM Role ARN and Signaling Channel Name  
3. **View**: Displays rotating QR codes that link to the KVS WebRTC viewer

This app automatically:
- Assumes the specified IAM role to get temporary credentials (15-minute duration, which is the minimum allowed by IAM)
- Generates QR codes linking to the WebRTC viewer with embedded credentials and preconfigured setup
- Rotates QR codes 30 seconds before credential expiration
- Maintains a pool of future credentials for seamless rotation

The app does not set the `clientId` in the QR codes.
The WebRTC viewer app itself should generate a random `clientId` for each QR code scan. 

## Local development

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Application available at `http://localhost:5173`

## Configuration

### Required AWS Setup

1. **IAM User**: Create an IAM user with assume role permissions.
2. **AWS Credentials**: Access key with permission to assume the IAM role.
3. **IAM Role**: Create a role with KVS WebRTC permissions, and with the trust policy allowing `AssumeRole` from the IAM user.
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "Statement1",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::123456789012:user/DemoUser"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }
   ```
4. **Signaling Channel**: Create a KVS signaling channel.
5. **Master device**: Use one of the KVS WebRTC samples to stream to the signaling channel as master.

### URL Parameters (Optional)

Quick setup via URL parameters:
- `accessKey` - AWS Access Key ID
- `secretKey` - AWS Secret Access Key  
- `channelName` - KVS Signaling Channel Name
- `roleArn` - IAM Role ARN

Example:
```
/?accessKey=ABCD1234&secretKey=ABCD1234&roleArn=arn%3Aaws...&channelName=demo-channel
```

> [!NOTE]
> The query parameters must be URL-encoded (do not put `:`:, `/`, `=` in the parameters).

## Routes

- `/` - Login page (AWS credentials)
- `/configure` - Configuration page (Role ARN, Channel Name)
- `/view` - QR code display with automatic rotation
