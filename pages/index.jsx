import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Instructions from "./Instructions";

import Settings from "./Settings";

import FinancialDashboard from "./FinancialDashboard";

import PasswordVault from "./PasswordVault";

import FinancialDataManagement from "./FinancialDataManagement";

import PasswordVaultInstructions from "./PasswordVaultInstructions";

import PasswordVaultSettings from "./PasswordVaultSettings";

import HubInstructions from "./HubInstructions";

import InventoryPage from "../inventory/InventoryPage";

import { HashRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Instructions: Instructions,
    
    Settings: Settings,
    
    FinancialDashboard: FinancialDashboard,
    
    PasswordVault: PasswordVault,
    
    FinancialDataManagement: FinancialDataManagement,
    
    PasswordVaultInstructions: PasswordVaultInstructions,
    
    PasswordVaultSettings: PasswordVaultSettings,
    
    HubInstructions: HubInstructions,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Instructions" element={<Instructions />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/FinancialDashboard" element={<FinancialDashboard />} />
                
                <Route path="/PasswordVault" element={<PasswordVault />} />
                
                <Route path="/FinancialDataManagement" element={<FinancialDataManagement />} />
                
                <Route path="/PasswordVaultInstructions" element={<PasswordVaultInstructions />} />
                
                <Route path="/PasswordVaultSettings" element={<PasswordVaultSettings />} />
                
                <Route path="/HubInstructions" element={<HubInstructions />} />

		<Route path="/vault/inventory" element={<InventoryPage />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}