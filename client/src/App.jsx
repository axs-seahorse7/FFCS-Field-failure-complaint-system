import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./Components/Protected/ProtectedRoute.jsx";
import Login from "./Pages/Authentication/Login/Login";
import Dashboard from "./Pages/Admin/Dashboard/Dashboard.jsx";
import ComplaintForm from "./Pages/Form/ComplaintForm.jsx";
import ComplaintDashboard from "./Pages/User/Dashboard/ComplaintDashboard.jsx";
import AdminDashboard from "./Pages/Admin/Dashboard/AdminDashboard.jsx";
import AccountPending from "./Pages/Authentication/Pending/AccountPending.jsx";

function App() {
 

      return (
        <div>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<ProtectedRoute allowedRole="admin" />}>
            <Route path="/dashboard"  element={<AdminDashboard />} />
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
