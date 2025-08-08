
import React from 'react';
import { Settings, ExternalLink } from 'lucide-react';

const Admin: React.FC = () => {
    const wpAdminUrl = 'https://www.coding-online.net/wp-admin/options-general.php?page=exam-app-settings';

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-6">Admin Panel</h1>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
                    <Settings className="mr-3 text-cyan-500" />
                    Application Mode
                </h2>
                <p className="text-slate-600 mb-4">
                    This setting controls where users are redirected after logging in from your WordPress site. You can switch between the live production environment and the Vercel test environment.
                </p>
                <p className="text-slate-600 mb-6">
                    This mode must be configured directly within your WordPress admin dashboard for security reasons. Click the button below to go to the settings page.
                </p>
                <a
                    href={wpAdminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-transform transform hover:scale-105"
                >
                    <ExternalLink size={20} className="mr-2" />
                    Go to WordPress Mode Settings
                </a>
            </div>
        </div>
    );
};

export default Admin;
