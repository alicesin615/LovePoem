import React from "react";
import { MainNavbar } from "./navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <MainNavbar />
      <main>{children}</main>
    </>
  );
}
