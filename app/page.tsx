import type { Metadata } from "next";
import Landing from "./_components/Landing";

export const metadata: Metadata = {
  title: "Domus | Pedidos desde mesa directo a cocina",
  description: "Convierte tu QR en pedidos a cocina. Piloto gratis 15 días.",
  openGraph: {
    title: "Domus | Pedidos desde mesa directo a cocina",
    description: "Convierte tu QR en pedidos a cocina. Piloto gratis 15 días.",
  },
};

const demoHref = `/r/${
  process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ?? "domus"
}`;

export default function Home() {
  return <Landing demoHref={demoHref} />;
}
