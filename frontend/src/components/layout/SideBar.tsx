const SideBar = () => {
  // This is the sidebar component that will be displayed on the left side of the screen.
    return (
        <div className="bg-gray-800 h-screen w-64">
        <div className="flex items-center justify-center mt-10">
            <img
            className="h-12 w-12 rounded-full"
            src="https://randomuser.me/api/portraits"
            alt="User"
            />
        </div>
        <nav className="mt-10">
            <a
            href="#"
            className="flex items-center mt-4 py-2 px-6 bg-gray-900 text-gray-100"
            >
            <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 12H4"
                />
            </svg>
            <span className="mx-3">Dashboard</span>
            </a>
            <a
            href="#"
            className="flex items-center mt-4 py-2 px-6 text-gray-200"
            >
            <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 12H4"
                />
            </svg>
            <span className="mx-3">Projects</span>
            </a>
            <a
            href="#"
            className="flex items-center mt-4 py-2 px-6 text-gray-200"
            >
            <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 12H4"
                />
            </svg>
            <span className="mx-3">Team</span>
            </a>
            <a
            href="#"
            className="flex items-center mt-4 py-2 px-6 text-gray-200"
            >
            <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 12H4"
                />
            </svg>
            <span className="mx-3">Calendar</span>
            </a>
        </nav>
        </div>
    )
}

export default SideBar