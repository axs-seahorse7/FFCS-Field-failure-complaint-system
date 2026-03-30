import { Navigate, Outlet, useOutletContext, useLocation  } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../services/axios-interceptore/api.js"; // your axios instance
import SkeletonDashboard from "../Skeleto-Loader/SkeletonDashboard.jsx";

const ProtectedRoute = ({ requiredPermission }) => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const context = useOutletContext();


    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await api.get("/auth/me");
                const userData = res.data.user;

                setUser(userData);
                localStorage.setItem("User", JSON.stringify(userData));
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (loading) return <SkeletonDashboard />;
    if (!user) return <Navigate to="/" replace />;

    const permissions = user?.roleId?.permissions || [];

    console.log("Required:", requiredPermission);
    console.log("User Permissions:", permissions);
    console.log("Match:", permissions.includes(requiredPermission));

    // ✅ SYSTEM ROLE (ADMIN)
    if (user.isSystemRole) return <Outlet context={context} />;

    // ✅ Complaint user
    if (permissions.includes("complaint") && !location.pathname.startsWith("/complaints")) {
        return <Navigate to="/complaints" replace />;
        }



    return <Outlet context={context} />;
};

export default ProtectedRoute;