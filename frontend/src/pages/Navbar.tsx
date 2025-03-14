import { Book } from "lucide-react"

const Navbar = () => {
  return (
    <nav className="text-white bg-transparent  flex items-center justify-between p-4 px-8 lg:px-16 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6 text-white" />
          <span className="text-xl font-bold">LMSENSA+</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-yellow-100"><a href="/">Home</a></span>
          <span><a href="search">Search</a></span>
          <div className="flex items-center gap-2">
            <div className="bg-teal-500 rounded-full h-8 w-8 flex items-center justify-center text-white">
              AE
            </div>
            <span>Ali</span>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      </nav>
  )
}

export default Navbar