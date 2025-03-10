const SearchBar = () => {
    return (
        <div className="flex items-center justify-center mt-10">
        <input
            type="text"
            placeholder="Search for a movie"
            className="px-4 py-2 w-1/2 border border-gray-300 rounded-md"
        />
        <button className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md">
            Search
        </button>
        </div>
    )
}

export default SearchBar