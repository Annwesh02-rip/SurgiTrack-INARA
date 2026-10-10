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

import {
  getAuthToken,
  getCurrentProcedureId,
} from "./utils/demoStore";


/* =========================================================
   AUTHENTICATED ROUTE

   User must have a JWT token.
========================================================= */

function ProtectedRoute({
  children,
}) {
  const token =
    getAuthToken();

  if (!token) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
}


/* =========================================================
   PROCEDURE ROUTE

   User must:
   1. Be authenticated
   2. Have a current backend procedure ID
========================================================= */

function ProcedureRoute({
  children,
}) {
  const token =
    getAuthToken();

  const procedureId =
    getCurrentProcedureId();

  if (!token) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  if (!procedureId) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}


/* =========================================================
   LOGIN ROUTE

   Already logged-in users go directly
   to the dashboard.
========================================================= */

function LoginRoute() {
  const token =
    getAuthToken();

  if (token) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Login />;
}


/* =========================================================
   APP
========================================================= */

export default function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* LOGIN */}

        <Route
          path="/"
          element={
            <LoginRoute />
          }
        />


        {/* DASHBOARD */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>

              <Dashboard />

            </ProtectedRoute>
          }
        />


        {/* NEW PROCEDURE */}

        <Route
          path="/new-procedure"
          element={
            <ProtectedRoute>

              <NewProcedure />

            </ProtectedRoute>
          }
        />


        {/* RFID REGISTRATION */}

        <Route
          path="/rfid-registration"
          element={
            <ProcedureRoute>

              <RFIDRegistration />

            </ProcedureRoute>
          }
        />


        {/* PRE-OP CNN */}

        <Route
          path="/pre-op-scan"
          element={
            <ProcedureRoute>

              <PreOpScan />

            </ProcedureRoute>
          }
        />


        {/* ACTIVE PROCEDURE */}

        <Route
          path="/procedure-active"
          element={
            <ProcedureRoute>

              <ProcedureActive />

            </ProcedureRoute>
          }
        />


        {/* POST-OP */}

        <Route
          path="/post-op-scan"
          element={
            <ProcedureRoute>

              <PostOpScan />

            </ProcedureRoute>
          }
        />


        {/* FINAL RECONCILIATION */}

        <Route
          path="/final-reconciliation"
          element={
            <ProcedureRoute>

              <FinalReconciliation />

            </ProcedureRoute>
          }
        />


        {/* UNKNOWN ROUTE */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}