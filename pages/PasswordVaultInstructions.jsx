import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, HelpCircle, Shield, KeyRound, Lock, FileText, CreditCardIcon,
  Settings, Database, Tags, Eye, Grid, List, Zap
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

export default function PasswordVaultInstructions() {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <HelpCircle className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">Password Vault Guide</h1>
                </div>
                <Link to={createPageUrl('PasswordVault')}>
                    <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Vault</Button>
                </Link>
            </div>

            <div className="space-y-6">
                <Card className="bg-gradient-to-br from-primary/10 to-transparent">
                    <CardHeader>
                        <CardTitle>Your Secure Digital Safe</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-2">
                        <p>Welcome to the Password Vault, an offline-first sanctuary for your most sensitive data. Everything you store here is kept exclusively on your device, ensuring complete privacy and control.</p>
                        <p>For vault-specific settings and backups, visit the <Link to={createPageUrl('PasswordVaultSettings')} className="text-primary underline">Vault Settings</Link> page.</p>
                    </CardContent>
                </Card>

                <FeatureCard
                  icon={<Shield className="w-6 h-6 text-red-500" />}
                  title="Security & Privacy"
                  description="Understanding how your data is protected."
                >
                  <FeatureDetail title="Offline-First Principle">
                    Your vault data never leaves your device. It is not sent to any cloud server, providing a powerful layer of security against external breaches.
                  </FeatureDetail>
                  <FeatureDetail title="Encryption (Currently Disabled)">
                    The ability to lock your vault with a master password has been disabled. Your data is stored unencrypted on your device's local storage, accessible only through this application.
                  </FeatureDetail>
                  <FeatureDetail title="Vault-Only Backups">
                    The backup feature in <Link to={createPageUrl('PasswordVaultSettings')} className="text-primary underline">Vault Settings</Link> is completely <span className="font-semibold">separate</span> from the financial data backup. This ensures you can manage your sensitive credentials independently.
                  </FeatureDetail>
                </FeatureCard>

                <FeatureCard
                  icon={<KeyRound className="w-6 h-6 text-blue-500" />}
                  title="Managing Your Entries"
                  description="Store more than just passwords."
                >
                    <FeatureDetail title="Password Credentials">
                        Store website logins with usernames and passwords. When you enter a website URL (e.g., <span className="italic">amazon.com</span>), the app automatically fetches the site's favicon for easy identification.
                    </FeatureDetail>
                    <FeatureDetail title="Secure Notes & Cards">
                        Use <FileText className="inline w-4 h-4" /> Secure Notes for private information like recovery keys or license numbers. Store <CreditCardIcon className="inline w-4 h-4" /> Card Credentials for quick access to payment information.
                    </FeatureDetail>
                    <FeatureDetail title="Smart Add Button">
                        The <Zap className="inline w-4 h-4" /> <span className="font-semibold">+ Add</span> button is context-aware. On the "Passwords" screen, it defaults to adding a password. On the "Notes" screen, it defaults to adding a note.
                    </FeatureDetail>
                </FeatureCard>

                <FeatureCard
                  icon={<Settings className="w-6 h-6 text-gray-500" />}
                  title="Interface & Customization"
                  description="Tailor the vault to your workflow."
                >
                    <FeatureDetail title="Tags for Organization">
                        Use the <Tags className="inline w-4 h-4" /> sidebar to filter your entries by type (Passwords, Notes, Cards) or by custom tags you've created. This makes finding what you need fast and efficient.
                    </FeatureDetail>
                    <FeatureDetail title="Card View vs. List View">
                        Use the <Eye className="inline w-4 h-4" /> toggle in the sidebar to switch between a detailed <Grid className="inline w-4 h-4" /> Card View and a compact <List className="inline w-4 h-4" /> List View. Choose the layout that works best for you.
                    </FeatureDetail>
                </FeatureCard>
            </div>
        </div>
    );
}