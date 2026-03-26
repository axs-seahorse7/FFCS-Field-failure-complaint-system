import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./Components/Protected/ProtectedRoute.jsx";
import Login from "./Pages/Authentication/Login/Login";
import ComplaintForm from "./Pages/Form/ComplaintForm.jsx";
import ComplaintDashboard from "./Pages/User/Dashboard/ComplaintDashboard.jsx";
import AdminDashboard from "./Pages/Admin/Dashboard/AdminDashboard.jsx";
import AccountPending from "./Pages/Authentication/Pending/AccountPending.jsx";
import ProductionEntryForm from "./Pages/Admin/Production-Entry-Form/ProductionForm.jsx";
import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";


function App() {

    useEffect(() => {
      const lenis = new Lenis({
        duration: 1.2,
        smooth: true,
        gestureOrientation: "vertical",
      });

      let rafId;

      const raf = (time) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };

      rafId = requestAnimationFrame(raf);

      return () => {
        cancelAnimationFrame(rafId);
        lenis.destroy();
      };
    }, []);
 

      return (
        <div>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<ProtectedRoute allowedRole="admin" />}>
            <Route path="/dashboard"  element={<AdminDashboard />} />
            <Route path="/dashboard/production-entry" element={<ProductionEntryForm />} />
          </Route>

          <Route element={<ProtectedRoute allowedRole="user" />}>
            <Route path="/complaint-form" element={<ComplaintForm />} />
            <Route path="/complaints" element={<ComplaintDashboard />} />
          </Route>

          <Route path="/account/pending" element={<AccountPending />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
