
const ChatWindow = () => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex items-end justify-end">
                    <div className="bg-gray-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-900">
                            Hi there! How can I help you today?
                        </p>
                    </div>
                </div>
                <div className="flex items-start justify-start mt-4">
                    <div className="bg-gray-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-900">
                            I'm looking to make a reservation.
                        </p>
                    </div>
                </div>
                <div className="flex items-end justify-end mt-4">
                    <div className="bg-gray-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-900">
                            Sure! When would you like to make the reservation?
                        </p>
                    </div>
                </div>
                <div className="flex items-start justify-start mt-4">
                    <div className="bg-gray-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-900">
                            I would like to make a reservation for 2 people on Friday at 7pm.
                        </p>
                    </div>
                </div>
            </div>
            <div className="p-4">
                <div className="flex items-center rounded-lg border border-gray-200">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="w-full p-4"
                    />
                    <button className="bg-blue-500 text-white p-4 rounded-lg">
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChatWindow