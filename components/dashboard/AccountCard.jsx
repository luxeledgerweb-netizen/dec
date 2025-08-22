
import React, { useState, useEffect } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Building2, MoreVertical, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useCountUp } from '../utils/useCountUp';
import { useTileStyle } from '../utils/useTileStyle';
import { getIconForItem } from '../utils/iconHelper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function AccountCard({ account, onUpdate = () => {}, compact, showBalance, onEdit = () => {} }) {
  const tileStyle = useTileStyle();
  const [iconUrl, setIconUrl] = useState(null);
  const countUpValue = useCountUp(account.current_balance, 1500);

  useEffect(() => {
    const icon = getIconForItem(account, 'account');
    setIconUrl(icon);
  }, [account, account.default_favicon_base64]);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the account "${account.name}"? Historical data will be preserved for portfolio growth tracking.`)) {
      // Mark account as deleted but preserve historical data
      localDb.update('Account', account.id, { 
        is_deleted: true,
        deleted_date: new Date().toISOString()
      });
      
      if (typeof onUpdate === 'function') {
        onUpdate('Account');
      }
    }
  };

  const handleEdit = () => {
    if (typeof onEdit === 'function') {
      onEdit(account);
    }
  };
  
  const isSavingsOrChecking = account.account_type === 'savings' || account.account_type === 'checking';
  const isInvestmentAccount = account.account_type === 'investment' || account.account_type === 'retirement';
  const isZeroBalance = account.current_balance === 0;

  // Calculate investment gains/losses for compact view
  const investmentGainLoss = isInvestmentAccount ? 
    (account.current_balance || 0) - (account.total_contributions || 0) : 0;

  if (compact) {
    return (
      <Card style={tileStyle} className={`hover:shadow-md transition-shadow ${isZeroBalance ? 'opacity-60' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              {iconUrl ? (
                  <img src={iconUrl} alt={`${account.institution} logo`} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5"/>
              ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-white" />
                  </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{account.name}</h4>
                <p className="text-xs text-[var(--text-secondary)] truncate">{account.institution}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleEdit}>
                <Pencil className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-end">
             <div className="flex flex-col items-start gap-1">
              {isSavingsOrChecking && account.apy > 0 && (
                <Badge variant="secondary" className="text-xs">{account.apy.toFixed(2)}% APY</Badge>
              )}
               {isInvestmentAccount && showBalance && (
                <div className="mt-1 text-xs space-y-1">
                  <div className="text-[var(--text-secondary)]">
                    Contributions: ${(account.total_contributions || 0).toLocaleString()}
                  </div>
                  <div className={`flex items-center gap-1 font-medium ${investmentGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {investmentGainLoss >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>Gain/Loss: {investmentGainLoss >= 0 ? '+' : ''}${investmentGainLoss.toLocaleString()}</span>
                  </div>
                </div>
              )}
             </div>

            <div className="text-right">
                {showBalance ? (
                  <p className={`font-bold text-lg ${isZeroBalance ? 'text-gray-400' : ''}`}>
                    ${countUpValue.toLocaleString()}
                  </p>
                ) : (
                  <p className="font-bold text-lg">••••••</p>
                )}
                <Badge variant="outline" className="text-xs capitalize mt-1">{account.account_type.replace('_', ' ')}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <Card style={tileStyle} className={`transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isZeroBalance ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {iconUrl ? (
                <img src={iconUrl} alt={`${account.institution} logo`} className="w-10 h-10 rounded-lg object-contain bg-white p-1 shadow-md"/>
            ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <Building2 className="w-5 h-5 text-white" />
                </div>
            )}
            <div>
              <CardTitle className="text-lg">{account.name}</CardTitle>
              <p className="text-sm text-[var(--text-secondary)]">{account.institution}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-white focus:bg-red-500">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showBalance ? (
          <p className={`text-3xl font-bold text-[var(--heading-color)] ${isZeroBalance ? 'text-gray-400' : ''}`}>
            ${countUpValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        ) : (
          <p className="text-3xl font-bold text-[var(--heading-color)]">
            $••••••
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="capitalize">{account.account_type.replace('_', ' ')}</Badge>
            {isSavingsOrChecking && account.apy > 0 && (
                <Badge variant="secondary">{account.apy.toFixed(2)}% APY</Badge>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
