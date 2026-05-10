import { Box, Text, UnstyledButton } from "@mantine/core";
import type { IconProps } from "@tabler/icons-react";
import type { ComponentType } from "react";

export type MobileTabButtonProps = {
  active: boolean;
  label: string;
  icon: ComponentType<IconProps>;
  onClick: () => void;
};

export function MobileTabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: MobileTabButtonProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        color: active
          ? "var(--mantine-color-text)"
          : "var(--mantine-color-dimmed)",
        cursor: "pointer",
        padding: "8px 0",
      }}
    >
      <Box
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 28,
          borderRadius: 9999,
          background: active
            ? "var(--mantine-color-default-hover)"
            : "transparent",
          transition: "background 160ms ease",
        }}
      >
        <Icon size={18} />
      </Box>
      <Text fz={11} fw={500}>
        {label}
      </Text>
    </UnstyledButton>
  );
}
