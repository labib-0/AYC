import { orderService, OrderRecord, OrderItemRecord, OrderStatusEvent, CreateOrderInput } from "@/services/order.service";

export type { OrderRecord, OrderItemRecord, OrderStatusEvent, CreateOrderInput };

export async function getUserOrders(userId: string | number): Promise<OrderRecord[]> {
  return orderService.getUserOrders(userId);
}

export async function getOrderById(
  orderId: string,
  userId?: string | number,
  userEmail?: string
): Promise<OrderRecord | null> {
  const order = await orderService.getOrderById(orderId);
  if (order && (userId !== undefined || userEmail !== undefined)) {
    const isOwner =
      (userId !== undefined && String(order.user_id) === String(userId)) ||
      (userEmail !== undefined && order.email && order.email.toLowerCase() === userEmail.toLowerCase());
    if (!isOwner) {
      return null;
    }
  }
  return order;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  return orderService.createOrder(input);
}

export async function cancelOrder(orderId: string, userId: string | number, reason?: string): Promise<boolean> {
  return orderService.cancelOrder(orderId, userId, reason);
}

export async function getOrderCommercialDocument(orderId: string, docType: string): Promise<any> {
  return orderService.getOrderCommercialDocument(orderId, docType);
}

export async function getOrderTracking(orderId: string): Promise<any> {
  return orderService.getOrderTracking(orderId);
}

