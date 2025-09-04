import { AppShell, Navbar, Header, Button, Group, ScrollArea } from "@mantine/core";
import React from "react";
import { ReactFlowProvider } from "react-flow-renderer";
import { useConductorSocket } from "./hooks/useConductorSocket";

function Canvas() {
  return <div style={{ flex: 1, background: "#20232a" }}>Canvas placeholder</div>;
}

export default function App() {
  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 300 }} p="xs">
          <Navbar.Section grow component={ScrollArea} mx="-xs" px="xs">
            Progress sidebar
          </Navbar.Section>
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          <Group position="apart" sx={{ height: "100%" }}>
            <div>Meander Conductor</div>
            <Button variant="light">Load Show</Button>
          </Group>
        </Header>
      }
      styles={(theme) => ({ main: { backgroundColor: theme.colors.dark[7] } })}
    >
      <ReactFlowProvider>
        {useConductorSocket()}
        <Canvas />
      </ReactFlowProvider>
    </AppShell>
  );
}
