
import React from "react";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { localDb } from '@/components/utils/LocalDb';
import { useTileStyle } from '../utils/useTileStyle';

// BureauCard component extracted for clarity and reusability
function BureauCard({ bureauKey, info, status, isFrozen, toggleFreezeStatus, index }) {
  return (
    <motion.div
      key={bureauKey}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }} // Staggered animation
      className="group relative"
    >
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[var(--ring)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-gray-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
        <CardContent className="p-6 text-center relative z-10"> {/* relative z-10 to ensure content is above the hover effect */}
          <div className="mb-4">
            <h3 className={`font-bold text-xl ${info.textColor} mb-4`}>{info.name}</h3>
          </div>
          
          <Button
            onClick={() => toggleFreezeStatus(bureauKey)}
            className={`w-full transition-colors duration-300 ${isFrozen ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            {isFrozen ? 'Frozen' : 'Unfrozen'}
          </Button>
          <p className="text-xs text-[var(--text-secondary)] mt-3">Last updated: {status ? new Date(status.last_updated).toLocaleDateString() : 'Never'}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main CreditBureauModules component, now acting as a container card
export default React.memo(function CreditBureauModules({ bureauStatuses, onUpdate }) {
  const tileStyle = useTileStyle();
  const bureauInfo = {
    experian: {
      name: "Experian",
      textColor: "text-blue-600",
      bgColor: "from-blue-600 to-blue-700"
    },
    equifax: {
      name: "Equifax",
      textColor: "text-red-600", 
      bgColor: "from-red-600 to-red-700"
    },
    transunion: {
      name: "TransUnion",
      textColor: "text-green-600",
      bgColor: "from-green-600 to-green-700"
    }
  };
  
  const toggleFreezeStatus = async (bureau) => {
    try {
      const currentStatus = bureauStatuses.find(s => s.bureau === bureau);
      if (currentStatus) {
        await localDb.update('CreditBureauStatus', currentStatus.id, {
          is_frozen: !currentStatus.is_frozen,
          last_updated: new Date().toISOString()
        });
      } else {
        // If no status exists, current logic assumes it's frozen by default.
        // So clicking means the user wants to unfreeze it.
        await localDb.create('CreditBureauStatus', {
            bureau: bureau,
            is_frozen: false, 
            last_updated: new Date().toISOString()
        });
      }
      // Call onUpdate to refresh data
      onUpdate();
    } catch (error) {
      console.error("Error updating bureau status:", error);
    }
  };

  // Loading state mirrors the final structure for a smoother transition
  if (!bureauStatuses) {
    return (
      <Card style={tileStyle} className="glass-card h-full transition-all duration-300 overflow-hidden group">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Credit Bureau Status</CardTitle>
          </div>
          <CardDescription>
            Loading credit bureau information...
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-card animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={tileStyle} className="glass-card h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[var(--ring)] overflow-hidden group">
      {/* Background gradient for the main card on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Credit Bureau Status</CardTitle>
          </div>
          <CardDescription>
            Manage the freeze status of your credit reports with Experian, Equifax, and TransUnion. Freezing your report can help prevent identity theft.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(bureauInfo).map(([bureauKey, info], index) => {
              const status = bureauStatuses.find(s => s.bureau === bureauKey);
              // Default to frozen if no record exists
              const isFrozen = status ? status.is_frozen : true;

              return (
                <BureauCard
                  key={bureauKey}
                  bureauKey={bureauKey}
                  info={info}
                  status={status}
                  isFrozen={isFrozen}
                  toggleFreezeStatus={toggleFreezeStatus}
                  index={index}
                />
              );
            })}
          </div>
        </CardContent>
      </div>
    </Card>
  );
});
