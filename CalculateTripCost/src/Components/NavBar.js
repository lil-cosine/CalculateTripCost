function NavBar({ activeSection, setActiveSection }) {
  const navItems = [
    { id: "stats", label: "Drive Stats", icon: "📊" },
    { id: "add", label: "Add Drive", icon: "➕" },
    { id: "past", label: "Past Drives", icon: "📋" },
    { id: "mod", label: "Database", icon: "⚙️" },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div
              className="flex-shrink-0 flex items-center select-none"
              onClick={() => setActiveSection("stats")}
            >
              <div className="text-2xl">🚗</div>
              <span className="ml-2 text-xl font-semibold text-gray-800">
                CalculateTripCost
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`
                  relative flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    activeSection === item.id
                      ? "bg-blue-500 text-white shadow-md transform scale-105"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }
                `}
              >
                <span className="mr-2 text-base">{item.icon}</span>
                {item.label}

                {activeSection === item.id && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
