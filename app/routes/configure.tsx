import {useState, useEffect} from "react";
import {useNavigate} from "react-router";

export default function Configure() {
    const [roleArn, setRoleArn] = useState("");
    const [channelName, setChannelName] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const storedRoleArn = localStorage.getItem("iamRoleArn");
        const storedChannelName = localStorage.getItem("signalingChannelName");
        if (storedRoleArn) setRoleArn(storedRoleArn);
        if (storedChannelName) setChannelName(storedChannelName);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem("iamRoleArn", roleArn);
        localStorage.setItem("signalingChannelName", channelName);
        navigate("/view");
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Configure</h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 text-gray-700">IAM Role ARN</label>
                        <input
                            type="text"
                            value={roleArn}
                            onChange={(e) => setRoleArn(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                            placeholder="arn:aws:iam::123456789012:role/MyRole"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2 text-gray-700">Signaling Channel Name</label>
                        <input
                            type="text"
                            value={channelName}
                            onChange={(e) => setChannelName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                            placeholder="my-signaling-channel"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                    >
                        Configure
                    </button>
                </form>
            </div>
        </div>
    );
}
