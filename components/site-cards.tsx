"use client";

import { HoverEffect } from "@/components/ui/card-hover-effect";

interface SiteCardsProps {
  items: {
    title: string;
    description: string;
    link: string;
    icon: string;
  }[];
}

export default function SiteCards({ items }: SiteCardsProps) {
  return <HoverEffect items={items} />;
}