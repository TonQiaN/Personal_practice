import dynamic from "next/dynamic";

import { WorkspaceLoading } from "@/components/workspace-loading";

const MatchWorkspace = dynamic(
  () => import("@/components/match-workspace").then((mod) => mod.MatchWorkspace),
  {
    loading: () => <WorkspaceLoading />,
  },
);

export default function MatchPage() {
  return <MatchWorkspace />;
}
