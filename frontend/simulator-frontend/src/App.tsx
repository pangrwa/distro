import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import TopologyDesigner from "./pages/TopologyDesigner";
import SimulationRunner from "./pages/SimulationRunner";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TopologyDesigner />} />
          <Route path="/simulation" element={<SimulationRunner />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
