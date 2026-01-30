import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
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

interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  formatCurrency: (amount: number, fromCurrency?: CurrencyCode) => string;
  convertCurrency: (amount: number, fromCurrency: CurrencyCode, toCurrency?: CurrencyCode) => number;
  getCurrencySymbol: (currencyCode?: CurrencyCode) => string;
  isLoading: boolean;
  exchangeRates: ExchangeRates | null;
  ratesLastUpdated: Date | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [ratesLastUpdated, setRatesLastUpdated] = useState<Date | null>(null);

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

  // Fetch exchange rates on mount
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        // First try to get cached rates from database
        const { data: cachedRates } = await supabase
          .from("exchange_rates")
          .select("*")
          .eq("base_currency", "USD")
          .order("fetched_at", { ascending: false })
          .limit(1)
          .single();

        const now = Date.now();
        const RATE_EXPIRY_MS = 18 * 60 * 60 * 1000; // 18 hours

        if (cachedRates) {
          const fetchedAt = new Date(cachedRates.fetched_at).getTime();
          const age = now - fetchedAt;

          if (age < RATE_EXPIRY_MS) {
            // Use cached rates
            setExchangeRates(cachedRates.rates as unknown as ExchangeRates);
            setRatesLastUpdated(new Date(cachedRates.fetched_at));
            console.log("Using cached exchange rates");
            return;
          }
        }

        // Fetch fresh rates from edge function
        const { data, error } = await supabase.functions.invoke("exchange-rates");
        
        if (error) throw error;

        if (data?.success && data.rates) {
          setExchangeRates(data.rates);
          setRatesLastUpdated(new Date(data.fetched_at));
          console.log("Fetched fresh exchange rates");
        }
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
        // Set fallback rates (approximate values)
        setExchangeRates({
          USD: 1,
          EUR: 0.92,
          GBP: 0.79,
          AUD: 1.53,
          CAD: 1.36,
          CHF: 0.88,
          JPY: 149.5,
          CNY: 7.24,
          INR: 83.1,
          SGD: 1.34,
          AED: 3.67,
          ZAR: 18.5,
        });
      }
    };

    fetchExchangeRates();
  }, []);

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

  const getCurrencySymbol = useCallback((currencyCode?: CurrencyCode) => {
    const code = currencyCode || currency;
    return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || "$";
  }, [currency]);

  // Convert amount from one currency to another
  const convertCurrency = useCallback((
    amount: number, 
    fromCurrency: CurrencyCode, 
    toCurrency?: CurrencyCode
  ): number => {
    const targetCurrency = toCurrency || currency;
    
    if (fromCurrency === targetCurrency || !exchangeRates) {
      return amount;
    }

    // All rates are based on USD, so we need to:
    // 1. Convert from source currency to USD
    // 2. Convert from USD to target currency
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[targetCurrency] || 1;

    // Convert to USD first, then to target currency
    const amountInUSD = amount / fromRate;
    const convertedAmount = amountInUSD * toRate;

    return convertedAmount;
  }, [currency, exchangeRates]);

  // Format currency with optional conversion
  const formatCurrency = useCallback((amount: number, fromCurrency?: CurrencyCode) => {
    let displayAmount = amount;
    
    // If a source currency is provided and it differs from user preference, convert
    if (fromCurrency && fromCurrency !== currency) {
      displayAmount = convertCurrency(amount, fromCurrency, currency);
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(displayAmount);
  }, [currency, convertCurrency]);

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatCurrency, 
      convertCurrency,
      getCurrencySymbol,
      isLoading,
      exchangeRates,
      ratesLastUpdated,
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
