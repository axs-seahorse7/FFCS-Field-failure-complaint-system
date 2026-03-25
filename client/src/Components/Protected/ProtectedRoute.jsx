import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../services/axios-interceptore/api.js"; // your axios instance
import SkeletonDashboard from "../Skeleto-Loader/SkeletonDashboard.jsx";

const ProtectedRoute = ({ allowedRole }) => {
    const [loading, setLoading] = useState(true);
    const [isAuth, setIsAuth] = useState(false);
    const [role, setRole] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await api.get("/auth/me");
                setIsAuth(true);
                setRole(res.data.user.role);
                localStorage.setItem("User", JSON.stringify(res.data.user));
                
            } catch (error) {
                setIsAuth(false);
                console.error("Authentication check failed:", error.message);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (loading) return <SkeletonDashboard />;

    if (!isAuth) {
        return <Navigate to="/" replace />;
    }

    if (allowedRole && role !== allowedRole) {
        return <Navigate to={role === "admin" ? "/dashboard" : "/complaint-form"} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;