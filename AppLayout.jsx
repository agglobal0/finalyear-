import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import HistorySidebar from "../components/HistorySidebar";
import { useState } from "react";

const AppLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    
    // Check if we are on a PPT route where sidebar is hidden
    const isPptRoute = location.pathname.startsWith('/ppt');

    return (
        <div className="min-h-screen flex flex-col transition-colors duration-300">
            <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
            <HistorySidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className={`pt-16 min-h-screen flex-1 w-full relative transition-all duration-300 ${!isPptRoute ? 'lg:pl-72' : ''}`}>
                <div className="page-wrapper animate-fade-in p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
