
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Zap } from "lucide-react";
import { motion } from 'framer-motion';
import { useTileStyle } from '../utils/useTileStyle';

export default function WhatIfCalculator() {
    const [principal, setPrincipal] = useState(1000);
    const [rate, setRate] = useState(7);
    const [years, setYears] = useState(10);
    const [monthlyContribution, setMonthlyContribution] = useState(100);
    const [futureValue, setFutureValue] = useState(0);
    const tileStyle = useTileStyle();

    useEffect(() => {
        const P = parseFloat(principal);
        const r = parseFloat(rate) / 100 / 12;
        const n = parseFloat(years) * 12;
        const M = parseFloat(monthlyContribution);

        if (isNaN(P) || isNaN(r) || isNaN(n) || isNaN(M)) {
            setFutureValue(0);
            return;
        }

        // Future value of a series formula
        const fvSeries = M * ((Math.pow(1 + r, n) - 1) / r);
        // Future value of principal
        const fvPrincipal = P * Math.pow(1 + r, n);

        const total = fvPrincipal + fvSeries;
        setFutureValue(total);
    }, [principal, rate, years, monthlyContribution]);

    return (
        <Card style={tileStyle} className="glass-card h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-teal-500 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative z-10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">Growth Calculator</CardTitle>
                            <CardDescription>Estimate future investment values.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="principal">Initial ($)</Label>
                            <Input id="principal" type="number" value={principal} onChange={e => setPrincipal(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="monthly">Monthly ($)</Label>
                            <Input id="monthly" type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="rate">Rate (%)</Label>
                            <Input id="rate" type="number" value={rate} onChange={e => setRate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="years">Years</Label>
                            <Input id="years" type="number" value={years} onChange={e => setYears(e.target.value)} />
                        </div>
                    </div>
                    <div className="pt-4 text-center">
                        <p className="text-sm text-[var(--text-secondary)]">Estimated Future Value</p>
                        <motion.p 
                            key={futureValue}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-teal-600"
                        >
                            ${futureValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </motion.p>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}
