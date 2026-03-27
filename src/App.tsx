import { PageShell } from "@/components/layout/PageShell";
import { getRouteElement } from "@/pages/healthRoutes";
import { useHashPath } from "@/lib/hashRouter";

function App() {
  const path = useHashPath();

  return (
    <PageShell>
      {getRouteElement(path)}
    </PageShell>
  );
}

export default App;
