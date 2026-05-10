import {
  AppShell,
  Box,
  Center,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { type ReactElement, useEffect, useState } from "react";
import type { Entry, Household, Member, Theme, Units } from "../lib/types";
import { db } from "./api";
import { Avatar } from "./components/Avatar";
import { Logo } from "./components/Logo";
import { AddMemberModal } from "./modals/AddMemberModal";
import { LogWeightModal } from "./modals/LogWeightModal";
import { type MilestoneKind, MilestoneModal } from "./modals/MilestoneModal";
import { MobileTabButton } from "./nav/MobileTabButton";
import { NavLink } from "./nav/NavLink";
import { NAV_TABS, type TabId } from "./nav/nav-tabs";
import { Dashboard } from "./screens/Dashboard";
import { EntriesScreen } from "./screens/EntriesScreen";
import { FirstRun } from "./screens/FirstRun";
import { HouseholdScreen } from "./screens/HouseholdScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { getToday, useStore } from "./store";
import "./styles.css";

type LogModalState = {
  existing: Entry | { date: string } | null;
  backfill?: boolean;
};

export function App() {
  const state = useStore();
  const { setColorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery("(max-width: 767px)") ?? false;
  const [tab, setTab] = useState<TabId>("dashboard");
  const [units, setUnits] = useState<Units>("metric");
  const [logModal, setLogModal] = useState<LogModalState | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [milestone, setMilestone] = useState<{ kind: MilestoneKind } | null>(
    null,
  );
  const [theme, setTheme] = useState<Theme>("system");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    db.bootstrap()
      .catch((error) => {
        if (active) setBootstrapError(error);
      })
      .finally(() => {
        if (active) setBootstrapped(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setColorScheme(theme === "system" ? "auto" : theme);
  }, [theme, setColorScheme]);

  const me = state.members.find((m) => m.isMe);
  const memberUnits = me?.units;
  const memberTheme = me?.theme;

  useEffect(() => {
    if (memberUnits) setUnits(memberUnits);
  }, [memberUnits]);

  useEffect(() => {
    if (memberTheme) setTheme(memberTheme);
  }, [memberTheme]);

  if (!bootstrapped) {
    return (
      <Center mih="100vh">
        <Logo size={40} />
      </Center>
    );
  }

  if (bootstrapError) {
    return (
      <Center mih="100vh" p="md">
        <Paper withBorder radius="lg" maw={420} p="xl" ta="center">
          <Logo size={40} />
          <Title order={1} fz={22} fw={500} mt="md">
            Home Assistant sign-in required
          </Title>
          <Text c="dimmed" fz="sm" mt="xs">
            Open this add-on through Home Assistant ingress to load your health
            profile.
          </Text>
        </Paper>
      </Center>
    );
  }

  if (!me) {
    return (
      <Center mih="100vh" p="md">
        <Paper withBorder radius="lg" maw={420} p="xl" ta="center">
          <Logo size={40} />
          <Title order={1} fz={22} fw={500} mt="md">
            Profile unavailable
          </Title>
          <Text c="dimmed" fz="sm" mt="xs">
            Home Assistant Health could not load your profile.
          </Text>
        </Paper>
      </Center>
    );
  }

  if (!me.profileComplete) {
    return (
      <FirstRun
        profile={me}
        onDone={async (profile) => {
          await db.updateMember(me.id, profile, { throwOnError: true });
          if (profile.units) setUnits(profile.units);
        }}
      />
    );
  }

  return (
    <AuthedApp
      me={me}
      members={state.members}
      entries={state.entries}
      household={state.household}
      tab={tab}
      setTab={setTab}
      units={units}
      setUnits={setUnits}
      theme={theme}
      setTheme={setTheme}
      isMobile={isMobile}
      logModal={logModal}
      setLogModal={setLogModal}
      addMemberOpen={addMemberOpen}
      setAddMemberOpen={setAddMemberOpen}
      milestone={milestone}
      setMilestone={setMilestone}
    />
  );
}

type AuthedAppProps = {
  me: Member;
  members: Member[];
  entries: Entry[];
  household: Household | null;
  tab: TabId;
  setTab: (tab: TabId) => void;
  units: Units;
  setUnits: (units: Units) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isMobile: boolean;
  logModal: LogModalState | null;
  setLogModal: (state: LogModalState | null) => void;
  addMemberOpen: boolean;
  setAddMemberOpen: (open: boolean) => void;
  milestone: { kind: MilestoneKind } | null;
  setMilestone: (state: { kind: MilestoneKind } | null) => void;
};

function AuthedApp({
  me,
  members,
  entries,
  household,
  tab,
  setTab,
  units,
  setUnits,
  theme,
  setTheme,
  isMobile,
  logModal,
  setLogModal,
  addMemberOpen,
  setAddMemberOpen,
  milestone,
  setMilestone,
}: AuthedAppProps) {
  function openEdit(entry: Entry): void {
    setLogModal({ existing: entry });
  }
  function openBackfill(dateISO?: string): void {
    setLogModal({
      existing: dateISO ? { date: dateISO } : null,
      backfill: true,
    });
  }
  function openToday(): void {
    const myEntries = entries.filter((e) => e.memberId === me.id);
    const todayKey = getToday().toISOString().slice(0, 10);
    const existing = myEntries.find((e) => e.date.slice(0, 10) === todayKey);
    setLogModal({ existing: existing ?? null });
  }

  function handleSaveEntry(entry: Entry): void {
    db.upsertEntry(entry);
    if (
      me.startWeightKg != null &&
      me.goalWeightKg != null &&
      me.milestoneAlerts
    ) {
      const losing = me.startWeightKg > me.goalWeightKg;
      const reachedGoal = losing
        ? entry.weightKg <= me.goalWeightKg
        : entry.weightKg >= me.goalWeightKg;
      if (reachedGoal) setMilestone({ kind: "goal" });
    }
    setLogModal(null);
  }

  let screen: ReactElement | null;
  switch (tab) {
    case "dashboard":
      screen = (
        <Dashboard
          me={me}
          entries={entries}
          units={units}
          onLogToday={openToday}
          onEditEntry={openEdit}
        />
      );
      break;
    case "entries":
      screen = (
        <EntriesScreen
          me={me}
          entries={entries}
          units={units}
          onEdit={openEdit}
          onBackfill={openBackfill}
        />
      );
      break;
    case "household":
      screen = (
        <HouseholdScreen
          me={me}
          members={members}
          entries={entries}
          units={units}
          onTogglePrivacy={() =>
            db.updateMember(me.id, { shareDetails: !me.shareDetails })
          }
          onAddMember={() => setAddMemberOpen(true)}
        />
      );
      break;
    case "profile":
      screen = (
        <ProfileScreen
          me={me}
          units={units}
          theme={theme}
          onUpdate={(patch) => db.updateMember(me.id, patch)}
          onUnits={setUnits}
          onTheme={setTheme}
        />
      );
      break;
    default:
      screen = null;
  }

  const householdName = household?.name ?? "Household";

  return (
    <>
      <AppShell
        navbar={{ width: 240, breakpoint: "md", collapsed: { mobile: true } }}
        header={{ height: 60, collapsed: !isMobile }}
        footer={{ height: 80, collapsed: !isMobile }}
        padding={{ base: "md", md: "xl" }}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Logo size={36} />
            <Avatar member={me} size={32} />
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <AppShell.Section mb="lg">
            <Center>
              <Logo size={72} />
            </Center>
          </AppShell.Section>
          <AppShell.Section grow>
            <Stack gap={4}>
              {NAV_TABS.map((t) => (
                <NavLink
                  key={t.id}
                  active={tab === t.id}
                  label={t.label}
                  icon={t.icon}
                  onClick={() => setTab(t.id)}
                />
              ))}
            </Stack>
          </AppShell.Section>
          <AppShell.Section>
            <Divider mb="sm" />
            <Group gap="sm" wrap="nowrap">
              <Avatar member={me} size={36} />
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text fz="sm" fw={500} truncate>
                  {me.displayName}
                </Text>
                <Text fz="xs" c="dimmed" truncate>
                  {householdName}
                </Text>
              </Box>
            </Group>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main>
          <Box maw={1180} mx="auto">
            {screen}
          </Box>
        </AppShell.Main>

        <AppShell.Footer>
          <Group h="100%" gap={0} grow wrap="nowrap" px="xs">
            {NAV_TABS.map((t) => (
              <MobileTabButton
                key={t.id}
                active={tab === t.id}
                label={t.mobileLabel}
                icon={t.icon}
                onClick={() => setTab(t.id)}
              />
            ))}
          </Group>
        </AppShell.Footer>
      </AppShell>

      {logModal && (
        <LogWeightModal
          me={me}
          units={units}
          existingEntry={logModal.existing}
          onSave={handleSaveEntry}
          onClose={() => setLogModal(null)}
        />
      )}

      {milestone && (
        <MilestoneModal
          kind={milestone.kind}
          member={me}
          onSetNewGoal={() => {
            setMilestone(null);
            setTab("profile");
          }}
          onMaintain={() => {
            db.updateMember(me.id, { goalWeightKg: me.goalWeightKg });
            setMilestone(null);
          }}
          onClose={() => setMilestone(null)}
        />
      )}

      {addMemberOpen && (
        <AddMemberModal
          onAdd={async (profile) => {
            await db.addMember(profile);
            setAddMemberOpen(false);
          }}
          onClose={() => setAddMemberOpen(false)}
        />
      )}
    </>
  );
}
