import NavBar from "../Components/NavBar";
import Calculator from "../Components/Calculator";
import History from "../Components/History";
import Stats from "../Components/Stats";
import Modify from "../Components/Modify";
import { useState } from "react";

function App() {
  const [activeSection, setActiveSection] = useState("stats");

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
      <div>{renderSection()}</div>
    </div>
  );
}

export default App;
