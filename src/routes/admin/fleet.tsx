import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/fleet")({
  head: () => ({
    meta: [{ title: "Vehicles & Drivers — KHETSETU" }],
  }),
  component: FleetPage,
});

function FleetPage() {
  const { vehicles, drivers } = useDemo();

  const availableVehicles = vehicles.filter((v) => v.status === "Available").length;
  const availableDrivers = drivers.filter((d) => d.status === "Available").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Vehicles & Drivers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fleet management and resource allocation</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Vehicles</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{vehicles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{availableVehicles}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Drivers</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{drivers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{availableDrivers}</p>
        </Card>
      </div>

      <Tabs defaultValue="vehicles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
        </TabsList>

        {/* Vehicles tab */}
        <TabsContent value="vehicles">
          <Card className="p-4">
            <div className="grid gap-1 text-sm">
              <div className="grid grid-cols-6 gap-4 font-semibold text-foreground py-2 border-b">
                <div>Vehicle</div>
                <div>Registration</div>
                <div>Capacity</div>
                <div>Base</div>
                <div>Status</div>
                <div>Driver</div>
              </div>
              {vehicles.map((vehicle) => {
                const assignedDriver = drivers.find((d) => d.vehicleId === vehicle.id);
                return (
                  <div key={vehicle.id} className="grid grid-cols-6 gap-4 py-3 border-b last:border-b-0 items-center">
                    <div className="font-medium text-foreground">{vehicle.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{vehicle.registration}</div>
                    <div className="text-foreground">{vehicle.capacity} kg</div>
                    <div className="text-muted-foreground text-sm">{vehicle.base}</div>
                    <div>
                      <Badge variant={vehicle.status === "Available" ? "default" : "secondary"}>
                        {vehicle.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {assignedDriver ? assignedDriver.name : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* Drivers tab */}
        <TabsContent value="drivers">
          <Card className="p-4">
            <div className="grid gap-1 text-sm">
              <div className="grid grid-cols-6 gap-4 font-semibold text-foreground py-2 border-b">
                <div>Driver</div>
                <div>License</div>
                <div>Phone</div>
                <div>Base</div>
                <div>Vehicle</div>
                <div>Status</div>
              </div>
              {drivers.map((driver) => {
                const assignedVehicle = vehicles.find((v) => v.id === driver.vehicleId);
                return (
                  <div key={driver.id} className="grid grid-cols-6 gap-4 py-3 border-b last:border-b-0 items-center">
                    <div className="font-medium text-foreground">{driver.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{driver.license}</div>
                    <div className="text-foreground text-xs">{driver.phone}</div>
                    <div className="text-muted-foreground text-sm">{driver.base}</div>
                    <div className="text-sm text-muted-foreground">
                      {assignedVehicle ? assignedVehicle.name : "—"}
                    </div>
                    <div>
                      <Badge variant={driver.status === "Available" ? "default" : "secondary"}>
                        {driver.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
