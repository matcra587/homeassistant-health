import type { Member } from "../../lib/types";

export type AvatarProps = {
  member: Pick<Member, "tone" | "initials" | "displayName">;
  size?: number;
};

export function Avatar({ member, size = 40 }: AvatarProps) {
  return (
    <span
      className="avatar"
      role="img"
      data-tone={member.tone}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={member.displayName}
    >
      {member.initials}
    </span>
  );
}
