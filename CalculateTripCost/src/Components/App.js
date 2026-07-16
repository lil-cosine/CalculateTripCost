import NavBar from "../Components/NavBar";
import Calculator from "../Components/Calculator";
import History from "../Components/History";
import Stats from "../Components/Stats";
import Modify from "../Components/Modify";
import Login from "../Components/Login";
import Register from "../Components/Register";
import { useAuth } from "./AuthContext";
import { useState } from "react";

function App() {
  const { user, loading, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("stats");
  const [authView, setAuthView] = useState("login");

  if (loading) {
    return <div className="App-loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="App-auth">
        {authView === "login" ? (
          <Login onSwitchToRegister={() => setAuthView("register")} />
        ) : (
          <Register onSwitchToLogin={() => setAuthView("login")} />
        )}
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "add":
        return <Calculator />;
      case "past":
        return <History />;
      case "stats":
        return <Stats />;
      case "mod":
        return <Modify />;
      default:
        return <Calculator />;
    }
  };

  return (
    <div className="App">
      <NavBar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
      <div className="user-bar">
        <span>{user.email}</span>
        <button onClick={logout}>Log Out</button>
      </div>
      <div>{renderSection()}</div>
    </div>
  );
}

export default App;
