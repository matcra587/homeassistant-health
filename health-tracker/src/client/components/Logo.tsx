import iconUrl from "../../../icon.png";

export type LogoProps = {
  size?: number;
  width?: number;
};

export function Logo({ size = 22, width }: LogoProps) {
  const resolvedWidth = width ?? size;
  return (
    <span
      aria-label="Home Assistant Health"
      role="img"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: resolvedWidth,
        height: size,
      }}
    >
      <img
        src={iconUrl}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
