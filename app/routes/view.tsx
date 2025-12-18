import {useEffect, useState, useRef} from "react";
import {STSClient, AssumeRoleCommand} from "@aws-sdk/client-sts";
import QRCode from "qrcode";

interface Credentials {
    AccessKeyId: string;
    SecretAccessKey: string;
    SessionToken: string;
    Expiration: Date;
}

export default function View() {
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expiration, setExpiration] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [qrTimeLeft, setQrTimeLeft] = useState("");
    const [poolSize, setPoolSize] = useState(0);
    const [currentUrl, setCurrentUrl] = useState("");

    const [currentCredential, setCurrentCredential] = useState<Credentials | null>(null);
    const currentCredentialRef = useRef<Credentials | null>(null);

    const credentialPool = useRef<Credentials[]>([]);
    const stsClient = useRef<STSClient | null>(null);
    const rotationInterval = useRef<NodeJS.Timeout | null>(null);
    const poolingInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        initializeRotation();
        return () => {
            if (rotationInterval.current) clearInterval(rotationInterval.current);
            if (poolingInterval.current) clearInterval(poolingInterval.current);
        };
    }, []);

    useEffect(() => {
        if (!currentCredential) return;

        const interval = setInterval(() => {
            const now = new Date();
            const diff = currentCredential.Expiration.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("Expired");
                setQrTimeLeft("Expired");
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            // Real expiration countdown
            setTimeLeft(`${minutes}m ${seconds}s`);

            // QR rotation countdown (30s before expiration)
            const qrDiff = diff - 30000; // 30 seconds earlier
            if (qrDiff <= 0) {
                setQrTimeLeft("Rotating now");
            } else {
                const qrMinutes = Math.floor(qrDiff / 60000);
                const qrSeconds = Math.floor((qrDiff % 60000) / 1000);
                setQrTimeLeft(`${qrMinutes}m ${qrSeconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentCredential]);

    const initializeRotation = async () => {
        try {
            const accessKey = localStorage.getItem("awsAccessKey");
            const secretKey = localStorage.getItem("awsSecretKey");
            const roleArn = localStorage.getItem("iamRoleArn");

            if (!accessKey || !secretKey || !roleArn) {
                setError("Missing required configuration");
                setLoading(false);
                return;
            }

            stsClient.current = new STSClient({
                region: "us-west-2",
                credentials: {
                    accessKeyId: accessKey,
                    secretAccessKey: secretKey,
                },
            });

            // Get first credential and show QR immediately
            const firstCredential = await getTempCredentials();
            setCurrentCredential(firstCredential);
            currentCredentialRef.current = firstCredential;
            await updateQRCode(firstCredential);
            setLoading(false);

            // Start rotation check immediately
            startRotationCheck();

            // Start building credential pool (6 more credentials, 2 minutes apart)
            let poolCount = 0;
            const testMode = false;
            const poolInterval = testMode ? 30 * 1000 : 2 * 60 * 1000; // 30s in test mode, 2min in production

            poolingInterval.current = setInterval(async () => {
                if (poolCount < 6) {
                    const newCredential = await getTempCredentials();
                    credentialPool.current.push(newCredential);
                    setPoolSize(credentialPool.current.length);
                    poolCount++;
                }
            }, poolInterval);

        } catch (err) {
            setError(`Error initializing: ${err}`);
            setLoading(false);
        }
    };

    const getTempCredentials = async (): Promise<Credentials> => {
        const roleArn = localStorage.getItem("iamRoleArn");
        const testMode = false;

        if (testMode) {
            // Mock credentials for testing with 3-minute expiry
            return {
                AccessKeyId: `AKIA${Math.random().toString(36).substring(2, 18).toUpperCase()}`,
                SecretAccessKey: Math.random().toString(36).substring(2, 42),
                SessionToken: Math.random().toString(36).substring(2, 100),
                Expiration: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes from now
            };
        }

        const command = new AssumeRoleCommand({
            RoleArn: roleArn!,
            RoleSessionName: `kvs-webrtc-${Date.now()}`,
            DurationSeconds: 900,
        });

        const response = await stsClient.current!.send(command);
        const creds = response.Credentials!;

        return {
            AccessKeyId: creds.AccessKeyId!,
            SecretAccessKey: creds.SecretAccessKey!,
            SessionToken: creds.SessionToken!,
            Expiration: new Date(creds.Expiration!),
        };
    };

    const startRotationCheck = () => {
        // Check every 30 seconds for credential rotation
        rotationInterval.current = setInterval(async () => {
            try {
                if (!currentCredentialRef.current) return;
                const now = new Date();
                const currentExpiry = currentCredentialRef.current.Expiration.getTime();
                const timeUntilExpiry = currentExpiry - now.getTime();

                console.log(`Time until expiry: ${Math.floor(timeUntilExpiry / 1000)}s, Pool size: ${credentialPool.current.length}`);

                // If current credential expires in less than 30 seconds, find replacement
                if (timeUntilExpiry < 30000) {
                    console.log("Rotating credential - less than 30s left");

                    // Get all credentials (current + pool) with >30s remaining
                    const allCredentials = currentCredentialRef.current ? [currentCredentialRef.current, ...credentialPool.current] : credentialPool.current;
                    const validCredentials = allCredentials.filter(cred =>
                        cred.Expiration.getTime() - now.getTime() > 30000
                    );

                    let nextCredential: Credentials;
                    if (validCredentials.length > 0) {
                        // Sort by expiration time and use the oldest (closest to expiring)
                        validCredentials.sort((a, b) => a.Expiration.getTime() - b.Expiration.getTime());
                        nextCredential = validCredentials[0];
                        credentialPool.current = credentialPool.current.filter(c => c !== nextCredential);
                        console.log("Used oldest valid credential");
                    } else {
                        nextCredential = await getTempCredentials();
                        console.log("Generated new credential");
                    }

                    setCurrentCredential(nextCredential);
                    currentCredentialRef.current = nextCredential;
                    await updateQRCode(nextCredential);
                    setPoolSize(credentialPool.current.length);
                }
            } catch (error) {
                console.error("Rotation failed:", error);
            }
        }, 2 * 1000); // Check every 2 seconds
    };

    const updateQRCode = async (credential: Credentials) => {
        const channelName = localStorage.getItem("signalingChannelName");

        const params = new URLSearchParams({
            channelName: channelName!,
            region: "us-west-2",
            accessKeyId: credential.AccessKeyId,
            secretAccessKey: credential.SecretAccessKey,
            sessionToken: credential.SessionToken,
            sendVideo: "false",
            sendAudio: "false",
            "ingest-media": "true",
            "ingest-media-manual-on": "false",
            openDataChannel: "false",
            view: "viewer",
        });

        const url = `https://sirknightj.github.io/amazon-kinesis-video-streams-webrtc-sdk-js/examples/index.html?${params}`;
        setCurrentUrl(url);
        const qrDataUrl = await QRCode.toDataURL(url);
        setQrCodeUrl(qrDataUrl);
        setExpiration(credential.Expiration);
    };

    const openInNewTab = () => {
        if (currentUrl) {
            window.open(currentUrl, '_blank');
        }
    };

    const manualRefresh = async () => {
        try {
            console.log("Manual refresh triggered");
            let nextCredential: Credentials;
            if (credentialPool.current.length > 0) {
                nextCredential = credentialPool.current.shift()!;
                console.log("Using credential from pool for manual refresh");
            } else {
                console.log("Pool empty, generating new credential for manual refresh");
                nextCredential = await getTempCredentials();
            }

            setCurrentCredential(nextCredential);
            currentCredentialRef.current = nextCredential;
            await updateQRCode(nextCredential);
            setPoolSize(credentialPool.current.length);
            console.log("Manual refresh complete");
        } catch (error) {
            console.error("Manual refresh failed:", error);
            setError(`Manual refresh failed: ${error}`);
        }
    };

    const copyToClipboard = async () => {
        if (currentUrl) {
            await navigator.clipboard.writeText(currentUrl);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <p className="text-gray-700">Generating QR code...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
                    <p className="text-gray-700">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <h1 className="text-2xl font-bold mb-4 text-gray-900">KVS WebRTC Viewer</h1>
                {currentCredential && (
                    <div className="text-sm text-gray-600 mb-4">
                        <p>Expires: {currentCredential.Expiration.toLocaleString()} ({timeLeft})</p>
                        <p className="font-semibold">QR rotates in: {qrTimeLeft}</p>
                    </div>
                )}
                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-4"/>}
                <div className="space-x-2">
                    {currentUrl && (
                        <button
                            onClick={openInNewTab}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            Open in New Tab
                        </button>
                    )}
                    <button
                        onClick={manualRefresh}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Refresh QR Now
                    </button>
                    {currentUrl && (
                        <button
                            onClick={copyToClipboard}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Copy Link
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
