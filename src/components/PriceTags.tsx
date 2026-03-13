import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

const toneList = [
  "ruby",
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
] as const;

type Tone = (typeof toneList)[number];

const spacingMap: Record<string, string> = {
  "0": "0",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
};

function resolveGap(value?: string | number) {
  if (value === undefined) return spacingMap["1"];
  if (typeof value === "number") return `${value}px`;
  return spacingMap[value] || value;
}

function softToneStyle(color: Tone) {
  return {
    backgroundColor: `var(--${color}-3)`,
    borderColor: `var(--${color}-6)`,
    color: `var(--${color}-11)`,
  };
}

function TagBadge({
  color,
  className,
  children,
}: {
  color: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
      style={softToneStyle(color)}
    >
      {children}
    </span>
  );
}

function CustomTags({ tags }: { tags?: string }) {
  if (!tags || tags.trim() === "") {
    return null;
  }

  const tagList = tags.split(";").filter((tag) => tag.trim() !== "");

  return (
    <>
      {tagList.map((tag, index) => {
        const colorMatch = tag.match(/<(\w+)>$/);
        const parsedColor = colorMatch?.[1]?.toLowerCase();
        const color = toneList.includes(parsedColor as Tone)
          ? (parsedColor as Tone)
          : toneList[index % toneList.length];
        const text = colorMatch ? tag.replace(/<\w+>$/, "") : tag;

        return (
          <TagBadge key={`${text}-${index}`} color={color} className="text-sm">
            <span className="text-xs">{text}</span>
          </TagBadge>
        );
      })}
    </>
  );
}

type PriceTagsProps = {
  expired_at?: string | number;
  price?: number;
  billing_cycle?: number;
  currency?: string;
  tags?: string;
  ip4?: unknown;
  ip6?: unknown;
  gap?: string | number;
} & ComponentProps<"div">;

const PriceTags = ({
  price = 0,
  billing_cycle = 30,
  currency = "￥",
  expired_at = Date.now() + 30 * 24 * 60 * 60 * 1000,
  tags = "",
  ip4 = "",
  ip6 = "",
  gap,
  className,
  style,
  ...props
}: PriceTagsProps) => {
  const [t] = useTranslation();
  const containerProps = {
    ...props,
    className: cn("flex flex-wrap", className),
    style: { ...style, gap: resolveGap(gap) },
  };

  const expiredDate = new Date(expired_at);
  const diffDays = Math.ceil(
    (expiredDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const expiredTone: Tone =
    diffDays <= 7 ? "red" : diffDays <= 15 ? "orange" : "green";

  if (price == 0) {
    return (
      <div {...containerProps}>
        <CustomTags tags={tags} />
      </div>
    );
  }

  return (
    <div {...containerProps}>
      {Boolean(ip4) && (
        <TagBadge color="green" className="text-sm">
          <span className="flex items-center justify-center gap-1 text-xs">
            <span className="size-1.5 rounded-full border-2 border-green-500" />
            V4
          </span>
        </TagBadge>
      )}

      {Boolean(ip6) && (
        <TagBadge color="green" className="text-sm">
          <span className="flex items-center justify-center gap-1 text-xs">
            <span className="size-1.5 rounded-full border-2 border-green-500" />
            V6
          </span>
        </TagBadge>
      )}

      <TagBadge color="iris" className="text-sm">
        <span className="text-xs">
          {price == -1 ? t("common.free") : `${currency}${price}`}/
          {(() => {
            if (billing_cycle >= 27 && billing_cycle <= 32) {
              return t("common.monthly");
            }
            if (billing_cycle >= 87 && billing_cycle <= 95) {
              return t("common.quarterly");
            }
            if (billing_cycle >= 175 && billing_cycle <= 185) {
              return t("common.semi_annual");
            }
            if (billing_cycle >= 360 && billing_cycle <= 370) {
              return t("common.annual");
            }
            if (billing_cycle >= 720 && billing_cycle <= 750) {
              return t("common.biennial");
            }
            if (billing_cycle >= 1080 && billing_cycle <= 1150) {
              return t("common.triennial");
            }
            if (billing_cycle >= 1800 && billing_cycle <= 1850) {
              return t("common.quinquennial");
            }
            if (billing_cycle == -1) {
              return t("common.once");
            }
            return `${billing_cycle} ${t("nodeCard.time_day")}`;
          })()}
        </span>
      </TagBadge>

      <TagBadge color={expiredTone} className="text-sm">
        <span className="text-xs">
          {(() => {
            if (diffDays <= 0) {
              return t("common.expired");
            }
            if (diffDays > 36500) {
              return t("common.long_term");
            }
            return t("common.expired_in", {
              days: diffDays,
            });
          })()}
        </span>
      </TagBadge>

      <CustomTags tags={tags} />
    </div>
  );
};

export default PriceTags;
