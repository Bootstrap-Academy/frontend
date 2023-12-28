import { useState } from '#app';
import { useUser } from './user';
export const useCoins = () => useState('coins', () => 0);
export const usePaypalClientID = () => useState('paypalClientID', () => '');

export async function getBalance() {
  const user = <any>useUser();

  try {
    if (!!!user.value || !!!user.value.id) {
      throw { data: 'Missing user id' };
    }

    const response = await GET(`/shop/coins/${user.value.id}`);

    const coins = useCoins();
    coins.value = response?.coins ?? 0;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getPaypalClientID() {
  try {
    const response = await GET(`/shop/coins/paypal`);

    const paypalClientID = usePaypalClientID();
    paypalClientID.value = response ?? '';

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function createPaypalOrder(body: any) {
  try {
    const response = await POST(`/shop/coins/paypal/orders`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function onApproveCapturePaypalOrder(orderID: string) {
  try {
    if (!!!orderID) {
      throw { data: 'Missing order id' };
    }

    const response = await POST(`/shop/coins/paypal/orders/${orderID}/capture`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
