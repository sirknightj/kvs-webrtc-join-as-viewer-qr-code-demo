import {useState, useEffect} from "react";
import {useNavigate, useSearchParams} from "react-router";

export default function Login() {
    const [accessKey, setAccessKey] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const storedAccessKey = localStorage.getItem("awsAccessKey");
        const storedSecretKey = localStorage.getItem("awsSecretKey");
        if (storedAccessKey) setAccessKey(storedAccessKey);
        if (storedSecretKey) setSecretKey(storedSecretKey);
    }, []);

    useEffect(() => {
        const urlAccessKey = searchParams.get("accessKey");
        const urlSecretKey = searchParams.get("secretKey");
        const urlChannelName = searchParams.get("channelName");
        const urlRoleArn = searchParams.get("roleArn");

        if (urlAccessKey && urlSecretKey) {
            localStorage.setItem("awsAccessKey", urlAccessKey);
            localStorage.setItem("awsSecretKey", urlSecretKey);

            if (urlChannelName && urlRoleArn) {
                localStorage.setItem("signalingChannelName", urlChannelName);
                localStorage.setItem("iamRoleArn", urlRoleArn);
                navigate("/view");
            } else {
                navigate("/configure");
            }
        } else if (urlChannelName && urlRoleArn) {
            localStorage.setItem("signalingChannelName", urlChannelName);
            localStorage.setItem("iamRoleArn", urlRoleArn);

            const existingAccessKey = localStorage.getItem("awsAccessKey");
            const existingSecretKey = localStorage.getItem("awsSecretKey");

            if (existingAccessKey && existingSecretKey) {
                navigate("/view");
            }
        }
    }, [searchParams, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem("awsAccessKey", accessKey);
        localStorage.setItem("awsSecretKey", secretKey);
        navigate("/configure");
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-gray-700">AWS Login</h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 text-gray-700">Access Key</label>
                        <input
                            type="text"
                            value={accessKey}
                            onChange={(e) => setAccessKey(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2 text-gray-700">Secret Key</label>
                        <input
                            type="password"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
