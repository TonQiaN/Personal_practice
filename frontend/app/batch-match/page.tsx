import dynamic from "next/dynamic";

import { WorkspaceLoading } from "@/components/workspace-loading";

const BatchMatchWorkspace = dynamic(
  () => import("@/components/batch-match-workspace").then((mod) => mod.BatchMatchWorkspace),
  {
    loading: () => <WorkspaceLoading />,
  },
);

export default function BatchMatchPage() {
  return <BatchMatchWorkspace />;
}
