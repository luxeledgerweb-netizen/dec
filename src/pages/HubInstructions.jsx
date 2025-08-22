import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, HelpCircle, Settings, Palette, FileUp, Lock, SlidersHorizontal, BarChart2, Star
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

export default function HubInstructions() {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <HelpCircle className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">Global Guide</h1>
                </div>
                <Link to={createPageUrl('Dashboard')}>
                    <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Hub</Button>
                </Link>
            </div>

            <div className="space-y-6">
                 <Card className="bg-gradient-to-br from-primary/10 to-transparent">
                    <CardHeader>
                        <CardTitle>Application-Wide Settings & Features</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-2">
                        <p>This guide covers settings that affect the entire application, from visual themes to security and data management. These options are managed from the main hub or the Global Settings page.</p>
                    </CardContent>
                </Card>

                <FeatureCard
                  icon={<Palette className="w-6 h-6 text-purple-500" />}
                  title="Theme Customization"
                  description="Personalize your visual experience."
                >
                    <FeatureDetail title="Theme Studio">
                        In <Link to={createPageUrl('Settings')} className="text-primary underline">Global Settings</Link>, you can access the Theme Studio to create, edit, and activate custom themes. The builder provides a live preview as you adjust colors.
                    </FeatureDetail>
                    <FeatureDetail title="Favorite Custom Theme">
                        When you long-press the Sun/Moon icon in the header, you can quickly switch between Light, Dark, SoFi, and your favorite custom theme (marked with a <Star className="inline w-4 h-4 text-yellow-500" />). Your last "Activated" theme from the studio becomes the favorite.
                    </FeatureDetail>
                </FeatureCard>

                <FeatureCard
                  icon={<FileUp className="w-6 h-6 text-green-500" />}
                  title="Global Backup & Restore"
                  description="Safeguard all your application data."
                >
                    <FeatureDetail title="Unified Backup">
                        The "Global Backup" option in <Link to={createPageUrl('Settings')} className="text-primary underline">Global Settings</Link> creates a single file containing <span className="font-semibold">all</span> your data: financial records, vault entries, settings, and custom themes.
                    </FeatureDetail>
                    <FeatureDetail title="Complete Restoration">
                        Use "Global Restore" to import a backup file and restore the entire application to a previous state. This is the recommended way to move your data to a new device.
                    </FeatureDetail>
                </FeatureCard>

                <FeatureCard
                  icon={<Lock className="w-6 h-6 text-red-500" />}
                  title="Security & Session"
                  description="Manage application access and security settings."
                >
                    <FeatureDetail title="Session Timeout">
                        Configure how long the application can be inactive before it automatically locks, requiring you to re-authenticate. This is crucial for protecting your data on shared devices.
                    </FeatureDetail>
                     <FeatureDetail title="Login Screen Customization">
                        Personalize the login screen with a custom background image, title, and welcome message from the <Link to={createPageUrl('Settings')} className="text-primary underline">Global Settings</Link> page.
                    </FeatureDetail>
                </FeatureCard>

                <FeatureCard
                  icon={<BarChart2 className="w-6 h-6 text-blue-500" />}
                  title="Reporting"
                  description="Generate insights from your data."
                >
                    <FeatureDetail title="Monthly Reports">
                        Access detailed monthly summaries of your financial progress. These reports provide a snapshot of your net worth, asset allocation, and more, helping you track trends over time.
                    </FeatureDetail>
                </FeatureCard>
            </div>
        </div>
    );
}