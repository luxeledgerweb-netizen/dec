import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { localDb } from '@/components/utils/LocalDb';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, HelpCircle, TrendingUp, Edit, Palette, DatabaseZap, FileUp, ShieldCheck,
  Bell, Car, LayoutDashboard, AlertTriangle, GitCommitHorizontal, Gift
} from 'lucide-react';

const FeatureCard = ({ icon, title, description, children }) => (
  <Card className="bg-card/80">
    <CardHeader>
      <CardTitle className="flex items-center gap-3 text-xl">
        {icon}
        <span>{title}</span>
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4 text-muted-foreground pl-12">
      {children}
    </CardContent>
  </Card>
);

const FeatureDetail = ({ title, children }) => (
  <div>
    <h4 className="font-semibold text-foreground mb-1">{title}</h4>
    <p className="text-sm">{children}</p>
  </div>
);

export default function Instructions() {
    const [appName, setAppName] = useState('decysp');

    useEffect(() => {
        const loadSettings = () => {
            const settings = localDb.list('AdminSettings')[0];
            if (settings && settings.appName) {
                setAppName(settings.appName);
            }
        };
        loadSettings();
        window.addEventListener('settingsChanged', loadSettings);
        return () => window.removeEventListener('settingsChanged', loadSettings);
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <HelpCircle className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">Financial Dashboard Guide</h1>
                </div>
                <Link to={createPageUrl('FinancialDashboard')}>
                    <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button>
                </Link>
            </div>

            <div className="space-y-6">
                <Card className="bg-gradient-to-br from-primary/10 to-transparent">
                    <CardHeader>
                        <CardTitle>Welcome to Your Financial Cockpit!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-2">
                        <p>This is the command center for your financial life. Here, you can track assets, monitor credit, manage loans, and get a clear picture of your net worth—all in one place. Your data is 100% private and stored only on this device.</p>
                        <p>Navigate to <Link to={createPageUrl('FinancialDataManagement')} className="text-primary underline">Financial Settings</Link> to manage your data and customize this dashboard.</p>
                    </CardContent>
                </Card>

                <FeatureCard
                  icon={<LayoutDashboard className="w-6 h-6 text-blue-500" />}
                  title="The Dashboard View"
                  description="Your dynamic and personalized financial overview."
                >
                  <FeatureDetail title="Customizable Layout">
                    Click the <Edit className="inline w-4 h-4" /> <span className="font-semibold">Edit</span> icon in the header to enter layout mode. Drag and drop tiles to arrange them perfectly. Click <span className="font-semibold">Save Layout</span> to lock in your preferred view.
                  </FeatureDetail>
                  <FeatureDetail title="At-a-Glance Summaries">
                    The top summary cards provide key metrics like Net Worth, Total Assets, and Credit Utilization. Arrows indicate monthly growth or decline based on your historical snapshots.
                  </FeatureDetail>
                  <FeatureDetail title="Intelligent Alerts">
                    The <AlertTriangle className="inline w-4 h-4 text-orange-500" /> <span className="font-semibold">Alerts Banner</span> appears for important events like unfrozen credit bureaus or credit cards that are expiring or haven't been used in a while. Click it to see a detailed list.
                  </FeatureDetail>
                </FeatureCard>
                
                <FeatureCard
                  icon={<TrendingUp className="w-6 h-6 text-green-500" />}
                  title="Core Financial Modules"
                  description="Track every component of your financial health."
                >
                    <FeatureDetail title="Assets & Accounts">
                        Add checking, savings, investment, and retirement accounts. The system automatically tracks your balance history over time, powering the growth chart. Use the <GitCommitHorizontal className="inline w-4 h-4" /> <span className="font-semibold">Bulk Update</span> prompt at month-end for quick updates.
                    </FeatureDetail>
                    <FeatureDetail title="Credit Cards">
                        Log your credit cards to track limits and usage. Use the <Gift className="inline w-4 h-4 text-purple-500" /> <span className="font-semibold">View Benefits</span> button to see a summary of rewards and perks you've entered for each card.
                    </FeatureDetail>
                    <FeatureDetail title="Loans & Liabilities">
                        Track <Car className="inline w-4 h-4" /> auto loans and other liabilities to see how they impact your net worth. Paying down loans is progress worth tracking!
                    </FeatureDetail>
                    <FeatureDetail title="Reminders & Subscriptions">
                        Never miss a bill. Add recurring or one-time reminders. The app will alert you based on the payment frequency: 7 days for monthly bills, 14 for semi-annual, and 30 for annual.
                    </FeatureDetail>
                </FeatureCard>

                <FeatureCard
                  icon={<DatabaseZap className="w-6 h-6 text-red-500" />}
                  title="Data & Customization"
                  description="Take control of your data and visual experience."
                >
                    <FeatureDetail title="Financial Data Backup">
                        In <Link to={createPageUrl('FinancialDataManagement')} className="text-primary underline">Financial Settings</Link>, you can export your financial data. An encrypted backup is recommended. Note: This backup is <span className="font-semibold">separate</span> from the Password Vault backup.
                    </FeatureDetail>
                    <FeatureDetail title="Credit Bureau Status">
                        Manually toggle the freeze status of your credit reports at Equifax, Experian, and TransUnion. This is a helpful reminder to keep your credit locked when you're not actively seeking new lines of credit.
                    </FeatureDetail>
                    <FeatureDetail title="Theming">
                        Long-press the <Palette className="inline w-4 h-4" /> Sun/Moon icon in the header to access all themes, including any custom ones you've built in the Global Settings.
                    </FeatureDetail>
                </FeatureCard>
            </div>
        </div>
    );
}