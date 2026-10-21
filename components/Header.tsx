import Logo from "@/components/Logo";
import SidebarButton from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";

/** Шапка с меню и логотипом; справа — что передали и переключатель темы. */
export default function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--line)]">
      <div className="flex h-14 items-center gap-4 px-4">
        <SidebarButton />
        <Logo />
        <div className="ml-auto flex items-center gap-4">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
