import { Box, Button, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useMemo } from "react";
import type { Member } from "../../lib/types";

export type MilestoneKind = "goal" | "halfway" | "streak";

export type MilestoneModalProps = {
  kind: MilestoneKind;
  member: Member;
  onSetNewGoal: () => void;
  onMaintain: () => void;
  onClose: () => void;
};

export function MilestoneModal({
  kind,
  onSetNewGoal,
  onMaintain,
  onClose,
}: MilestoneModalProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: `piece-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 600,
        hue: [
          "var(--mantine-color-github-blue-5)",
          "var(--mantine-color-github-green-5)",
          "var(--mantine-color-github-red-5)",
          "var(--mantine-color-github-gray-6)",
        ][i % 4],
        size: 6 + Math.random() * 6,
        rot: Math.random() * 360,
      })),
    [],
  );

  const title =
    kind === "goal"
      ? "You reached your goal."
      : kind === "halfway"
        ? "Halfway there."
        : "30 days running.";
  const body =
    kind === "goal"
      ? "Quietly remarkable. What's next is up to you — set a new target, or shift to maintenance."
      : kind === "halfway"
        ? "Half the distance, behind you. Keep your rhythm."
        : "A month of small daily steps. You're building something.";

  return (
    <Modal opened onClose={onClose} centered withCloseButton={false} size="md">
      <Box pos="relative" style={{ overflow: "hidden", borderRadius: 8 }}>
        <Box
          aria-hidden
          pos="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          style={{ overflow: "hidden", pointerEvents: "none" }}
        >
          {pieces.map((p) => (
            <Box
              key={p.id}
              pos="absolute"
              top={-20}
              w={p.size}
              h={p.size * 1.6}
              style={{
                left: `${p.left}%`,
                background: p.hue,
                borderRadius: 1,
                transform: `rotate(${p.rot}deg)`,
                animation: `confetti 1800ms cubic-bezier(.3,.7,.4,1) ${p.delay}ms both`,
              }}
            />
          ))}
        </Box>

        <Stack pos="relative" align="center" gap="md" py="md" px="xs">
          <IconSparkles size={32} color="var(--mantine-primary-color-filled)" />
          <Title order={2} ta="center" fz={32} fw={500} lh={1.1}>
            {title}
          </Title>
          <Text c="dimmed" ta="center" maw={360}>
            {body}
          </Text>
          {kind === "goal" ? (
            <Group justify="center" gap="sm" mt="sm">
              <Button onClick={onSetNewGoal}>Set a new goal</Button>
              <Button variant="default" onClick={onMaintain}>
                Switch to maintenance
              </Button>
            </Group>
          ) : (
            <Button mt="sm" onClick={onClose}>
              Carry on
            </Button>
          )}
        </Stack>
      </Box>
    </Modal>
  );
}
