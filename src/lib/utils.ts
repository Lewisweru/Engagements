import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KSH",
  }).format(price);
}

export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/** Fetch OAuth Token (Optional: For debugging or testing) */
export async function fetchPesapalToken(): Promise<string> {
  try {
    const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/pesapal/token`);
    return response.data.token;
  } catch (error) {
    console.error("Error fetching Pesapal token:", error);
    throw error;
  }
}

/** Initiate Pesapal Payment */
export async function initiatePesapalPayment(
  orderId: string,
  amount: number,
  description: string,
  email: string,
  firstName: string,
  lastName: string,
  callbackUrl: string
): Promise<string> {
  try {
    const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/pesapal/order`, {
      orderId,
      amount,
      currency: "KES",
      description,
      callbackUrl,
      customer: {
        email,
        firstName,
        lastName,
      },
    });

    if (response.data.redirect_url) {
      return response.data.redirect_url; // Pesapal payment URL
    } else {
      throw new Error("Failed to initiate payment.");
    }
  } catch (error) {
    console.error("Pesapal Payment Error:", error);
    throw error;
  }
}

/** Query Pesapal Payment Status */
export async function queryPesapalPaymentStatus(orderTrackingId: string): Promise<any> {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_URL}/api/pesapal/status/${orderTrackingId}`
    );

    return response.data; // Payment status response
  } catch (error) {
    console.error("Pesapal Payment Status Error:", error);
    throw error;
  }
}