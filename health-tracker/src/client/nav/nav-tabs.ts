import {
  IconHome,
  IconList,
  type IconProps,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export type TabId = "dashboard" | "entries" | "household" | "profile";

export type NavTab = {
  id: TabId;
  label: string;
  mobileLabel: string;
  icon: ComponentType<IconProps>;
};

export const NAV_TABS: readonly NavTab[] = [
  { id: "dashboard", label: "Dashboard", mobileLabel: "Today", icon: IconHome },
  { id: "entries", label: "Entries", mobileLabel: "Entries", icon: IconList },
  {
    id: "household",
    label: "Household",
    mobileLabel: "Household",
    icon: IconUsers,
  },
  { id: "profile", label: "Profile", mobileLabel: "Profile", icon: IconUser },
];
