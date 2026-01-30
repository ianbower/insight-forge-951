import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"];

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  formatCurrency: (amount: number) => string;
  getCurrencySymbol: () => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's preferred currency on mount
  useEffect(() => {
    const fetchCurrency = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("preferred_currency")
          .eq("user_id", user.id)
          .single();

        if (!error && data?.preferred_currency) {
          setCurrencyState(data.preferred_currency as CurrencyCode);
        }
      } catch (error) {
        console.error("Error fetching currency preference:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrency();
  }, [user]);

  const setCurrency = async (newCurrency: CurrencyCode) => {
    if (!user) return;

    setCurrencyState(newCurrency);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          preferred_currency: newCurrency,
          updated_at: new Date().toISOString() 
        })
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving currency preference:", error);
      throw error;
    }
  };

  const getCurrencySymbol = () => {
    return SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || "$";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatCurrency, 
      getCurrencySymbol,
      isLoading 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
