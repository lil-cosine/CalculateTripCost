function NavBar({ activeSection, setActiveSection }) {
  return (
    <nav className="flex justify-center space-x-4 p-4 bg-gray-100">
      <button
        onClick={() => setActiveSection("add")}
        className={`px-4 py-2 rounded ${
          activeSection === "add"
            ? "bg-blue-500 hover:bg-blue-400 text-white"
            : "bg-gray-300"
        }
        `}
      >
        Add Drive
      </button>
      <button
        onClick={() => setActiveSection("past")}
        className={`px-4 py-2 rounded ${
          activeSection === "past" ? "bg-blue-500 text-white" : "bg-gray-300"
        }`}
      >
        Past Drives
      </button>
      <button
        onClick={() => setActiveSection("stats")}
        className={`px-4 py-2 rounded ${
          activeSection === "stats" ? "bg-blue-500 text-white" : "bg-gray-300"
        }`}
      >
        Drive Stats
      </button>
      <button
        onClick={() => setActiveSection("mod")}
        className={`px-4 py-2 rounded ${
          activeSection === "mod" ? "bg-blue-500 text-white" : "bg-gray-300"
        }`}
      >
        Modify Database
      </button>
    </nav>
  );
}

export default NavBar;
