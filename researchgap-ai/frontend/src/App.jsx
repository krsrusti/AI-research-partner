import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import PapersSection from "./pages/project-sections/PapersSection";
import ChatSection from "./pages/project-sections/ChatSection";
import SearchSection from "./pages/project-sections/SearchSection";
import NotesSection from "./pages/project-sections/NotesSection";
import GapsSection from "./pages/project-sections/GapsSection";
import GraphSection from "./pages/project-sections/GraphSection";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspace />}>
          <Route index element={<Navigate to="papers" replace />} />
          <Route path="papers" element={<PapersSection />} />
          <Route path="chat" element={<ChatSection />} />
          <Route path="search" element={<SearchSection />} />
          <Route path="notes" element={<NotesSection />} />
          <Route path="gaps" element={<GapsSection />} />
          <Route path="graph" element={<GraphSection />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}