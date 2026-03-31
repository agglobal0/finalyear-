import useAuth from "../hooks/useAuth";
import PublicHome from "../pages/PublicHome";
import DashboardHome from "../pages/DashboardHome";
import Loader from "./Loader";

const HomeRouter = () => {
    const { user, loading } = useAuth();

    if (loading) return <Loader />;

    return user ? <DashboardHome /> : <PublicHome />;
};

export default HomeRouter;
