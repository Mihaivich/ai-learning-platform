import { NavBar } from "@/components/NavBar";
import { PublicSurface } from "@/components/home/PublicSurface";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <main>
        <PublicSurface>{children}</PublicSurface>
      </main>
    </>
  );
}
