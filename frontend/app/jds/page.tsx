import dynamic from "next/dynamic";

import { JDManagerLoading } from "@/components/jd-manager-loading";

const JDManager = dynamic(
  () => import("@/components/jd-manager").then((mod) => mod.JDManager),
  {
    loading: () => <JDManagerLoading />,
  },
);

export default function JDsPage() {
  return <JDManager />;
}
