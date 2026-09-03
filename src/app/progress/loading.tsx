import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return <PageSkeleton hero="none" tiles={4} charts={2} />;
}
