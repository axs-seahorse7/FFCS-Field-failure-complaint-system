import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./Components/Protected/ProtectedRoute.jsx";
import Login from "./Pages/Authentication/Login/Login";
import ComplaintForm from "./Pages/Form/ComplaintForm.jsx";
import ComplaintDashboard from "./Pages/User/Dashboard/ComplaintDashboard.jsx";
import AdminDashboard from "./Pages/Admin/Dashboard/AdminDashboard.jsx";
import AccountPending from "./Pages/Authentication/Pending/AccountPending.jsx";
import ProductionEntryForm from "./Pages/Admin/Production-Entry-Form/ProductionForm.jsx";
import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

import OverviewSection    from "./Pages/Admin/Dashboard/sections/OverviewSection";
import DefectsSection     from "./Pages/Admin/Dashboard/sections/DefectsSection";
import CustomersSection   from "./Pages/Admin/Dashboard/sections/CustomersSection";
import WarrantySection    from "./Pages/Admin/Dashboard/sections/WarrantySection";
import RegisterSection    from "./Pages/Admin/Dashboard/sections/RegisterSection";
import ManageSection      from "./Pages/Admin/Dashboard/sections/ManageSection";
import UsersSection       from "./Pages/Admin/Dashboard/sections/UsersSection";
import BulkUpload         from "./Pages/Admin/Dashboard/insert-bulk-complaint/BulkUpload";



function App() {

    // useEffect(() => {
    //   const lenis = new Lenis({
    //     duration: 1.2,
    //     smooth: true,
    //     gestureOrientation: "vertical",
    //   });

    //   let rafId;

    //   const raf = (time) => {
    //     lenis.raf(time);
    //     rafId = requestAnimationFrame(raf);
    //   };

    //   rafId = requestAnimationFrame(raf);

    //   return () => {
    //     cancelAnimationFrame(rafId);
    //     lenis.destroy();
    //   };
    // }, []);
 

      return (
        <div>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<ProtectedRoute allowedRole="admin" />}>
            <Route path="/dashboard" element={<AdminDashboard />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview"    element={<OverviewSection />} />
              <Route path="defects"     element={<DefectsSection />} />
              <Route path="customers"   element={<CustomersSection />} />
              <Route path="warranty"    element={<WarrantySection />} />
              <Route path="register"    element={<RegisterSection />} />
              <Route path="manage"      element={<ManageSection />} />
              <Route path="users"       element={<UsersSection />} />
              <Route path="production"  element={<ProductionEntryForm />} />
              <Route path="bulk-upload" element={<BulkUpload />} />
            </Route>
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
