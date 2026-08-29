import type { ReactNode } from "react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/States";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatQty } from "@/services";
import type { Order } from "@/types";

export function OrderTable({
  orders,
  renderActions,
  emptyTitle = "No orders here yet",
  emptyDescription = "Orders will appear as buyers place them in the demo marketplace.",
  showBuyer = true,
}: {
  orders: Order[];
  renderActions?: (order: Order) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  showBuyer?: boolean;
}) {
  if (orders.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            {showBuyer ? <TableHead>Buyer</TableHead> : null}
            <TableHead>Product</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            {renderActions ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium whitespace-nowrap">{order.id}</TableCell>
              {showBuyer ? <TableCell className="whitespace-nowrap">{order.buyer}</TableCell> : null}
              <TableCell>{order.product}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatQty(order.quantity, order.unit)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatINR(order.quantity * order.pricePerUnit)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {order.pickup} → {order.delivery}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {order.orderDate}
              </TableCell>
              <TableCell>
                <StatusBadge status={order.status} />
              </TableCell>
              {renderActions ? (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">{renderActions(order)}</div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
