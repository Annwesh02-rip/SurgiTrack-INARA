import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewProcedure from "./pages/NewProcedure";
import RFIDRegistration from "./pages/RFIDRegistration";
import PreOpScan from "./pages/PreOpScan";
import ProcedureActive from "./pages/ProcedureActive";
import PostOpScan from "./pages/PostOpScan";
import FinalReconciliation from "./pages/FinalReconciliation";

export default function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={
            <Login />
          }
        />

        <Route
          path="/dashboard"
          element={
            <Dashboard />
          }
        />

        <Route
          path="/new-procedure"
          element={
            <NewProcedure />
          }
        />

        <Route
          path="/rfid-registration"
          element={
            <RFIDRegistration />
          }
        />

        <Route
          path="/pre-op-scan"
          element={
            <PreOpScan />
          }
        />

        <Route
          path="/procedure-active"
          element={
            <ProcedureActive />
          }
        />

        <Route
          path="/post-op-scan"
          element={
            <PostOpScan />
          }
        />

        <Route
          path="/final-reconciliation"
          element={
            <FinalReconciliation />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}