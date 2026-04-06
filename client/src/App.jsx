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
      <Router>
        <Routes>

          <Route path="/" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<AdminDashboard />}>

              <Route index element={<Navigate to="manage" replace />} />

              <Route element={<ProtectedRoute requiredPermission="manage" />}>
                <Route path="manage" element={<ManageSection />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="register" />}>
                <Route path="register" element={<RegisterSection />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="users" />}>
                <Route path="users" element={<UsersSection />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="overview" />}>
                <Route path="overview" element={<OverviewSection />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="defects" />}>
                <Route path="defects" element={<DefectsSection />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="customers" />}>
                <Route path="customers" element={<CustomersSection />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="warranty" />}>
                <Route path="warranty" element={<WarrantySection />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="production" />}>
                <Route path="production" element={<ProductionEntryForm />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="BulkUpload" />}>
                <Route path="bulk-upload" element={<BulkUpload />} />
              </Route>

            </Route>
          </Route>

          <Route element={<ProtectedRoute requiredPermission="complaint" />}>
            <Route path="/complaints" element={<ComplaintDashboard />} />
            <Route path="/complaints/form" element={<ComplaintForm />} />
            <Route path="/complaints/form/update/:id" element={<ComplaintForm />} />
          </Route>

          <Route path="/account/pending" element={<AccountPending />} />

        </Routes>
      </Router>
  );
}

export default App;
