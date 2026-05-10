import { UnstyledButton } from "@mantine/core";
import type { IconProps } from "@tabler/icons-react";
import type { ComponentType } from "react";

export type NavLinkProps = {
  active: boolean;
  label: string;
  icon: ComponentType<IconProps>;
  onClick: () => void;
};

export function NavLink({ active, label, icon: Icon, onClick }: NavLinkProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        height: 48,
        borderRadius: 8,
        background: active
          ? "var(--mantine-color-default-hover)"
          : "transparent",
        color: active
          ? "var(--mantine-color-text)"
          : "var(--mantine-color-dimmed)",
        fontSize: 14,
        fontWeight: 500,
        width: "100%",
        cursor: "pointer",
      }}
    >
      <Icon size={18} />
      {label}
    </UnstyledButton>
  );
}
