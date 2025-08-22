
import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreditCard, Pencil, Building2 } from 'lucide-react'; // Building2 for benefits button
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EditCreditCardModal from './EditCreditCardModal';
import CreditCardBenefitsModal from './CreditCardBenefitsModal'; // New import
import { getIconForItem } from '../utils/iconHelper';
import { localDb } from '@/components/utils/Localdb';
import { cn } from "@/lib/utils"; // Import cn utility for dynamic class names

const CardIcon = ({ card }) => {
    const [iconUrl, setIconUrl] = useState(null);

    useEffect(() => {
        if (card) {
            const icon = getIconForItem(card, 'card');
            setIconUrl(icon);
        }
    }, [card]);

    return (
        <div className="flex items-center gap-3 flex-1">
            {iconUrl ? (
                <img src={iconUrl} alt={`${card.institution || 'Card'} logo`} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-md"/>
            ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <CreditCard className="w-4 h-4 text-white" />
                </div>
            )}
            <div>
                <h4 className="font-semibold text-base">{card.name}</h4>
                <p className="text-xs text-[var(--text-secondary)]">{card.institution}</p>
            </div>
        </div>
    );
};

const CreditCardDetails = ({ card }) => {
    const isExpiringSoon = card.expiration_date ? new Date(card.expiration_date) <= new Date(new Date().setMonth(new Date().getMonth() + 2)) : false;
    // Note: isUnused property is now passed directly from parent component via 'card' prop after processing alerts
    const isUnused = card.isUnused || false; 

    const formatExpirationDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                year: 'numeric',
                timeZone: 'UTC'
            });
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="mt-3 pt-3 border-t border-[var(--border)]/30 space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Limit:</span>
                    <span className="font-medium text-[var(--text-primary)]">${(card.credit_limit || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">APR:</span>
                    <span className="font-medium text-[var(--text-primary)]">{card.apr ? `${card.apr}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Expires:</span>
                    <span className={`font-medium ${isExpiringSoon ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                        {formatExpirationDate(card.expiration_date)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Last Used:</span>
                    <span className={`font-medium ${isUnused ? 'text-orange-500' : 'text-[var(--text-primary)]'}`}>
                        {card.last_used_date ? new Date(card.last_used_date).toLocaleDateString() : 'N/A'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default function CreditCardGrid({ creditCards, onUpdate = () => {}, cardSort, compactView, showDetails = true, onEdit = () => {}, alerts = [] }) {
    const [editingCard, setEditingCard] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBenefitsModalOpen, setIsBenefitsModalOpen] = useState(false); // New state for benefits modal
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem("dashboardTheme") || "light";
        }
        return "light";
    });

    // Local mirror of the incoming cards so we can refresh instantly after a save
    const [cards, setCards] = useState(() => creditCards || []);

    // Keep the mirror in sync when parent sends new props
    useEffect(() => {
        setCards(creditCards || []);
    }, [creditCards]);

// Re-read from the DB after edits so the grid updates immediately
const refreshCards = () => {
    setCards(localDb.list('CreditCard'));
};

    useEffect(() => {
        const handleThemeChange = () => {
            setTheme(localStorage.getItem("dashboardTheme") || "light");
        };

        window.addEventListener('themeChanged', handleThemeChange);

        return () => {
            window.removeEventListener('themeChanged', handleThemeChange);
        };
    }, []);

    const sortedCards = useMemo(() => {
        if (!creditCards || !Array.isArray(creditCards)) return [];
        
        // Create a Set of card IDs that have an "unused" alert for efficient lookup.
        const unusedCardIds = new Set(
            alerts
                .filter(alert => alert.source === 'credit-card' && alert.id.startsWith('unused-'))
                .map(alert => alert.sourceId)
        );

        const now = new Date();

        const cardsWithStatus = creditCards.map(card => ({
            ...card,
            isUnused: unusedCardIds.has(card.id),
            // Fix: Ensure comparison is between Date objects and 'now' is used for current date properties
            isExpiringSoon: card.expiration_date ? new Date(card.expiration_date) <= new Date(now.getFullYear(), now.getMonth() + 2, 0) : false
        }));

        const activeCards = cardsWithStatus.filter(card => card.status === 'open');
        const closedCards = cardsWithStatus.filter(card => card.status === 'closed');

        const sortCards = (cards) => {
            // Preserving original sorting by last_used_date, as cardSort logic is not provided.
            return cards.sort((a, b) => {
                const dateA = a.last_used_date ? new Date(a.last_used_date) : new Date(0);
                const dateB = b.last_used_date ? new Date(b.last_used_date) : new Date(0);
                return dateB - dateA;
            });
        };

        return [...sortCards(activeCards), ...sortCards(closedCards)];
    }, [creditCards, alerts, cardSort]);

    const getCardBackgroundColor = () => {
        switch (theme) {
            case 'dark':
                return 'bg-[#262833]';
            case 'sofi':
                return 'bg-[#E5F6FD]';
            default:
                return 'bg-slate-50';
        }
    };

    const handleEdit = (card) => {
        if (typeof onEdit === 'function') {
            onEdit(card);
        } else {
            setEditingCard(card);
            setIsEditModalOpen(true);
        }
    };

    const handleUpdate = () => { // Renamed from handleCardUpdate
        setIsEditModalOpen(false);
        setEditingCard(null); 
        if (typeof onUpdate === 'function') {
            onUpdate();
        }
    };

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        setEditingCard(null);
    };

    // Determine if we need to reduce columns due to space constraints
    const shouldReduceColumns = compactView && creditCards && creditCards.some(card => 
        card.last_four_digits || 
        card.isExpiringSoon || 
        card.isUnused || 
        (card.benefits && card.benefits.trim().length > 0)
    );

    if (!creditCards || creditCards.length === 0) {
        return (
            <div className="text-center text-sm text-[var(--text-secondary)] py-8">
                <CreditCard className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--heading-color)] mb-2">No credit cards yet</h3>
                <p className="text-[var(--text-secondary)]">
                    Add your first credit card to start tracking your credit portfolio
                </p>
            </div>
        );
    }

    return (
        <>
            <div className={cn(
                "grid gap-4",
                compactView
                    ? shouldReduceColumns 
                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                        : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
                {sortedCards.map(card => {
                    const isActive = card.is_primary_active && card.status === 'open';
                    const isClosed = card.status === 'closed';
                    
                    return (
                        <Card 
                            key={card.id} 
                            className={cn(
                                "p-4 flex flex-col justify-between h-full transition-all duration-200",
                                getCardBackgroundColor(),
                                compactView ? "min-h-[120px]" : "min-h-[160px]",
                                "hover:shadow-md hover:-translate-y-0.5",
                                isActive ? 'ring-2 ring-blue-500/50' : '', // Preserve existing primary active ring
                                isClosed ? 'opacity-60 grayscale' : '' // Preserve existing closed card style
                            )}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <CardIcon card={card} />
                                    <div className="flex flex-col items-end gap-1">
                                        {card.last_four_digits && (
                                            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                                <CreditCard className="w-3 h-3" />
                                                <span>{card.last_four_digits}</span>
                                            </div>
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 flex-shrink-0" 
                                            onClick={() => handleEdit(card)}
                                            title="Edit Card"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                
                                {showDetails && <CreditCardDetails card={card} />}
                                
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    {isActive && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                                    {isClosed && <Badge variant="outline" className="text-xs">Closed</Badge>}
                                    {card.isExpiringSoon && card.status === 'open' && <Badge variant="destructive" className="text-xs animate-pulse">Expires Soon</Badge>}
                                    {card.isUnused && card.status === 'open' && <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">Needs Use</Badge>}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {editingCard && (
                <EditCreditCardModal
                    isOpen={isEditModalOpen}
                    card={editingCard}
                    onClose={handleCloseModal}
                    onCreditCardUpdated={handleUpdate} // Changed to handleUpdate
                />
            )}

            <CreditCardBenefitsModal
                isOpen={isBenefitsModalOpen}
                onClose={() => setIsBenefitsModalOpen(false)}
                creditCards={creditCards}
            />
        </>
    );
}
